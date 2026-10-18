import { Command } from "commander";
import { type CliContext, usageError } from "../context.js";
import { addCreateCommand } from "./tasks/create.js";
import { addDeleteCommand } from "./tasks/delete.js";
import { addGetCommand } from "./tasks/get.js";
import { addTaskInitCommand } from "./tasks/init.js";
import { addListCommand } from "./tasks/list.js";
import { addRunMessagesCommand } from "./tasks/run-messages.js";
import { addRunsCommand } from "./tasks/runs.js";
import { addStatusCommand } from "./tasks/status.js";
import { addProjectCommand } from "./tasks/project.js";
import { addUpdateCommand } from "./tasks/update.js";

const TASKS_AFTER_HELP = `
TARGET
  edges --scope <directory> tasks ...
  The subject system is that scope. Tasks are written to its .harness/tasks.
  edges --scope <directory> --super tasks ...
  --super makes the subject virtual system one. Its harness is the scope directory, so tasks are written to <directory>/tasks.
  edges --scope <directory> --all tasks list
  --all traverses the forest from that scope. The fullest query is --scope <repo> --super --all.
COMMANDS
  list [--status <edges-tasks-status>] [--priority <edges-task-priority>]... [--project <edges-task-project>]... [--sort priority] [--group-by project] [--format json]
  get <stem|path>
  create --title <title> [--description] [--body] [--status] [--name] [--assignee] [--priority] [--project]
  update <stem|path> [--title] [--description] [--body] [--assignee] [--priority] [--project]
  delete <stem|path>
    Does not delete files. Run: edges tasks status <stem|path> cancelled
  status <stem|path> <edges-tasks-status>
  init     [--target-dir] [--root-dir] [--description]
    Creates only the tasks board. Does not read --super.
  runs <stem|path> [--output table|json]
  run-messages <run-id> [--task <stem>] [--output table|json]
  project list
  project get <project>
  project create <project> --title <title> --description <text>
  project update <project> [--title] [--description]
  project review-page --from <path|-> [--out <path>]

There is no classify command. Task moves stay on update --project (same status and priority).

Issue layer stdout is JSON. runs / run-messages default to a table; pass --output json.
list --group-by <field> emits { groupBy, groups: [{ key, items }] }.

Cancel a Task with: edges tasks status <stem> cancelled
delete only prints that command. It does not remove the Task file or sidecar.

Run layer is read-only (no append).
classifyTasks Skill (extensions/skills/project-tasks-classify) uses these project verbs plus update --project.
Generic tasks Skill/MCP CRUD is a later backlog on this same contract.
Capability Surface is CLI + Skill + MCP.

EXAMPLES
  edges --scope <directory> tasks list
  edges --scope <directory> --super tasks list
  edges --scope <directory> --all tasks list
  edges tasks list --status in_progress
  edges tasks get 2026-09-11--cli
  edges tasks runs 2026-09-11--cli --output json
  edges tasks run-messages 2026-09-11--cli--1
`;

export function addTasksCommand(program: Command, ctx: CliContext): void {
  const tasks = program
    .command("tasks")
    .description("Task board commands")
    .allowExcessArguments(false)
    .showHelpAfterError(false)
    .helpOption("-h, --help", "Show this help");

  addListCommand(tasks, ctx);
  addGetCommand(tasks, ctx);
  addCreateCommand(tasks, ctx);
  addDeleteCommand(tasks, ctx);
  addUpdateCommand(tasks, ctx);
  addProjectCommand(tasks, ctx);
  addStatusCommand(tasks, ctx);
  addRunsCommand(tasks, ctx);
  addRunMessagesCommand(tasks, ctx);
  addTaskInitCommand(tasks, ctx);
  tasks.action(() => {
    ctx.result = usageError("missing tasks subcommand. Use edges tasks --help.", "tasks");
  });
  tasks.addHelpText("after", TASKS_AFTER_HELP);
}
