import { parseArgs } from "node:util";
import {
  defaultTasksSiteOutPath,
  findEdgesRepo,
  generateTasksSite,
} from "../src/services/tasks/generate-site.js";

const parsed = parseArgs({
  options: {
    scope: { type: "string" },
    out: { type: "string" },
  },
  allowPositionals: false,
});

try {
  const repoPath = findEdgesRepo(process.cwd(), { ...process.env, ...(parsed.values.scope ? { EDGES_SCOPE: parsed.values.scope } : {}) });
  const outPath = parsed.values.out ?? defaultTasksSiteOutPath(repoPath);
  const result = await generateTasksSite({ repoPath, outPath, env: process.env });
  process.stdout.write(
    `${JSON.stringify({
      status: "success",
      command: "generate-tasks-site",
      path: result.path,
      groupCount: result.groupCount,
      itemCount: result.itemCount,
    })}\n`,
  );
} catch (error) {
  const reason = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${reason}\n`);
  process.exitCode = 1;
}
