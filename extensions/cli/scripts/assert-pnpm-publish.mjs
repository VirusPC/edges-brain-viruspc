const agent = process.env.npm_config_user_agent ?? "";
const execpath = process.env.npm_execpath ?? "";
const viaPnpm = agent.startsWith("pnpm/") || execpath.includes("pnpm");

if (!viaPnpm) {
  console.error(
    "Pack and publish @viruspc/edges with pnpm, not npm.\n" +
      "  pnpm --filter @viruspc/edges pack\n" +
      "  pnpm --filter @viruspc/edges publish\n" +
      "pnpm drops the tasks-review-app workspace dependency from the tarball. npm would upload the workspace: specifier.",
  );
  process.exit(1);
}
