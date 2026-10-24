// Grok Bot turn → the vendored plugin's own `Turn` + `Config` types
// (vendor/cursor-observability-plugin/src/types.ts, src/config.ts).
// emitTurn() is then called unmodified.

export const USER_ID = "peng-cheng";
export const LOCKED_TAGS = ["agent:grok-bot", "device:grokbot"];

/** Plugin Config for one bot. trace_seed makes traceId = sha256(`grokbot:<botId>:<turnPos>`)[:32]. */
export function pluginConfig(base, t, extraMetadata = {}) {
  return {
    enabled: true,
    public_key: base.publicKey,
    secret_key: base.secretKey,
    base_url: base.baseUrl,
    environment: base.environment,
    release: undefined,
    user_id: USER_ID,
    tags: [...LOCKED_TAGS, `bot:${t.displayName}`],
    skill_tags: false,
    // propagateAttributes → trace metadata (string values ≤200 chars kept by plugin)
    metadata: {
      "grokbot.bot_id": t.botId,
      "grokbot.bot_name": t.displayName,
      "grokbot.turn_pos": String(t.turnPos),
      "grokbot.time_precision": "minute",
      "grokbot.source": base.source,
      "grokbot.exporter": "grokbot-langfuse-export",
      ...extraMetadata,
    },
    trace_seed: `grokbot:${t.botId}`,
    traceparent: undefined,
    max_chars: 20_000,
    capture_tool_output: false,
    capture_file_content: false,
    state_dir: "/dev/null",
    debug: false,
    fail_on_error: false,
  };
}

/** Non-empty string, else undefined. */
function nonEmpty(v) {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

/**
 * Model name for Langfuse generation (model / providedModelName).
 * Prefer a real name from the turn (`modelId` then `model`); if neither is set,
 * use the literal `default` so the dashboard does not show n/a (reserved for
 * traces that forgot to set a model at all).
 */
export function resolveModelName(t) {
  return nonEmpty(t?.modelId) ?? nonEmpty(t?.model) ?? "default";
}

/**
 * Plugin Turn. One user message → one trace:
 *   Grok Bot Turn (agent) → LLM (generation, ChatML in/out) + tool siblings (names only).
 * Start/end are the user message minute (no per-message assistant timestamps exist).
 */
export function pluginTurn(t, sessionId) {
  const ts = t.userTs;
  const modelName = resolveModelName(t);
  return {
    conversationId: sessionId, // → Langfuse sessionId
    turnNumber: t.turnPos, // → trace seed suffix
    startTime: ts,
    endTime: ts,
    prompt: t.userText || undefined,
    finalText: t.assistantText || undefined,
    // emitTurn → generation.model → langfuse.observation.model.name / providedModelName
    model: modelName,
    modelId: modelName,
    status: "completed",
    closedBy: "unknown",
    generations: [
      {
        startTime: ts,
        endTime: ts,
        text: t.assistantText || undefined,
        thoughts: [],
        // Privacy rule: tool NAMES only. input/output undefined ⇒ omitted on the
        // tool observation; tool_calls[].function.arguments is "".
        toolCalls: t.toolNames.map((name) => ({
          name,
          input: undefined,
          output: undefined,
          startTime: ts,
          endTime: ts,
          sources: ["grokbot-transcript"],
          subagents: [],
        })),
        otherBlocks: [],
        source: "transcript",
      },
    ],
    orphanSubagents: [],
    compactions: [],
    history: [],
    transcriptUsed: true,
    eventCounts: {},
  };
}
