import { Command } from "commander";
import type { CliContext } from "../../context.js";
import { pushCompose } from "../../services/compose/service.js";
import { failNodeCommand } from "../node-result.js";
import { succeed } from "../result.js";

const HELP = "See edges compose --help for usage.\n";

export function addComposePushCommand(compose: Command, ctx: CliContext): void {
  compose
    .command("push")
    .description("git push in each composed checkout, using that repo's own upstream")
    .option("--name <name>", "Only this entry")
    .allowExcessArguments(false)
    .action(async (opts: { name?: string }) => {
      try {
        const entries = await pushCompose(ctx.env, opts.name);
        ctx.result = succeed({ command: "compose.push", entries });
      } catch (error) {
        failNodeCommand(ctx, error, HELP);
      }
    });
}
