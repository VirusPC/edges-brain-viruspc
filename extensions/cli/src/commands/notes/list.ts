import { Command } from "commander";
import type { CliContext } from "../../context.js";
import { listNotes, presentListed } from "../../services/notes/service.js";
import { collectRepeat } from "../metadata.js";
import { failNodeCommand } from "../node-result.js";
import { succeed } from "../result.js";

const HELP = "See edges notes --help for usage.\n";

export function addNoteListCommand(note: Command, ctx: CliContext): void {
  note
    .command("list")
    .description("List notes reached from the subject system")
    .option("--filter <field=value>", "Repeatable field filter", collectRepeat, [])
    .option("--group-by <field>", "Group filtered notes by one field")
    .action(async (opts: { filter?: string[]; groupBy?: string }) => {
      try {
        const items = await listNotes(ctx.env, { all: ctx.all, super: ctx.super, withComposed: ctx.withComposed });
        ctx.result = succeed(presentListed("notes.list", items, opts));
      } catch (error) {
        failNodeCommand(ctx, error, HELP);
      }
    });
}
