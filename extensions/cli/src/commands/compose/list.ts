import { Command } from "commander";
import type { CliContext } from "../../context.js";
import { listCompose } from "../../services/compose/service.js";
import { failNodeCommand } from "../node-result.js";
import { succeed } from "../result.js";
import { presentComposeEntry } from "./present.js";

const HELP = "See edges compose --help for usage.\n";

export function addComposeListCommand(compose: Command, ctx: CliContext): void {
  compose
    .command("list")
    .description("List Compose block entries on the scope AGENTS.md")
    .allowExcessArguments(false)
    .action(async () => {
      try {
        const entries = await listCompose(ctx.env);
        ctx.result = succeed({
          command: "compose.list",
          entries: entries.map(presentComposeEntry),
        });
      } catch (error) {
        failNodeCommand(ctx, error, HELP);
      }
    });
}
