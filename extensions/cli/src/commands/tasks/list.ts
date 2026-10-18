import * as fs from "node:fs";
import path from "node:path";
import { Command, Option } from "commander";
import type { CliContext } from "../../context.js";
import { parseTaskProject } from "../../domain/models/tasks/project.js";
import { parseTaskPriority } from "../../domain/models/tasks/priority.js";
import { TaskNode } from "../../domain/models/tasks/task-node.js";
import { sortTasksByPriority } from "../../domain/operations/tasks.js";
import { scopeTraversal } from "../../domain/operations/traverse.js";
import { TASK_PRIORITIES, TASK_STATUSES, type TaskPriority, type TaskProjectId, type TaskStatus } from "../../domain/models/tasks/types.js";
import { runTasksCommand, succeed } from "./run.js";
import { TasksError } from "../../domain/models/tasks/types.js";
import { ENTRY_NAMES } from "../../domain/config/layout.js";
import {
  buildSystemForest,
  gitRoot,
  groupRecords,
  listTaskNodes,
  matchesFilters,
  nativeTaskPath,
  NodeService,
  parseFieldFilter,
  relativePathInsideScope,
  subjectTaskBoard,
  tasksBoardDirName,
  tasksBoardReadmeExists,
  type FieldFilter,
} from "../../services/tasks/service.js";

const LIST_AFTER_HELP = `
FLAGS
  --status <edges-tasks-status>  Filter: backlog | todo | in_progress | in_review | done | blocked | cancelled
  --priority <priority>  Repeatable OR filter: urgent | high | medium | low | none
  --project <project>  Repeatable OR filter: default or kebab slug
  --sort priority        urgent → high → medium → low → none (stable). Default stays board order
  --group-by <field>    After filters, emit { groupBy, groups: [{ key, items }] }
  --filter <field=value>  Repeatable. Same field is OR, different fields are AND

The scope, super, and all switches sit on the root command. Without --all, list traverses one tree. With --all, it traverses the forest from that scope.

Grouped stdout is { status, command, groupBy, groups }. Items may include optional doc. Without --group-by the envelope stays { status, command: "list", tasks: [...] } and tasks do not include doc.

EXAMPLES
  edges --scope <directory> tasks list
  edges --scope <directory> --super tasks list
  edges --scope <directory> --all tasks list
  edges --scope <directory> --super --all tasks list
  edges tasks list --status in_progress
  edges tasks list --sort priority
  edges tasks list --group-by project --format json
`;

