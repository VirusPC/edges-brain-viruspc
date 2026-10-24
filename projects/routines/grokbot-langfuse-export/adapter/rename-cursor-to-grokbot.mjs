// Minimal post-processing of spans emitted by the vendored, unmodified
// cursor-observability-plugin `emitTurn`. The plugin hardcodes three
// Cursor-specific values that Config/Turn cannot change:
//   - trace + root observation name "Cursor Turn"
//   - a leading "cursor" trace tag
//   - "cursor.*" metadata keys
// We rewrite only those, in place, right before LangfuseSpanProcessor
// (masking + export) sees the ended span. Nothing else is touched.

export const GROKBOT_TRACE_NAME = "Grok Bot Turn";
const CURSOR_TRACE_NAME = "Cursor Turn";
const OBS_META = "langfuse.observation.metadata.";
const TRACE_META = "langfuse.trace.metadata.";

export function rewriteSpan(span, overrides = {}) {
  if (span.name === CURSOR_TRACE_NAME) span.name = GROKBOT_TRACE_NAME;
  const attrs = span.attributes;
  if (attrs["langfuse.trace.name"] === CURSOR_TRACE_NAME) attrs["langfuse.trace.name"] = GROKBOT_TRACE_NAME;
  const tags = attrs["langfuse.trace.tags"];
  if (Array.isArray(tags)) attrs["langfuse.trace.tags"] = tags.filter((t) => t !== "cursor");
  for (const key of Object.keys(attrs)) {
    for (const prefix of [OBS_META, TRACE_META]) {
      if (key.startsWith(`${prefix}cursor.`)) {
        const renamed = `${prefix}grokbot.${key.slice(prefix.length + "cursor.".length)}`;
        attrs[renamed] = overrides[renamed.slice(prefix.length)] ?? attrs[key];
        delete attrs[key];
      }
    }
  }
  return span;
}

export class GrokBotRewriteProcessor {
  /** @param delegate a SpanProcessor (LangfuseSpanProcessor in production) */
  constructor(delegate, overrides) {
    this.delegate = delegate;
    this.overrides = overrides;
  }
  onStart(span, ctx) {
    return this.delegate.onStart(span, ctx);
  }
  onEnd(span) {
    rewriteSpan(span, this.overrides);
    return this.delegate.onEnd(span);
  }
  forceFlush() {
    return this.delegate.forceFlush();
  }
  shutdown() {
    return this.delegate.shutdown();
  }
}
