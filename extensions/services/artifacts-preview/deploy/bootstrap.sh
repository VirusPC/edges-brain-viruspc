#!/usr/bin/env bash
# Thin wrapper: edges artifacts server install, then restart.
# Never a combined install-and-start. No sudo. Requires
# ~/.config/edges/artifacts-preview.env (token on the box).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
ENV_FILE="${XDG_CONFIG_HOME:-$HOME/.config}/edges/artifacts-preview.env"
UID_NOW="$(id -u)"
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/${UID_NOW}}"
if [ -z "${DBUS_SESSION_BUS_ADDRESS:-}" ] && [ -S "${XDG_RUNTIME_DIR}/bus" ]; then
  export DBUS_SESSION_BUS_ADDRESS="unix:path=${XDG_RUNTIME_DIR}/bus"
fi

die() {
  printf '%s\n' "$*" >&2
  exit 1
}

# Non-interactive SSH often has no nvm/corepack on PATH.
export PATH="${HOME}/.local/share/pnpm:${HOME}/.local/bin:/usr/local/bin:${PATH}"
if [ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]; then
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
fi

[ -f "$ENV_FILE" ] || die "missing $ENV_FILE — run: edges artifacts server install"
token="$(awk -F= '/^EDGES_ARTIFACTS_TOKEN=/{print substr($0, index($0,"=")+1); exit}' "$ENV_FILE")"
[ -n "$token" ] && [ "$token" != "replace-with-shared-token" ] || die "unusable token in $ENV_FILE — run: edges artifacts server install"
command -v node >/dev/null 2>&1 || die "node not on PATH (need Node >= 22 on this box)"
command -v pnpm >/dev/null 2>&1 || die "pnpm not on PATH (corepack enable && corepack prepare pnpm@latest --activate)"

cd "$REPO_ROOT"

run_edges() {
  if command -v edges >/dev/null 2>&1; then
    edges "$@"
  else
    pnpm --filter @viruspc/edges exec -- tsx src/index.ts "$@"
  fi
}

if ! command -v edges >/dev/null 2>&1; then
  pnpm install --frozen-lockfile --filter @viruspc/edges...
fi

run_edges artifacts server install
run_edges artifacts server restart
