import path from "node:path";

const agent = process.env.npm_config_user_agent ?? "";
const execpath = process.env.npm_execpath ?? "";

function packClient(execpath) {
  const base = path.basename(execpath).toLowerCase();
  if (base === "pnpm" || base.startsWith("pnpm.")) return "pnpm";
  if (
    base === "npm" ||
    base === "npx" ||
    base.startsWith("npm.") ||
    base.startsWith("npx.") ||
    base === "npm-cli.js" ||
    base === "npx-cli.js"
  ) {
    return "npm";
  }
  return "other";
}

const client = packClient(execpath);
const agentSaysPnpm = agent.startsWith("pnpm/");

if (client !== "pnpm") {
  const mismatch =
    client === "npm" && agentSaysPnpm
      ? "Rejected: npm_execpath is npm, but npm_config_user_agent says pnpm. An inherited pnpm user agent does not make this a pnpm pack.\n"
      : "";
  console.error(
    mismatch +
      "Pack and publish @viruspc/edges with pnpm, not npm.\n" +
      "  pnpm --filter @viruspc/edges pack\n" +
      "  pnpm --filter @viruspc/edges publish\n" +
      "The pack client is decided from npm_execpath, not npm_config_user_agent.\n" +
      "pnpm drops the tasks-review-app workspace dependency from the tarball. npm would upload the workspace: specifier.",
  );
  process.exit(1);
}
