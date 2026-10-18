import { Command } from "commander";
import { type CliContext, usageError } from "../context.js";
import { createRequire } from "node:module";
import { addProjectCreateCommand } from "./projects/create.js";
import { addProjectDeleteCommand } from "./projects/delete.js";
import { addProjectGetCommand } from "./projects/get.js";
import { addProjectListCommand } from "./projects/list.js";
import { addProjectInitCommand } from "./projects/init.js";
import { addProjectUpdateCommand } from "./projects/update.js";

const VERSION = (createRequire(import.meta.url)("../../package.json") as {
  version: string;
}).version;

const PROJECT_AFTER_HELP = `
STRUCTURED OUTPUT
  Success and failure are JSON objects on stdout.

  Success:
    {"status":"success","command":"projects.create","path":"projects/<date>--<slug>/INDEX.md","title":"..."}

  Failure:
    {"status":"failed","errorCode":"VALIDATION_ERROR|UNKNOWN_ERROR","reason":"..."}

FLAGS
  list     --filter <field=value>  --group-by <field>
  get      <path>
  create   --title <title>  --body <markdown>  --metadata <key=value>  --json
  update   <path>  --title  --body  --metadata <key=value>
  delete   <path>
  init     [--target-dir] [--root-dir] [--description]

  create/update use metadata plus --body. The title is the body H1, or --title.
  get and delete take only the target. list uses the shared filter/group envelope.
  Scope comes from --scope / --super / --all. There is no git commit, push, or PR.

EXIT CODES
  0  success
  1  runtime failure
  2  usage or validation error

EXAMPLES
  edges projects create --title "Demo" --body "What this project is."
  edges projects --help
`;

export function addProjectsCommand(program: Command, ctx: CliContext): Command {
  const projects = program
    .command("projects")
    .description("Project leaf commands")
    .allowExcessArguments(false)
    .showHelpAfterError(false)
    .version(VERSION, "-v, --version", "Print version")
    .helpOption("-h, --help", "Show this help");

  projects.action(() => {
    ctx.result = usageError("missing projects command. Use: edges projects create …", "projects");
  });
  addProjectCreateCommand(projects, ctx);
  addProjectListCommand(projects, ctx);
  addProjectGetCommand(projects, ctx);
  addProjectUpdateCommand(projects, ctx);
  addProjectDeleteCommand(projects, ctx);
  addProjectInitCommand(projects, ctx);
  projects.addHelpText("after", PROJECT_AFTER_HELP);
  return projects;
}