export function addListCommand(tasks: Command, ctx: CliContext): void {
  tasks
    .command("list")
    .description("List tasks reached from the subject system")
    .addOption(new Option("--status <status>", "edges-tasks-status").choices([...TASK_STATUSES]))
    .addOption(
      new Option("--priority <priority>", "edges-task-priority (repeatable, OR)")
        .choices([...TASK_PRIORITIES])
        .argParser((value: string, previous: TaskPriority[]) => [
          ...(previous ?? []),
          parseTaskPriority(value),
        ]),
    )
    .addOption(
      new Option("--project <project>", "edges-task-project (repeatable, OR)")
        .argParser((value: string, previous: TaskProjectId[]) => [
          ...(previous ?? []),
          parseTaskProject(value),
        ]),
    )
    .addOption(new Option("--sort <field>", "sort list").choices(["priority"]))
    .addOption(new Option("--group-by <field>", "group filtered tasks by one field"))
    .addOption(new Option("--format <format>", "stdout format (always json)").choices(["json"]))
    .option("--filter <field=value>", "Repeatable field filter", (value: string, previous: string[] = []) => [
      ...previous,
      value,
    ])
    .option("--json", "Write JSON to stdout (always on)")
    .addHelpText("after", LIST_AFTER_HELP)
    .action(async (opts: {
      status?: TaskStatus;
      priority?: TaskPriority[];
      project?: TaskProjectId[];
      sort?: "priority";
      groupBy?: string;
      format?: "json";
      filter?: string[];
    }) => {
      await runTasksCommand(ctx, async (runtime) => {
        let filters: FieldFilter[];
        try {
          filters = (opts.filter ?? []).map(parseFieldFilter);
        } catch (error) {
          throw new TasksError(
            "VALIDATION_ERROR",
            error instanceof Error ? error.message : String(error),
          );
        }
        const listOpts = {
          status: opts.status,
          priorities: opts.priority,
          projects: opts.project,
          sort: opts.sort,
        };
        const scopeDir = runtime.location.scopeDir;
        const listed = (await collectTasks(scopeDir, {
          all: ctx.all === true,
          super: ctx.super === true,
          withComposed: ctx.withComposed === true,
        })).filter((item) => itemMatches(item, listOpts));
        const ordered = listOpts.sort === "priority" ? sortTasksByPriority(listed) : listed;
        const filtered = ordered.filter((item) =>
          matchesFilters(item as unknown as Record<string, unknown>, filters),
        );
        if (opts.groupBy) {
          return succeed({
            status: "success",
            command: "list",
            groupBy: opts.groupBy,
            groups: groupRecords(filtered as unknown as Record<string, unknown>[], opts.groupBy),
          });
        }
        const tasksOnly = filtered.map((item) => {
          const { doc: _doc, ...rest } = item as { doc?: unknown };
          return rest;
        });
        return succeed({ status: "success", command: "list", tasks: tasksOnly });
      });
    });
}

async function collectTasks(scopeDir: string, mode: { all: boolean; super: boolean; withComposed: boolean }) {
  const managed = gitRoot(scopeDir) ?? scopeDir;
  if (mode.all) {
    const forest = await buildSystemForest(scopeDir, { includeSuper: mode.super, withComposed: mode.withComposed, form: "independent" });
    return forest.flat().flatMap((node) => node instanceof TaskNode ? [taskItem(node, scopeDir)] : []);
  }
  const scopeEntry = path.join(path.resolve(scopeDir), ENTRY_NAMES.internal);
  if (!mode.super && !fs.existsSync(scopeEntry)) {
    if (tasksBoardReadmeExists(scopeDir)) {
      return (await listTaskNodes(subjectTaskBoard(scopeDir))).map((node) => taskItem(node, scopeDir));
    }
    throw new Error(
      `Missing scope entry: ${scopeEntry}. Add AGENTS.md or pass --super to traverse the content face (README) as a virtual system.`,
    );
  }
  const nodes = await new NodeService({ managedRoot: managed })
    .query(scopeDir, { types: ["task"], ...scopeTraversal(mode) })
    .filter((node): node is TaskNode => node instanceof TaskNode)
    .value();
  return nodes.map((node) => taskItem(node, scopeDir));
}

function taskItem(node: TaskNode, root: string) {
  const rel = relativePathInsideScope(nativeTaskPath(root), node.path).split(path.sep).join("/");
  const parts = rel.split("/");
  const at = parts.lastIndexOf(tasksBoardDirName());
  const projectDir = at >= 0 ? parts[at + 1] : undefined;
  return {
    stem: path.basename(path.dirname(node.path)),
    path: rel,
    title: node.title,
    status: node.status,
    priority: node.priority,
    project: projectDir === "_default" ? "default" : projectDir,
    description: node.description,
  };
}

function itemMatches(
  item: { status: TaskStatus; priority: TaskPriority; project?: string },
  opts: { status?: TaskStatus; priorities?: TaskPriority[]; projects?: TaskProjectId[] },
) {
  if (opts.status && item.status !== opts.status) return false;
  if (opts.priorities?.length && !opts.priorities.includes(item.priority)) return false;
  if (opts.projects?.length && item.project !== undefined && !opts.projects.includes(item.project as TaskProjectId)) return false;
  return true;
}
