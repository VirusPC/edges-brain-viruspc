import { Command } from "commander";
import { type CliContext, usageError } from "../context.js";
import { createRequire } from "node:module";
import { addNoteCreateCommand } from "./notes/create.js";
import { addNoteDeleteCommand } from "./notes/delete.js";
import { addNoteGetCommand } from "./notes/get.js";
import { addNoteListCommand } from "./notes/list.js";
import { addNoteInitCommand } from "./notes/init.js";
import { addNoteUpdateCommand } from "./notes/update.js";

const VERSION = (createRequire(import.meta.url)("../../package.json") as {
  version: string;
}).version;

const NOTE_AFTER_HELP = `
STRUCTURED OUTPUT
  Success and failure are JSON objects on stdout.

  Success:
    {"status":"success","command":"notes.create","path":"notes/<date>--<slug>/INDEX.md","title":"..."}

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
  edges notes create --title "Daily" --body "Notes from the session."
  edges notes --help
`;

export function addNotesCommand(program: Command, ctx: CliContext): Command {
  const notes = program
    .command("notes")
    .description("Note commands")
    .allowExcessArguments(false)
    .showHelpAfterError(false)
    .version(VERSION, "-v, --version", "Print version")
    .helpOption("-h, --help", "Show this help");

  notes.action(() => {
    ctx.result = usageError("missing notes command. Use: edges notes create …", "notes");
  });
  addNoteCreateCommand(notes, ctx);
  addNoteListCommand(notes, ctx);
  addNoteGetCommand(notes, ctx);
  addNoteUpdateCommand(notes, ctx);
  addNoteDeleteCommand(notes, ctx);
  addNoteInitCommand(notes, ctx);
  notes.addHelpText("after", NOTE_AFTER_HELP);
  return notes;
}
