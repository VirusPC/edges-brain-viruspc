import { Command } from "commander";
import type { CliContext } from "../../context.js";
import { listMemoryEntries } from "../../services/memory/service.js";
import { present, scoped, target, type TargetOptions } from "./utils/command.js";

export function addMemoryListCommand(memory: Command, ctx: CliContext): void {
  scoped(memory.command("list").description("List memory entries").option("--type <type>", "Memory type"))
    .action((opts: TargetOptions & { type?: string }) =>
      present(ctx, async () => ({ command: "memory.list", ...(await listMemoryEntries(target(opts, ctx), opts.type, { all: ctx.all, super: ctx.super, withComposed: ctx.withComposed })) })),
    );
}
