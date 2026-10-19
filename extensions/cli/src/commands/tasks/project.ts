import { Command } from "commander";
import { type CliContext, usageError } from "../../context.js";
import { addProjectCreateCommand } from "./project/create.js";
import { addProjectGetCommand } from "./project/get.js";
import { addProjectListCommand } from "./project/list.js";
import { addProjectReviewPageCommand } from "./project/review-page.js";
import { addProjectUpdateCommand } from "./project/update.js";

const PROJECT_AFTER_HELP = `
COMMANDS
  list
  get <project>
  create <project> --title <title> --description <text>
  update <project> [--title] [--description]
  review-page --from <path|-> [--out <path>]

<project> is default or a lowercase kebab slug (not _default).
create writes tasks/<dir>/README.md (title, description, project-entries list) and lists it in the board README.md. A sibling AGENTS.md is the system entry and is not project metadata.
update changes title/description of an existing README.md and does not create one. A project directory without README.md is an error. Task files move with: edges tasks update --project
review-page renders groups+items JSON to an HTML file (no board writes). Open the printed path in a system browser.
There is no edges tasks classify verb.

EXAMPLES
  edges tasks project list
  edges tasks project create cli --title "CLI" --description "edges CLI work"
  edges tasks project review-page --from suggestions.json
`;

export function addProjectCommand(tasks: Command, ctx: CliContext): void {
  const project = tasks
    .command("project")
    .description("Task Project metadata (index/description layer)")
    .allowExcessArguments(false)
    .showHelpAfterError(false)
    .helpOption("-h, --help", "Show this help");
  addProjectListCommand(project, ctx);
  addProjectGetCommand(project, ctx);
  addProjectCreateCommand(project, ctx);
  addProjectUpdateCommand(project, ctx);
  addProjectReviewPageCommand(project, ctx);
  project.action(() => {
    ctx.result = usageError("missing project subcommand. Use edges tasks project --help.", "tasks");
  });
  project.addHelpText("after", PROJECT_AFTER_HELP);
}
