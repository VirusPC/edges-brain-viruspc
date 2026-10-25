from __future__ import annotations

import json
import logging
import os
import uuid
from concurrent.futures import ThreadPoolExecutor
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit
from typing import Any

from langfuse_experiment_webhook.config import Config, load_config
from langfuse_experiment_webhook.jobs import Dependencies, Job, default_dependencies, run_job
from langfuse_experiment_webhook.signature import verify_langfuse_signature


class App:
    def __init__(
        self,
        config: Config,
        executor: Any | None = None,
        deps: Dependencies | None = None,
    ):
        self.config = config
        self.deps = deps or default_dependencies()
        self.executor = executor or ThreadPoolExecutor(
            max_workers=config.max_workers,
            thread_name_prefix="lf-experiment",
        )

    def shutdown(self) -> None:
        self.executor.shutdown(wait=False, cancel_futures=False)

    def process(self, job: Job) -> None:
        try:
            run_job(job, self.config, self.deps)
        except Exception:
            logging.exception("job failed jobId=%s", job.job_id)

    def handle_get(self, handler: BaseHTTPRequestHandler) -> None:
        if _path(handler) != "/health":
            _send_json(handler, 404, {"error": "not found"})
            return
        _send_json(handler, 200, {"status": "ok"})

    def handle_post(self, handler: BaseHTTPRequestHandler) -> None:
        if _path(handler) != "/langfuse/experiment":
            _send_json(handler, 404, {"error": "not found"})
            return
        raw, error = _read_body(handler, self.config.max_body_bytes)
        if error is not None:
            status, message = error
            _send_json(handler, status, {"accepted": False, "error": message})
            return
        assert raw is not None
        if self.config.webhook_secret is not None:
            header = handler.headers.get("x-langfuse-signature")
            if not verify_langfuse_signature(
                raw,
                header,
                self.config.webhook_secret,
                self.config.signature_tolerance_seconds,
            ):
                logging.info("signature rejected")
                _send_json(handler, 401, {"accepted": False, "error": "invalid signature"})
                return
        try:
            parsed = json.loads(raw.decode("utf-8"))
            fields = _experiment_fields(parsed)
        except (UnicodeDecodeError, json.JSONDecodeError, ValueError) as exc:
            message = str(exc) if isinstance(exc, ValueError) and not isinstance(exc, json.JSONDecodeError) else "invalid json"
            _send_json(handler, 400, {"accepted": False, "error": message})
            return

        job = Job(
            job_id=str(uuid.uuid4()),
            project_id=fields["projectId"],
            dataset_id=fields["datasetId"],
            dataset_name=fields["datasetName"],
            payload=fields["payload"],
        )
        try:
            self.executor.submit(self.process, job)
        except RuntimeError:
            logging.exception("failed to enqueue jobId=%s", job.job_id)
            _send_json(handler, 503, {"accepted": False, "error": "unavailable"})
            return
        logging.info(
            "accepted jobId=%s datasetName=%s projectId=%s",
            job.job_id,
            job.dataset_name,
            job.project_id,
        )
        _send_json(handler, 202, {"accepted": True, "jobId": job.job_id})


def make_handler(app: App) -> type[BaseHTTPRequestHandler]:
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:
            app.handle_get(self)

        def do_POST(self) -> None:
            app.handle_post(self)

        def log_message(self, fmt: str, *args: Any) -> None:
            logging.info("%s %s", self.address_string(), fmt % args)

    return Handler


def serve(config: Config | None = None) -> None:
    config = config or load_config()
    app = App(config)
    server = ThreadingHTTPServer((config.host, config.port), make_handler(app))
    logging.info("listening %s", json.dumps({"host": config.host, **config.public_summary()}))
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        logging.info("shutting down")
    finally:
        server.server_close()
        app.shutdown()


def main() -> None:
    logging.basicConfig(
        level=getattr(logging, os.environ.get("LOG_LEVEL", "INFO").upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(message)s",
    )
    serve(load_config())


def _path(handler: BaseHTTPRequestHandler) -> str:
    path = urlsplit(handler.path).path
    if len(path) > 1 and path.endswith("/"):
        path = path[:-1]
    return path


def _read_body(
    handler: BaseHTTPRequestHandler,
    limit: int,
) -> tuple[bytes | None, tuple[int, str] | None]:
    header = handler.headers.get("Content-Length")
    if header is None:
        return None, (411, "content-length required")
    try:
        length = int(header)
    except ValueError:
        return None, (400, "invalid content-length")
    if length < 0:
        return None, (400, "invalid content-length")
    if length > limit:
        return None, (413, "payload too large")
    return handler.rfile.read(length), None


def _experiment_fields(data: Any) -> dict[str, Any]:
    if not isinstance(data, dict):
        raise ValueError("body must be a JSON object")
    fields: dict[str, Any] = {}
    for name in ("projectId", "datasetId", "datasetName"):
        value = data.get(name)
        if not isinstance(value, str) or value == "":
            raise ValueError(f"{name} must be a non-empty string")
        fields[name] = value
    fields["payload"] = data.get("payload") if "payload" in data else None
    return fields


def _send_json(handler: BaseHTTPRequestHandler, status: int, payload: dict[str, Any]) -> None:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)
