import { Command } from "commander";
import type { CliContext } from "../../context.js";
import { getSkill } from "../../services/skills/service.js";
import { failNodeCommand } from "../node-result.js";
import { succeed } from "../result.js";

const HELP = "See edges skills --help for usage.\n";

export function addSkillGetCommand(skill: Command, ctx: CliContext): void {
  skill
    .command("get")
    .description("Read one skill by path or name")
    .argument("<target>", "SKILL.md path or skill name")
    .action(async (target: string) => {
      try {
        const loaded = await getSkill(ctx.env, target, { all: ctx.all, super: ctx.super, withComposed: ctx.withComposed });
        ctx.result = succeed({
          command: "skills.get",
          name: loaded.name,
          path: loaded.path,
          description: loaded.description,
          body: loaded.body,
        });
      } catch (error) {
        failNodeCommand(ctx, error, HELP);
      }
    });
}
