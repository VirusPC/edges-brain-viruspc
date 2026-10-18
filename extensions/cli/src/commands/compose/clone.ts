import { Command } from "commander";
import type { CliContext } from "../../context.js";
import { cloneCompose } from "../../services/compose/service.js";
import { failNodeCommand } from "../node-result.js";
import { succeed } from "../result.js";

const HELP = "See edges compose --help for usage.\n";

export function addComposeCloneCommand(compose: Command, ctx: CliContext): void {
  compose
    .command("clone")
    .description("Clone Compose block repositories into their registered paths")
    .option("--name <name>", "Only this entry")
    .allowExcessArguments(false)
    .action(async (opts: { name?: string }) => {
      try {
        const entries = await cloneCompose(ctx.env, opts.name);
        ctx.result = succeed({ command: "compose.clone", entries });
      } catch (error) {
        failNodeCommand(ctx, error, HELP);
      }
    });
}
