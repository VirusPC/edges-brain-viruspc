import { Command } from "commander";
import type { CliContext } from "../../context.js";
import { updateSkill } from "../../services/skills/service.js";
import { collectRepeat } from "../metadata.js";
import { failNodeCommand } from "../node-result.js";
import { succeed } from "../result.js";

const HELP = "See edges skills --help for usage.\n";

export function addSkillUpdateCommand(skill: Command, ctx: CliContext): void {
  skill
    .command("update")
    .description("Update a managed skill description, body, or metadata")
    .argument("<target>", "SKILL.md path or skill name")
    .option("--description <text>", "New description")
    .option("--body <markdown>", "New body")
    .option("--metadata <key=value>", "Repeatable frontmatter field", collectRepeat, [])
    .action(async (target: string, opts: { description?: string; body?: string; metadata?: string[] }) => {
      try {
        const updated = await updateSkill(
          ctx.env,
          target,
          {
            description: opts.description,
            body: opts.body,
            metadata: opts.metadata,
          },
          { all: ctx.all, super: ctx.super, withComposed: ctx.withComposed },
        );
        ctx.result = succeed({
          command: "skills.update",
          name: updated.name,
          path: updated.path,
        });
      } catch (error) {
        failNodeCommand(ctx, error, HELP);
      }
    });
}
