#!/usr/bin/env node
// Grok Bot → Langfuse hourly export.
// Write path = vendored langfuse/cursor-observability-plugin `emitTurn` (unmodified).
// Run: node --import tsx adapter/export-cli.mjs [options]   (or: npm run export -- [options])
import * as fs from "node:fs";
import * as path from "node:path";
import { parseArgs } from "node:util";
import { setGlobalErrorHandler } from "@opentelemetry/core";

import { emitTurn, traceIdForTurn } from "../vendor/cursor-observability-plugin/src/trace.ts";
import { setupInstrumentation } from "./instrumentation-with-rename.mjs";
import { assignSessions, collectTurns, loadAgents, minuteIso } from "./read-grokbot-transcripts.mjs";
import { pluginConfig, pluginTurn } from "./to-plugin-turn.mjs";

const DEFAULTS = {
  host: "https://langfuse.viruspc.tech",
  agentsDir: "/home/box/agent-data/agents",
  cursorFile: "/home/box/agent-data/langfuse/grokbot-export-cursors.json",
  dailyScan: "/workspace/daily-scan",
  staging: "/workspace/langfuse-export-staging",
};
const log = (m) => process.stderr.write(`${m}\n`);

const { values: a } = parseArgs({
  options: {
    source: { type: "string", default: "staging" },
    "staging-dir": { type: "string", default: DEFAULTS.staging },
    "daily-scan": { type: "string", default: DEFAULTS.dailyScan },
    "agents-dir": { type: "string", default: DEFAULTS.agentsDir },
    "cursor-file": { type: "string", default: DEFAULTS.cursorFile },
    host: { type: "string" },
    "backfill-hours": { type: "string", default: "24" },
    "batch-size": { type: "string", default: "20" },
    "max-turns": { type: "string", default: "0" },
    bot: { type: "string", multiple: true, default: [] },
    "dry-run": { type: "boolean", default: false },
    "force-reexport": { type: "boolean", default: false },
    "dump-spans": { type: "boolean", default: false },
  },
});

const source = a.source;
if (!["staging", "daily-scan"].includes(source)) throw new Error("--source staging|daily-scan");
const dryRun = a["dry-run"];
const base = {
  publicKey: process.env.LANGFUSE_PUBLIC_KEY ?? "",
  secretKey: process.env.LANGFUSE_SECRET_KEY ?? "",
  baseUrl: (a.host ?? process.env.LANGFUSE_HOST ?? process.env.LANGFUSE_BASE_URL ?? DEFAULTS.host).replace(/\/+$/, ""),
  // Prefer LANGFUSE_TRACING_ENVIRONMENT; never silently fall through to Langfuse "default".
  environment: (process.env.LANGFUSE_TRACING_ENVIRONMENT || "").trim() || "grok-bot",
  source,
};
if (!dryRun && (!base.publicKey || !base.secretKey)) {
  log("ERROR: LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY required (or --dry-run)");
  process.exit(2);
}

let agents = loadAgents(a["agents-dir"]);
if (a.bot.length) agents = agents.filter((x) => a.bot.includes(x.botId) || a.bot.includes(x.displayName));
if (!agents.length) {
  log("ERROR: no agents (check --agents-dir / --bot)");
  process.exit(2);
}

const cursorFile = a["cursor-file"];
let cursor = { bots: {}, initialized_at: null };
try {
  cursor = JSON.parse(fs.readFileSync(cursorFile, "utf-8"));
  cursor.bots ??= {};
} catch {
  /* first run */
}

const now = new Date();
const backfillSince = now.getTime() - Number(a["backfill-hours"]) * 3600_000;
const byBot = collectTurns(source === "daily-scan" ? a["daily-scan"] : a["staging-dir"], agents);

const exportErrors = [];
setGlobalErrorHandler((err) => exportErrors.push(err instanceof Error ? err.message : String(err)));
const inst = setupInstrumentation({ public_key: base.publicKey, secret_key: base.secretKey, base_url: base.baseUrl, environment: base.environment }, { dryRun });

const summary = { bots_seen: 0, turns_candidates: 0, turns_written: 0, turns_skipped_cursor: 0, failures: [], dry_run: dryRun, host: base.baseUrl, environment: base.environment, source };
const maxTurns = Number(a["max-turns"]);
const batchSize = Math.max(1, Number(a["batch-size"]));
let writtenThisRun = 0;

