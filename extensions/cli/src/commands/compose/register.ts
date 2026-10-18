import { Command } from "commander";
import type { CliContext } from "../../context.js";
import { registerCompose } from "../../services/compose/service.js";
import { failNodeCommand } from "../node-result.js";
import { succeed } from "../result.js";
import { presentComposeEntry } from "./present.js";

const HELP = "See edges compose --help for usage.\n";

export function addComposeRegisterCommand(compose: Command, ctx: CliContext): void {
  compose
    .command("register")
    .description("Record a composed repository in the scope Compose block")
    .requiredOption("--name <name>", "Entry name")
    .option("--path <directory>", "Local checkout directory (default: ~/.edges/composed/<name>)")
    .option("--remote <url>", "Git remote used by clone")
    .option("--description <text>", "What this repository is")
    .allowExcessArguments(false)
    .action(async (opts: {
      name: string;
      path?: string;
      remote?: string;
      description?: string;
    }) => {
      try {
        const entry = await registerCompose(ctx.env, {
          name: opts.name,
          directory: opts.path,
          remote: opts.remote,
          description: opts.description,
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
