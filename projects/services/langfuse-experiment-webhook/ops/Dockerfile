# 运维壳：镜像里跑本仓的薄封装。
# HTTP / 签名 / 调度来自框架仓，构建时按 EDGES_REF 检出。
FROM python:3.12-slim

ARG EDGES_REPO=https://github.com/VirusPC/edges.git
ARG EDGES_REF=7da7994ad6a269514248c3f1a0f5827279f4969c

RUN apt-get update \
    && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN git clone --filter=blob:none --no-checkout "$EDGES_REPO" /opt/edges \
    && git -C /opt/edges sparse-checkout init --cone \
    && git -C /opt/edges sparse-checkout set packages/services/experiment-webhook packages/evaluation \
    && git -C /opt/edges fetch --depth 1 origin "$EDGES_REF" \
    && git -C /opt/edges checkout FETCH_HEAD

WORKDIR /app
COPY business/langfuse_experiment_webhook /app/langfuse_experiment_webhook

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    EDGES_ROOT=/opt/edges \
    HOST=0.0.0.0 \
    PORT=8787 \
    EXPERIMENT_WEBHOOK_REPORTS_DIR=/var/lib/langfuse-experiment-webhook/reports

RUN mkdir -p /var/lib/langfuse-experiment-webhook/reports

EXPOSE 8787

CMD ["python", "-m", "langfuse_experiment_webhook"]
