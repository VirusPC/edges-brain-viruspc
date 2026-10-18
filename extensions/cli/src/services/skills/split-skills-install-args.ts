const VALUE_OPTIONS = new Set([
  "--scope",
  "--target-dir",
  "--root-dir",
  "--description",
  "--memory-types",
  "--skill-types",
]);

/**
 * Split argv at `--` before Commander parses `edges init` / `edges skills init`.
 * Other commands keep `--` so their own operands do not change.
 */
export function splitSkillsInstallArgs(argv: readonly string[]): {
  argv: string[];
  skillsInstallArgs: string[];
} {
  const dash = argv.indexOf("--");
  if (dash === -1) return { argv: [...argv], skillsInstallArgs: [] };
  const head = argv.slice(0, dash);
  if (!forwardsSkillsInstallArgs(head)) return { argv: [...argv], skillsInstallArgs: [] };
  return { argv: [...head], skillsInstallArgs: [...argv.slice(dash + 1)] };
}

function forwardsSkillsInstallArgs(head: readonly string[]): boolean {
  const positionals: string[] = [];
  for (let index = 0; index < head.length; index += 1) {
    const token = head[index]!;
    if (token.startsWith("-")) {
      if (!token.includes("=") && VALUE_OPTIONS.has(token)) index += 1;
      continue;
    }
    positionals.push(token);
  }
  if (positionals[0] === "init") return true;
  return positionals[0] === "skills" && positionals[1] === "init";
}
