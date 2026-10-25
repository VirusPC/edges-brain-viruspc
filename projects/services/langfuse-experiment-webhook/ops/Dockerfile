# 运维壳：镜像里跑本仓的薄封装。
# 镜像没有 Node / edges CLI，所以容器仍用 python -m langfuse_experiment_webhook。
# 宿主保活走 edges evaluation server，不走这份镜像。
# HTTP / 签名 / 调度来自框架仓，构建时按 EDGES_REF 检出。
FROM python:3.12-slim

ARG EDGES_REPO=https://github.com/VirusPC/edges.git
ARG EDGES_REF=b054de961e580ae0c1ce478e3eb4065d22b958ca

RUN apt-get update \
    && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN git clone --filter=blob:none --no-checkout "$EDGES_REPO" /opt/edges \
    && git -C /opt/edges sparse-checkout init --cone \
    && git -C /opt/edges sparse-checkout set packages/services/evaluation packages/evaluation \
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
