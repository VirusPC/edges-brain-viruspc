// Grok Bot transcript JSONL (staging from search-index.db / ReadTranscript, or daily-scan) → turns.
// Ported 1:1 from the previous export_to_langfuse.py parsing (same locked rules).
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

export const SESSION_GAP_MS = 3 * 60 * 60 * 1000;
const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;

const TS_TAG_RE = /<timestamp>([\s\S]*?)<\/timestamp>/i;
const TS_TAG_RE_G = /<timestamp>[\s\S]*?<\/timestamp>/gi;
const USER_QUERY_RE = /<user_query>\s*([\s\S]*?)\s*<\/user_query>/i;
const HIDDEN_LINE_RE = /^\[(?:SAND_HIDDEN_PROMPT|GROK_BOT_HIDDEN_PROMPT)[^\]]*\][^\n]*\n?/gm;
const MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };

const stableHex = (s, n) => createHash("sha256").update(s).digest("hex").slice(0, n);

/** Floor epoch ms to the minute — never invent sub-minute precision. */
export const floorMinute = (ms) => Math.floor(ms / 60000) * 60000;
export const minuteIso = (ms) => new Date(floorMinute(ms)).toISOString();

/** '<timestamp>Thursday, Oct 22, 2026, 10:07 AM (UTC+8)</timestamp>' → epoch ms (Asia/Shanghai). */
export function parseTsTag(raw) {
  const m = TS_TAG_RE.exec(raw ?? "");
  if (!m) return undefined;
  let s = m[1].trim();
  const parts = s.split(", ");
  if (/^(Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day$/.test(parts[0])) s = parts.slice(1).join(", ");
  const m2 = /^([A-Za-z]{3}) (\d{1,2}), (\d{4}), (\d{1,2}):(\d{2})\s*(AM|PM)\s*\(([^)]+)\)\s*$/.exec(s);
  if (!m2) return undefined;
  const [, mon, day, year, hour, minute, ampm] = m2;
  if (!(mon in MONTHS)) return undefined;
  let h = Number(hour) % 12;
  if (ampm.toUpperCase() === "PM") h += 12;
  // Grok Bot box timestamps are always UTC+8.
  return Date.UTC(Number(year), MONTHS[mon], Number(day), h, Number(minute)) - SHANGHAI_OFFSET_MS;
}

/** `_ts` like "2026-10-22T10:07:00" = Asia/Shanghai wall time; "…Z" = UTC. */
export function parseUnderscoreTs(value) {
  if (!value || typeof value !== "string") return undefined;
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/.test(value);
  const ms = Date.parse(hasZone ? value : `${value}+08:00`);
  return Number.isFinite(ms) ? ms : undefined;
}

function textParts(message) {
  const content = message?.content;
  if (typeof content === "string") return [{ type: "text", text: content }];
  return Array.isArray(content) ? content.filter((p) => p && typeof p === "object") : [];
}

export function visibleUserText(raw) {
  const m = USER_QUERY_RE.exec(raw ?? "");
  let body = m ? m[1] : (raw ?? "");
  body = body.replace(TS_TAG_RE_G, "").replace(HIDDEN_LINE_RE, "");
  return body.trim();
}

const visibleAssistantText = (parts) =>
  parts
    .filter((p) => p.type === "text" && p.text)
    .map((p) => String(p.text))
    .join("\n")
    .trim(); // thinking / reasoning intentionally skipped

/** Tool NAMES only — never args or results. */
const toolNames = (parts) =>
  parts.filter((p) => (p.type === "tool_use" || p.type === "tool_result") && p.name).map((p) => String(p.name));

export function loadJsonl(file) {
  const rows = [];
  for (const line of fs.readFileSync(file, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      rows.push(JSON.parse(t));
    } catch {
      /* skip */
    }
  }
  return rows;
}

