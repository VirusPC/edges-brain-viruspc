import path from "node:path";
import { BaseNode } from "../../domain/models/index.js";
import { collectSystemRoots } from "./system-roots.js";
import { NodeService } from "./node-service.js";
import { createSuperAgentsNode } from "./super-root.js";

export type ForestForm = "independent" | "innermost";

export type SystemForestOptions = {
  form?: ForestForm;
  /** When false, omit the runtime SuperAgentsNode root. Default true. */
  includeSuper?: boolean;
  /** Pass through ComposeNode and yield external entry nodes. */
  withComposed?: boolean;
};

type RootSpec =
  | { kind: "agents"; path: string }
  | { kind: "super"; scopeDir: string; path: string };

/**
 * Assemble a forest of system trees: collect project-harness AGENTS roots,
 * optionally prepend Super, traverse each with resolve early-stop on peer roots.
 */
export async function buildSystemForest(
  scopeDir: string,
  options: SystemForestOptions = {},
): Promise<BaseNode[][]> {
  const form = options.form ?? "independent";
  const includeSuper = options.includeSuper !== false;
  const scope = path.resolve(scopeDir);
  const agentsRoots = collectSystemRoots(scope);
  const specs: RootSpec[] = agentsRoots.map((p) => ({ kind: "agents", path: p }));
  if (includeSuper) {
    const superNode = createSuperAgentsNode(scope);
    specs.unshift({ kind: "super", scopeDir: scope, path: superNode.path });
  }
  const rootSet = new Set(specs.map((s) => s.path));

  const service = new NodeService({ managedRoot: scope });

  let active = specs;
  if (form === "innermost") {
    const reachability = new Map<string, Set<string>>();
    await Promise.all(
      specs.map(async (spec) => {
        const peers = new Set(rootSet);
        peers.delete(spec.path);
        const hits = new Set<string>();
        await listTree(service, spec, recordingExclude(peers, hits), options.withComposed === true);
        reachability.set(spec.path, hits);
      }),
    );
    // If B can reach A, A belongs under B → drop B (keep innermost).
    const drop = new Set<string>();
    for (const outer of specs) {
      const hits = reachability.get(outer.path) ?? new Set();
      for (const inner of specs) {
        if (inner.path === outer.path) continue;
        if (hits.has(inner.path)) drop.add(outer.path);
      }
    }
    active = specs.filter((s) => !drop.has(s.path));
  }

  const activeSet = new Set(active.map((s) => s.path));
  return Promise.all(
    active.map((spec) => {
      const exclude = new Set(activeSet);
      exclude.delete(spec.path);
      return listTree(service, spec, exclude, options.withComposed === true);
    }),
  );
}

function listTree(
  service: NodeService,
  spec: RootSpec,
  excludeRoots: ReadonlySet<string>,
  withComposed: boolean,
): Promise<BaseNode[]> {
  return service.list(spec.kind === "super" ? spec.scopeDir : spec.path, {
    super: spec.kind === "super",
    ...(withComposed ? { withComposed: true } : {}),
    excludeRoots,
  });
}

/** Set that records peer-root hits then excludes them (early-stop + reachability). */
function recordingExclude(
  peerRoots: ReadonlySet<string>,
  hits: Set<string>,
): ReadonlySet<string> {
  return {
    has(id: string) {
      if (peerRoots.has(id)) {
        hits.add(id);
        return true;
      }
      return false;
    },
  } as ReadonlySet<string>;
}
