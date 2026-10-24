#!/usr/bin/env bash
# Cursor Cloud Agents → Langfuse（官方 cursor-observability-plugin，项目级 hooks）。
# 只在云端开：环境 Secrets 里设 LANGFUSE_CURSOR_PROJECT_HOOKS=1 和 LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY / LANGFUSE_BASE_URL。
# 本机 Cursor 已有用户级插件；这里只在本机已有插件时以 tracing=false 应答，避免重复上报；找不到插件就 exit 1（Cursor 视为失败放行）。
set -u
PIN="a36d39a7c5cf9da34662159b70d51b6b36855abc"
REPO="https://github.com/langfuse/cursor-observability-plugin.git"
DIR="${LANGFUSE_CURSOR_PLUGIN_DIR:-$HOME/.cache/langfuse-cursor-plugin/$PIN}"
BUNDLE="$DIR/dist/index.mjs"

command -v node >/dev/null 2>&1 || exit 1

if [ "${LANGFUSE_CURSOR_PROJECT_HOOKS:-}" = "1" ]; then
  if [ ! -f "$BUNDLE" ]; then
    mkdir -p "$(dirname "$DIR")"
    TMP="$(mktemp -d "$(dirname "$DIR")/.clone.XXXXXX")" || exit 1
    if git clone -q "$REPO" "$TMP/repo" >/dev/null 2>&1 \
      && git -C "$TMP/repo" checkout -q "$PIN" >/dev/null 2>&1; then
      mv "$TMP/repo" "$DIR" 2>/dev/null || true   # 并发时别人先放好了也没关系
    fi
    rm -rf "$TMP"
    [ -f "$BUNDLE" ] || exit 1
  fi
  export LANGFUSE_TAGS="${LANGFUSE_TAGS:-device:cursor-cloud}"
  export LANGFUSE_TRACING_ENVIRONMENT="${LANGFUSE_TRACING_ENVIRONMENT:-cursor-cloud}"
  exec node "$BUNDLE"
fi

# 非云端：交给本机已有插件应答，但关掉上报（用户级 hooks 已在上报）。
export LANGFUSE_TRACING_ENABLED=false
if command -v langfuse-cursor-hook >/dev/null 2>&1; then exec langfuse-cursor-hook; fi
for b in "$BUNDLE" "$HOME"/.cursor/plugins/cache/cursor-public/langfuse-observability/dist/index.mjs "$HOME"/.cursor/plugins/local/langfuse-observability/dist/index.mjs; do
  [ -f "$b" ] && exec node "$b"
done
exit 1
