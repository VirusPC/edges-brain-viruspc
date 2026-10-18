/**
 * Split argv at the first literal `--` before Commander parses.
 * Everything after that token is forwarded only when this invocation installs skills.
 * No option list: multi-value flags such as `--memory-types a b` stay in `argv`.
 */
export function splitSkillsInstallArgs(argv: readonly string[]): {
  argv: string[];
  skillsInstallArgs: string[];
} {
  const dash = argv.indexOf("--");
  if (dash === -1) return { argv: [...argv], skillsInstallArgs: [] };
  return {
    argv: argv.slice(0, dash),
    skillsInstallArgs: argv.slice(dash + 1),
  };
}
