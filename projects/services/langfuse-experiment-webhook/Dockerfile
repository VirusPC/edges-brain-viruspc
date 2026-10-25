FROM python:3.12-slim

WORKDIR /app
COPY langfuse_experiment_webhook /app/langfuse_experiment_webhook

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    HOST=0.0.0.0 \
    PORT=8787 \
    DRY_RUN=1

EXPOSE 8787

CMD ["python", "-m", "langfuse_experiment_webhook"]
