import { Command } from "commander";
import type { CliContext } from "../../context.js";
import { registerCompose } from "../../services/compose/service.js";
import { failNodeCommand } from "../node-result.js";
import { fail, succeed } from "../result.js";
import { presentComposeEntry } from "./present.js";

const HELP = "See edges compose --help for usage.\n";
const DESCRIPTION_REQUIRED = "--description is required";

export function addComposeRegisterCommand(compose: Command, ctx: CliContext): void {
  compose
    .command("register")
    .description("Record a composed repository in the scope Compose block")
    .requiredOption("--name <name>", "Entry name")
    .option("--path <directory>", "Local checkout directory (default: ~/.edges/composed/<name>)")
    .option("--remote <url>", "Git remote used by clone")
    .requiredOption("--description <text>", "Required. What this repository stores and when to write into it")
    .allowExcessArguments(false)
    .action(async (opts: {
      name: string;
      path?: string;
      remote?: string;
      description: string;
    }) => {
      const description = opts.description.trim();
      if (!description) {
        ctx.result = fail("VALIDATION_ERROR", DESCRIPTION_REQUIRED, HELP);
        return;
      }
      try {
        const entry = await registerCompose(ctx.env, {
          name: opts.name,
          directory: opts.path,
          remote: opts.remote,
          description,
        });
        ctx.result = succeed({
          command: "compose.register",
          ...presentComposeEntry(entry),
        });
      } catch (error) {
        failNodeCommand(ctx, error, HELP);
      }
    });
}
