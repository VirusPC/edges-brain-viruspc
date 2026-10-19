import path from "node:path";
import { Command } from "commander";
import type { CliContext } from "../../../context.js";
import { ReadmeNode } from "../../../domain/models/readme/readme-node.js";
import { runTasksCommand, succeed } from "../run.js";
import { ENTRY_NAMES } from "../../../domain/config/layout.js";
import { scopeTraversal } from "../../../domain/operations/traverse.js";
import {
  buildSystemForest,
  gitRoot,
  isTasksBoardReadmeNode,
  nativeTaskPath,
  NodeService,
  projectRecordFromEntry,
  relativePathInsideScope,
  tasksBoardDirName,
} from "../../../services/tasks/service.js";

export function addProjectListCommand(project: Command, ctx: CliContext): void {
  project
    .command("list")
    .description("List Task Project metadata")
    .option("--json", "Write JSON to stdout (always on)")
    .action(async () => {
      await runTasksCommand(ctx, async (runtime) => {
        const scopeDir = runtime.location.scopeDir;
        const scope = nativeTaskPath(scopeDir);
        const managed = gitRoot(scopeDir) ?? scopeDir;
        const nodes = ctx.all
          ? (await buildSystemForest(scopeDir, { includeSuper: ctx.super === true, withComposed: ctx.withComposed === true, form: "independent" })).flat()
          : await new NodeService({ managedRoot: managed })
            .query(scopeDir, { types: ["readme"], ...scopeTraversal(ctx) })
            .value();
        const projects = nodes.flatMap((node) => {
          if (!(node instanceof ReadmeNode)) return [];
          const rel = relativePathInsideScope(scope, node.path).split(path.sep).join("/");
          const parts = rel.split("/");
          const board = tasksBoardDirName();
          const at = parts.lastIndexOf(board);
          if (at < 0 || parts[at + 1] === undefined || path.basename(node.path) !== ENTRY_NAMES.readme) return [];
          if (isTasksBoardReadmeNode(node.path)) return [];
          return [projectRecordFromEntry(scope, node)];
        });
        return succeed({ status: "success", command: "project.list", projects });
      });
    });
}
