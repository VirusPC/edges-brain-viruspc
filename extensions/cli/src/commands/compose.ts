import { Command } from "commander";
import { type CliContext, usageError } from "../context.js";
import { addComposeCloneCommand } from "./compose/clone.js";
import { addComposeListCommand } from "./compose/list.js";
import { addComposePullCommand } from "./compose/pull.js";
import { addComposePushCommand } from "./compose/push.js";
import { addComposeRegisterCommand } from "./compose/register.js";
import { addComposeUnregisterCommand } from "./compose/unregister.js";

export function addComposeCommand(program: Command, ctx: CliContext): void {
  const compose = program
    .command("compose")
    .description("Composed harness repository commands");
  compose.action(() => {
    ctx.result = usageError("missing compose command. Use edges compose --help.", "compose");
  });
  addComposeListCommand(compose, ctx);
  addComposeRegisterCommand(compose, ctx);
  addComposeUnregisterCommand(compose, ctx);
  addComposeCloneCommand(compose, ctx);
  addComposePullCommand(compose, ctx);
  addComposePushCommand(compose, ctx);
}
