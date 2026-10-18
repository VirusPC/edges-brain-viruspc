import { fail } from "./commands/result.js";

/**
 * One `edges` process invocation.
 *
 * `CliContext` is the production snapshot plus Commander's out-slot. It is not
 * a Task Run (`edges tasks runs`), and it does not carry test doubles
 * (`ingest`, `fs`, `writer`, `now`). Tests override production env vars
 * (e.g. `EDGES_REPO`) or call domain functions directly.
 */

/** Process output: JSON/table on stdout, diagnostics on stderr. */
export type CliResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

/** Production input to `run()`. Omit to default `env` to `process.env`. */
export type CliInput = {
  env?: NodeJS.ProcessEnv;
  stdinText?: string;
  stdinIsTTY?: boolean;
};

export type CliContext = {
  env: NodeJS.ProcessEnv;
  stdinText?: string;
  stdinIsTTY?: boolean;
  /** Explicit `--super`: traverse from SuperAgentsNode mounting harness-materials READMEs. */
  super?: boolean;
  /** Explicit `--all`: traverse the system forest from the current scope. */
  all?: boolean;
  /** Explicit `--with-composed`: include composed repository entry nodes in list and query. */
  withComposed?: boolean;
  /** Tokens after the first `--`, forwarded only when this invocation installs skills. */
  skillsInstallArgs?: readonly string[];
  /**
   * Set by init while the write lock is still held. `run()` installs only after
   * releasing that lock, so an interactive installer does not block other writers.
   */
  pendingSkillsInstall?: {
    args: readonly string[];
    created: string[];
    stderrHint: string;
  };
  result: CliResult | undefined;
};

export function usageError(reason: string, scope: "root" | "notes" | "projects" | "tasks" | "artifacts" | "memory" | "skills" | "schema" | "compose"): CliResult {
  if (scope === "schema") return { exitCode: 2, stdout: "", stderr: `${reason}\nSee edges schema --help for usage.\n` };
  const usage =
    scope === "notes"
      ? "See edges notes --help for usage.\n"
      : scope === "projects"
        ? "See edges projects --help for usage.\n"
        : scope === "tasks"
          ? "See edges tasks --help for usage.\n"
          : scope === "artifacts"
            ? "See edges artifacts --help for usage.\n"
            : scope === "memory"
              ? "See edges memory --help for usage.\n"
              : scope === "skills"
                ? "See edges skills --help for usage.\n"
                : scope === "compose"
                  ? "See edges compose --help for usage.\n"
                  : "See edges --help for usage.\n";
  return fail("VALIDATION_ERROR", reason, usage);
}

export function usageScope(argv: string[]): "root" | "notes" | "projects" | "tasks" | "artifacts" | "memory" | "skills" | "schema" | "compose" {
  const command = argv.filter((arg, i) => arg !== "--scope" && argv[i - 1] !== "--scope" && !arg.startsWith("--scope=") && arg !== "--super" && arg !== "--all" && arg !== "--with-composed" && !arg.startsWith("--with-composed="))[0];
  if (command === "notes") return "notes";
  if (command === "projects") return "projects";
  if (command === "tasks") return "tasks";
  if (command === "artifacts") return "artifacts";
  if (command === "schema") return "schema";
  if (command === "memory") return "memory";
  if (command === "skills") return "skills";
  if (command === "compose") return "compose";
  return "root";
}