/** Each user row with a usable minute timestamp starts a turn. */
export function rowsToTurns(botId, displayName, rows) {
  const turns = [];
  let i = 0;
  while (i < rows.length) {
    const row = rows[i];
    if (row.role !== "user") {
      i++;
      continue;
    }
    const raw = textParts(row.message)
      .filter((p) => p.type === "text")
      .map((p) => p.text ?? "")
      .join("\n");
    const ts = parseTsTag(raw) ?? parseUnderscoreTs(row._ts);
    i++;
    if (ts === undefined) continue; // cannot invent a timestamp
    const asst = [];
    const tools = [];
    while (i < rows.length && rows[i].role !== "user") {
      const r = rows[i];
      const parts = textParts(r.message);
      if (r.role === "assistant") {
        const t = visibleAssistantText(parts);
        if (t) asst.push(t);
        tools.push(...toolNames(parts));
      } else if (r.role === "tool") {
        tools.push(...toolNames(parts));
      }
      i++;
    }
    turns.push({
      botId,
      displayName,
      turnPos: 0,
      userTs: floorMinute(ts),
      userText: visibleUserText(raw),
      assistantText: asst.join("\n").trim(),
      toolNames: [...new Set(tools)],
    });
  }
  return turns;
}

export function loadAgents(agentsDir) {
  if (!fs.existsSync(agentsDir)) return [];
  return fs
    .readdirSync(agentsDir)
    .sort()
    .flatMap((id) => {
      try {
        const p = JSON.parse(fs.readFileSync(path.join(agentsDir, id, "profile.json"), "utf-8"));
        return [{ botId: id, displayName: String(p.name || id) }];
      } catch {
        return [];
      }
    });
}

function listJsonl(dir, depth) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isFile() && ent.name.endsWith(".jsonl")) out.push(p);
    else if (ent.isDirectory() && depth > 0) out.push(...listJsonl(p, depth - 1));
  }
  return out.sort();
}

/**
 * Collect turns per bot from staging (<botId|name>.jsonl, YYYY-MM-DD/<name>.jsonl)
 * or daily-scan (YYYY-MM-DD/<name>[-N].jsonl). turnPos is renumbered on the full
 * chronological timeline so hashed trace ids stay stable across runs.
 */
export function collectTurns(dir, agents) {
  const byId = new Map(agents.map((a) => [a.botId, a]));
  const byName = new Map(agents.map((a) => [a.displayName, a]));
  const out = new Map();
  for (const file of listJsonl(dir, 1)) {
    const stem = path.basename(file, ".jsonl");
    const agent = byId.get(stem) ?? byName.get(stem) ?? byName.get(stem.replace(/-\d+$/, ""));
    if (!agent) continue;
    const list = out.get(agent.botId) ?? [];
    list.push(...rowsToTurns(agent.botId, agent.displayName, loadJsonl(file)));
    out.set(agent.botId, list);
  }
  for (const [botId, turns] of out) {
    turns.sort((a, b) => a.userTs - b.userTs);
    const seen = new Set();
    const deduped = turns.filter((t) => {
      const key = `${t.userTs}|${t.userText.slice(0, 500)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    deduped.forEach((t, i) => (t.turnPos = i));
    out.set(botId, deduped);
  }
  return out;
}

const firstMsgStableId = (t) =>
  stableHex(`grokbot-first:${t.botId}:${t.turnPos}:${minuteIso(t.userTs)}:${t.userText.slice(0, 200)}`, 16);

/** turnPos → sessionId. Gap > 3h from previous user message ⇒ new session. */
export function assignSessions(turns) {
  const sessions = new Map();
  let firstId;
  let prev;
  for (const t of turns) {
    if (prev === undefined || t.userTs - prev > SESSION_GAP_MS) firstId = firstMsgStableId(t);
    sessions.set(t.turnPos, `grokbot:${t.botId}:${firstId}`);
    prev = t.userTs;
  }
  return sessions;
}
