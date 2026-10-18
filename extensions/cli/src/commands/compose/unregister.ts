import { Command } from "commander";
import type { CliContext } from "../../context.js";
import { unregisterCompose } from "../../services/compose/service.js";
import { failNodeCommand } from "../node-result.js";
import { succeed } from "../result.js";
import { presentComposeEntry } from "./present.js";

const HELP = "See edges compose --help for usage.\n";

export function addComposeUnregisterCommand(compose: Command, ctx: CliContext): void {
  compose
    .command("unregister")
    .description("Remove one Compose block entry by name")
    .requiredOption("--name <name>", "Entry name")
    .allowExcessArguments(false)
    .action(async (opts: { name: string }) => {
      try {
        const entry = await unregisterCompose(ctx.env, opts.name);
        ctx.result = succeed({
          command: "compose.unregister",
          ...presentComposeEntry(entry),
        });
      } catch (error) {
        failNodeCommand(ctx, error, HELP);
      }
    });
}
