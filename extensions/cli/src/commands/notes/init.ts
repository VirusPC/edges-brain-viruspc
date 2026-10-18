import { Command } from "commander";
import type { CliContext } from "../../context.js";
import { initNotes } from "../../services/notes/service.js";
import { fail, succeed } from "../result.js";

const HELP = "See edges notes init --help for usage.\n";

export function addNoteInitCommand(notes: Command, ctx: CliContext): void {
  notes
    .command("init")
    .description("Initialize the notes harness list and scope AGENTS.md. Does not read --super.")
    .option("--target-dir <directory>", "Explicit target scope (otherwise use --scope or scope discovery)")
    .option("--root-dir <directory>", "Boundary for the scope tree")
    .option("--description <text>", "Description in the parent scope index")
    .allowExcessArguments(false)
    .action(
      async (options: {
        targetDir?: string;
        rootDir?: string;
        description?: string;
      }) => {
        try {
          const result = await initNotes({ ...options, env: ctx.env });
          ctx.result = succeed({ ...result, command: "notes.init" });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          ctx.result = fail("VALIDATION_ERROR", message, HELP);
        }
      },
    );
}
