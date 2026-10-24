// Same wiring as vendor/cursor-observability-plugin/src/instrumentation.ts
// (LangfuseSpanProcessor batched + NodeTracerProvider + the plugin's own
// DeterministicIdGenerator + secret mask). Only differences:
//   1. the Langfuse processor is wrapped by GrokBotRewriteProcessor;
//   2. service.name defaults to "grok-bot" (plugin: "cursor");
//   3. dry-run gives the Langfuse processor an in-memory exporter (no HTTP).
// The plugin's setupInstrumentation() builds its processor internally with no
// hook, which is why this ~30-line mirror exists instead of calling it.
import { LangfuseSpanProcessor } from "@langfuse/otel";
import { setLangfuseTracerProvider } from "@langfuse/tracing";
import { defaultResource, resourceFromAttributes } from "@opentelemetry/resources";
import { InMemorySpanExporter } from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";

import { DeterministicIdGenerator } from "../vendor/cursor-observability-plugin/src/ids.ts";
import { createSecretMask } from "../vendor/cursor-observability-plugin/src/privacy.ts";
import { GrokBotRewriteProcessor } from "./rename-cursor-to-grokbot.mjs";

export const ADAPTER_VERSION = "0.2.0";

export function setupInstrumentation(config, { dryRun = false } = {}) {
  const ids = new DeterministicIdGenerator();
  // dry-run: real LangfuseSpanProcessor (propagation + masking) but an
  // in-memory exporter instead of HTTP.
  const memory = dryRun ? new InMemorySpanExporter() : undefined;
  const inner = new LangfuseSpanProcessor({
    publicKey: config.public_key || undefined,
    secretKey: config.secret_key || undefined,
    baseUrl: config.base_url,
    environment: config.environment,
    release: config.release,
    exportMode: dryRun ? "immediate" : "batched",
    mask: createSecretMask(config),
    shouldExportSpan: () => true,
    ...(memory ? { exporter: memory } : {}),
  });
  const processor = new GrokBotRewriteProcessor(inner, {
    "grokbot.timing_source": "user-message-minute",
  });
  const provider = new NodeTracerProvider({
    spanProcessors: [processor],
    idGenerator: ids,
    resource: defaultResource().merge(
      resourceFromAttributes({
        "service.name": process.env.OTEL_SERVICE_NAME?.trim() || "grok-bot",
        "service.version": ADAPTER_VERSION,
      }),
    ),
  });
  provider.register();
  setLangfuseTracerProvider(provider);
  return {
    ids,
    collected: memory ? { get length() { return memory.getFinishedSpans().length; }, slice: (i) => memory.getFinishedSpans().slice(i) } : undefined,
    flush: () => processor.forceFlush(),
    shutdown: async () => {
      await processor.forceFlush();
      await provider.shutdown();
    },
  };
}
