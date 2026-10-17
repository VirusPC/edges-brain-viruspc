import type { Command } from "commander";
import { type CliContext, usageError } from "../context.js";
import { failNodeCommand } from "./node-result.js";
import { succeed } from "./result.js";
import {
  cloneCompose,
  listCompose,
  pullCompose,
  pushCompose,
  registerCompose,
} from "../services/compose/service.js";

const HELP = "See edges compose --help for usage.\n";

function view(entry: {
  name: string;
  directory: string;
  description?: string;
  remote?: string;
  id?: string;
}) {
  return {
    name: entry.name,
    directory: entry.directory,
    ...(entry.id === undefined ? {} : { entry: entry.id }),
    ...(entry.description === undefined ? {} : { description: entry.description }),
    ...(entry.remote === undefined ? {} : { remote: entry.remote }),
  };
}

export function addComposeCommand(program: Command, ctx: CliContext): void {
  const command = program
    .command("compose")
    .description(
      "Register composed harness repositories and clone, pull, or push them",
    );
  command.action(() => {
    ctx.result = usageError(
      "missing compose command. Use edges compose --help.",
      "compose",
    );
  });

  command
    .command("list")
    .description("List Compose block entries on the scope AGENTS.md")
    .allowExcessArguments(false)
    .action(async () => {
      try {
        const entries = await listCompose(ctx.env);
        ctx.result = succeed({
          command: "compose.list",
          entries: entries.map(view),
        });
      } catch (error) {
        failNodeCommand(ctx, error, HELP);
      }
    });

  command
    .command("register")
    .description("Record a composed repository in the scope Compose block")
    .requiredOption("--name <name>", "Entry name")
    .requiredOption("--path <directory>", "Local directory for the checkout")
    .option("--remote <url>", "Git remote used by clone")
    .option("--description <text>", "What this repository is")
    .allowExcessArguments(false)
    .action(
      async (opts: {
        name: string;
        path: string;
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
          ctx.result = succeed({ command: "compose.register", ...view(entry) });
        } catch (error) {
          failNodeCommand(ctx, error, HELP);
        }
      },
    );

  command
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

  command
    .command("pull")
    .description("git pull in each composed checkout, using that repo's own config")
    .option("--name <name>", "Only this entry")
    .allowExcessArguments(false)
    .action(async (opts: { name?: string }) => {
      try {
        const entries = await pullCompose(ctx.env, opts.name);
        ctx.result = succeed({ command: "compose.pull", entries });
      } catch (error) {
        failNodeCommand(ctx, error, HELP);
      }
    });

  command
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