for (const agent of agents) {
  const full = byBot.get(agent.botId) ?? [];
  if (!full.length) continue;
  summary.bots_seen++;
  const state = cursor.bots[agent.botId] ?? {};
  const firstExport = state.next_turn_pos === undefined || a["force-reexport"];
  const nextPos = a["force-reexport"] ? 0 : Number(state.next_turn_pos ?? 0);
  const sessions = assignSessions(full);
  let pending = full.filter((t) => t.turnPos >= nextPos && (!firstExport || t.userTs >= backfillSince));
  summary.turns_skipped_cursor += full.filter((t) => t.turnPos < nextPos).length;
  if (maxTurns && writtenThisRun + pending.length > maxTurns) pending = pending.slice(0, Math.max(0, maxTurns - writtenThisRun));
  summary.turns_candidates += pending.length;
  if (!pending.length) continue;
  log(`${agent.displayName} (${agent.botId.slice(0, 8)}…): ${full.length} turns, ${pending.length} to export from pos ${nextPos}${firstExport ? " (first-export 24h window)" : ""}`);

  let advancedTo = nextPos;
  for (let i = 0; i < pending.length; i += batchSize) {
    const batch = pending.slice(i, i + batchSize);
    const errBefore = exportErrors.length;
    const spanBefore = inst.collected?.length ?? 0;
    try {
      for (const t of batch) {
        const config = pluginConfig(base, t);
        await emitTurn(pluginTurn(t, sessions.get(t.turnPos)), { config, ids: inst.ids });
      }
      await inst.flush();
    } catch (err) {
      exportErrors.push(err instanceof Error ? err.message : String(err));
    }
    if (exportErrors.length > errBefore) {
      summary.failures.push({ bot_id: agent.botId, bot: agent.displayName, from_turn_pos: batch[0].turnPos, error: exportErrors.slice(errBefore).join("; ").slice(0, 500) });
      log(`  FAIL batch at pos ${batch[0].turnPos}: ${exportErrors[errBefore]}`);
      break; // leave the rest for next hour
    }
    advancedTo = batch.at(-1).turnPos + 1;
    summary.turns_written += batch.length;
    writtenThisRun += batch.length;
    if (dryRun) {
      const spans = inst.collected.slice(spanBefore);
      for (const t of batch) {
        const traceId = traceIdForTurn(pluginConfig(base, t), sessions.get(t.turnPos), t.turnPos);
        const mine = spans.filter((s) => s.spanContext().traceId === traceId);
        const root = mine.find((s) => !s.parentSpanContext);
        const row = {
          dry_run: true, bot: agent.displayName, turn_pos: t.turnPos, traceId,
          sessionId: sessions.get(t.turnPos), start: minuteIso(t.userTs),
          root: root?.name, trace_name: root?.attributes["langfuse.trace.name"], tags: root?.attributes["langfuse.trace.tags"],
          observations: mine.map((s) => `${s.attributes["langfuse.observation.type"]}:${s.name}`),
          user_preview: t.userText.slice(0, 100), assistant_preview: t.assistantText.slice(0, 100),
        };
        if (a["dump-spans"]) row.spans = mine.map((s) => ({ name: s.name, spanId: s.spanContext().spanId, parent: s.parentSpanContext?.spanId, attributes: s.attributes, resource: s.resource.attributes["service.name"] }));
        console.log(JSON.stringify(row));
      }
    } else {
      log(`  wrote ${batch.length} turns OK`);
    }
  }

  if (advancedTo > nextPos) {
    const last = pending.filter((t) => t.turnPos < advancedTo).at(-1);
    cursor.bots[agent.botId] = { display_name: agent.displayName, next_turn_pos: advancedTo, last_export_at: now.toISOString(), last_user_ts: last ? minuteIso(last.userTs) : state.last_user_ts };
  }
}

await inst.shutdown();
cursor.initialized_at ??= now.toISOString();
cursor.last_run_at = now.toISOString();
const { failures, ...rest } = summary;
cursor.last_summary = rest;
if (!dryRun) {
  fs.mkdirSync(path.dirname(cursorFile), { recursive: true });
  fs.writeFileSync(`${cursorFile}.tmp`, `${JSON.stringify(cursor, null, 2)}\n`);
  fs.renameSync(`${cursorFile}.tmp`, cursorFile);
} else {
  log(`dry-run: cursor NOT written (${cursorFile})`);
}
console.log(JSON.stringify({ summary, cursor_file: cursorFile }, null, 2));
process.exit(summary.failures.length ? 1 : 0);
