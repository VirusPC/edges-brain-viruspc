#!/usr/bin/env bash
# Langfuse v4 OTLP 冒烟：经 langfuse_sink 发 1 条根 span，并按 traceId 回查。
# 需要环境变量：LANGFUSE_HOST LANGFUSE_PUBLIC_KEY LANGFUSE_SECRET_KEY（不要写进仓库）
set -euo pipefail
: "${LANGFUSE_HOST:?}" "${LANGFUSE_PUBLIC_KEY:?}" "${LANGFUSE_SECRET_KEY:?}"
OBS_DIR=$(cd "$(dirname "$0")/.." && pwd)
TRACE=$(PYTHONPATH="$OBS_DIR" python3 -m langfuse_sink)
echo "sent traceId=$TRACE"
sleep 8
AUTH=$(printf '%s:%s' "$LANGFUSE_PUBLIC_KEY" "$LANGFUSE_SECRET_KEY" | base64 | tr -d '\n')
curl -fsS -H "Authorization: Basic $AUTH" \
  "$LANGFUSE_HOST/api/public/v2/observations?traceId=$TRACE&limit=5" | grep -q "\"traceId\":\"$TRACE\"" \
  && echo "OK: trace landed" || { echo "FAIL: trace not found"; exit 1; }
