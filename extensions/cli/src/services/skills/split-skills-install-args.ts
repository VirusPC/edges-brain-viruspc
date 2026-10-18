/**
 * Split argv at the first literal `--` only for `init` and `skills init`.
 * Every other command keeps the original argv, so `--` still ends options
 * or supplies an option value. No option list: multi-value flags stay in argv.
 */
export function splitSkillsInstallArgs(argv: readonly string[]): {
  argv: string[];
  skillsInstallArgs: string[];
} {
  const dash = argv.indexOf("--");
  if (dash === -1 || !installsBundledSkills(argv.slice(0, dash))) {
    return { argv: [...argv], skillsInstallArgs: [] };
  }
  return {
    argv: argv.slice(0, dash),
    skillsInstallArgs: argv.slice(dash + 1),
  };
}

/** Root `--scope <directory>` is the only value option before the command word. */
function installsBundledSkills(head: readonly string[]): boolean {
  const words: string[] = [];
  for (let index = 0; index < head.length; index += 1) {
    const token = head[index]!;
    if (token === "--scope") {
      index += 1;
      continue;
    }
    if (token.startsWith("-")) continue;
    words.push(token);
  }
  if (words[0] === "init") return true;
  return words[0] === "skills" && words[1] === "init";
}
