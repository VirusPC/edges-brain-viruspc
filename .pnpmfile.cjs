/**
 * Published manifest for @viruspc/edges.
 *
 * pnpm rewrites workspace:* to the target package version before this hook.
 * tasks-review-app stays a private workspace devDependency so local
 * `pnpm --filter @viruspc/edges...` installs can build the review page.
 * Only the compiled HTML/JS/CSS copied into dist/ ship. The React package
 * must not appear in the npm manifest, and no workspace: specifier may leak.
 */
function beforePacking(pkg) {
  if (pkg?.name !== "@viruspc/edges") return pkg;
  for (const field of [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies",
  ]) {
    const deps = pkg[field];
    if (!deps || typeof deps !== "object") continue;
    delete deps["tasks-review-app"];
    for (const [name, spec] of Object.entries(deps)) {
      if (typeof spec === "string" && spec.includes("workspace:")) {
        throw new Error(
          `Refusing to pack ${pkg.name}: ${field}.${name} is still "${spec}"`,
        );
      }
    }
  }
  return pkg;
}

module.exports = {
  hooks: { beforePacking },
};
