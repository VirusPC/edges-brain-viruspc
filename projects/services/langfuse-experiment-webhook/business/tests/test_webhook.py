from __future__ import annotations

import hashlib
import hmac
import json
import os
import socket
import subprocess
import sys
import threading
import time
import unittest
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from langfuse_experiment_webhook.config import Config, load_config  # noqa: E402
from langfuse_experiment_webhook.jobs import Dependencies, Job, run_job  # noqa: E402
from langfuse_experiment_webhook.langfuse_api import fetch_dataset_summary  # noqa: E402
from langfuse_experiment_webhook.runner import post_runner, run_command  # noqa: E402
from langfuse_experiment_webhook.sanitize import sanitize  # noqa: E402
from langfuse_experiment_webhook.server import App, make_handler  # noqa: E402
from langfuse_experiment_webhook.signature import verify_langfuse_signature  # noqa: E402


SAMPLE = {
    "projectId": "proj_123",
    "datasetId": "ds_123",
    "datasetName": "sample-dataset",
    "payload": {"model": "none", "note": "dry-run"},
}


def make_config(**overrides: object) -> Config:
    values: dict[str, object] = {
        "host": "127.0.0.1",
        "port": 0,
        "dry_run": True,
        "webhook_secret": None,
        "signature_tolerance_seconds": 300,
        "langfuse_host": None,
        "langfuse_public_key": None,
        "langfuse_secret_key": None,
        "langfuse_api_timeout_seconds": 5,
        "runner_cmd": None,
        "runner_url": None,
        "runner_timeout_seconds": 5,
        "max_workers": 2,
    }
    values.update(overrides)
    return Config(**values)  # type: ignore[arg-type]


def sign(raw: bytes, secret: str, timestamp: int | None = None) -> str:
    issued = int(time.time()) if timestamp is None else timestamp
    message = f"{issued}.".encode("utf-8") + raw
    digest = hmac.new(secret.encode("utf-8"), message, hashlib.sha256).hexdigest()
    return f"t={issued},v1={digest}"


class Recording:
    def __init__(self) -> None:
        self.commands: list[dict[str, object]] = []
        self.posts: list[dict[str, object]] = []
        self.fetches: list[str] = []

    def fetch(self, config: Config, dataset_name: str) -> dict[str, object]:
        self.fetches.append(dataset_name)
        return {
            "id": "dataset-1",
            "name": dataset_name,
            "projectId": "proj_123",
            "itemCount": 2,
            "itemIdsSample": ["item-1"],
        }

    def command(self, config: Config, payload: dict[str, object]) -> dict[str, object]:
        self.commands.append(payload)
        return {"ran": True, "exitCode": 0}

    def post(self, config: Config, payload: dict[str, object]) -> dict[str, object]:
        self.posts.append(payload)
        return {"ran": True, "status": 202}

    def deps(self) -> Dependencies:
        return Dependencies(
            fetch_dataset=self.fetch,
            run_command=self.command,
            post_runner=self.post,
        )


class GateExecutor:
    def __init__(self) -> None:
        self.calls: list[tuple[object, tuple[object, ...]]] = []

    def submit(self, fn: object, *args: object) -> object:
        self.calls.append((fn, args))
        return None

    def shutdown(self, wait: bool = False, cancel_futures: bool = False) -> None:
        return None


class WebhookServer:
    def __init__(self, app: App) -> None:
        self.app = app
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), make_handler(app))
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.base = f"http://127.0.0.1:{self.server.server_address[1]}"

    def request(
        self,
        path: str,
        *,
        method: str = "GET",
        body: bytes | None = None,
        headers: dict[str, str] | None = None,
    ) -> tuple[int, dict[str, object]]:
        req = urllib.request.Request(
            self.base + path,
            data=body,
            headers=headers or {},
            method=method,
        )
        try:
            with urllib.request.urlopen(req, timeout=3) as response:
                return response.status, json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            return exc.code, json.loads(exc.read().decode("utf-8"))

    def close(self, *, wait_jobs: bool = False) -> None:
        if wait_jobs:
            self.app.executor.shutdown(wait=True, cancel_futures=False)
        self.server.shutdown()
        self.server.server_close()


class HttpTests(unittest.TestCase):
    def test_health_and_sample_post_dry_run(self) -> None:
        app = App(make_config())
        server = WebhookServer(app)
        try:
            status, body = server.request("/health")
            self.assertEqual(status, 200)
            self.assertEqual(body, {"status": "ok"})

            raw = json.dumps(SAMPLE).encode("utf-8")
            status, body = server.request(
                "/langfuse/experiment",
                method="POST",
                body=raw,
                headers={"Content-Type": "application/json"},
            )
            self.assertEqual(status, 202)
            self.assertEqual(body["accepted"], True)
            self.assertIsInstance(body["jobId"], str)
            self.assertTrue(body["jobId"])
        finally:
            server.close(wait_jobs=True)

    def test_accepts_before_job_runs(self) -> None:
        gate = GateExecutor()
        app = App(make_config(), executor=gate)
        server = WebhookServer(app)
        try:
            started = time.monotonic()
            status, body = server.request(
                "/langfuse/experiment/",
                method="POST",
                body=json.dumps(SAMPLE).encode("utf-8"),
                headers={"Content-Type": "application/json"},
            )
            elapsed = time.monotonic() - started
            self.assertEqual(status, 202)
            self.assertLess(elapsed, 1.0)
            self.assertEqual(len(gate.calls), 1)
            job = gate.calls[0][1][0]
            self.assertEqual(job.dataset_name, "sample-dataset")
            self.assertEqual(body["jobId"], job.job_id)
        finally:
            server.close()

    def test_signature_required_only_when_secret_set(self) -> None:
        secret = "lf-whsec_test"
        raw = b'{"projectId":"p","datasetId":"d","datasetName":"n","payload":{"x":1}}'
        app = App(make_config(webhook_secret=secret))
        server = WebhookServer(app)
        try:
            status, body = server.request(
                "/langfuse/experiment",
                method="POST",
                body=raw,
                headers={"Content-Type": "application/json"},
            )
            self.assertEqual(status, 401)
            self.assertEqual(body["error"], "invalid signature")

            status, _ = server.request(
                "/langfuse/experiment",
                method="POST",
                body=raw,
                headers={
                    "Content-Type": "application/json",
                    "x-langfuse-signature": "t=1,v1=deadbeef",
                },
            )
            self.assertEqual(status, 401)

            status, body = server.request(
                "/langfuse/experiment",
                method="POST",
                body=raw,
                headers={
                    "Content-Type": "application/json",
                    "x-langfuse-signature": sign(raw, secret),
                },
            )
            self.assertEqual(status, 202)
            self.assertEqual(body["accepted"], True)
        finally:
            server.close(wait_jobs=True)

    def test_rejects_bad_json_and_oversized_body(self) -> None:
        app = App(make_config(max_body_bytes=8))
        server = WebhookServer(app)
        try:
            status, body = server.request(
                "/langfuse/experiment",
                method="POST",
                body=b"{",
                headers={"Content-Type": "application/json"},
            )
            self.assertEqual(status, 400)
            self.assertEqual(body["error"], "invalid json")

            status, body = server.request(
                "/langfuse/experiment",
                method="POST",
                body=b'{"projectId":"p"}',
                headers={"Content-Type": "application/json"},
            )
            self.assertEqual(status, 413)

            status, _ = server.request("/missing")
            self.assertEqual(status, 404)
        finally:
            server.close()


class JobTests(unittest.TestCase):
    def test_dry_run_fetches_dataset_and_skips_runner(self) -> None:
        recording = Recording()
        cfg = make_config(
            dry_run=True,
            langfuse_host="https://langfuse.example",
            langfuse_public_key="pk-lf-test",
            langfuse_secret_key="sk-lf-test",
            runner_cmd="python runner.py",
            runner_url="https://runner.example/run",
        )
        result = run_job(
            Job("job-1", "proj_123", "ds_123", "sample-dataset", {"api_key": "sk-lf-secretvalue"}),
            cfg,
            recording.deps(),
        )
        self.assertEqual(recording.fetches, ["sample-dataset"])
        self.assertEqual(recording.commands, [])
        self.assertEqual(recording.posts, [])
        self.assertEqual(result["runner"], {"skipped": True, "reason": "dry_run"})
        self.assertEqual(result["dataset"]["itemCount"], 2)
        self.assertEqual(result["payload"]["api_key"], "<redacted>")

    def test_live_runner_gets_job_without_credentials(self) -> None:
        recording = Recording()
        cfg = make_config(
            dry_run=False,
            langfuse_host="https://langfuse.example",
            langfuse_public_key="pk-lf-test",
            langfuse_secret_key="sk-lf-test",
            runner_cmd="python runner.py",
            runner_url="https://runner.example/run",
        )
        payload = {"temperature": 0}
        run_job(Job("job-2", "proj_123", "ds_123", "sample-dataset", payload), cfg, recording.deps())
        self.assertEqual(len(recording.commands), 1)
        self.assertEqual(len(recording.posts), 1)
        outgoing = recording.commands[0]
        self.assertEqual(outgoing["payload"], payload)
        self.assertEqual(outgoing["dataset"]["itemCount"], 2)
        self.assertNotIn("sk-lf-test", json.dumps(outgoing))
        self.assertNotIn("LANGFUSE_SECRET_KEY", json.dumps(outgoing))

    def test_live_command_and_url_roundtrip(self) -> None:
        received: dict[str, object] = {}

        class Handler(BaseHTTPRequestHandler):
            def do_POST(self) -> None:
                length = int(self.headers.get("Content-Length", "0"))
                received["body"] = json.loads(self.rfile.read(length).decode("utf-8"))
                raw = b'{"ok":true}'
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(raw)))
                self.end_headers()
                self.wfile.write(raw)

            def log_message(self, fmt: str, *args: object) -> None:
                return None

        sink = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        thread = threading.Thread(target=sink.serve_forever, daemon=True)
        thread.start()
        url = f"http://127.0.0.1:{sink.server_address[1]}/run"
        out = Path(os.environ.get("TMPDIR", "/tmp")) / f"lf-experiment-job-{time.time_ns()}.json"
        try:
            command = (
                f"{sys.executable} -c "
                + json.dumps(
                    "import pathlib,sys; pathlib.Path(sys.argv[1]).write_bytes(sys.stdin.buffer.read())"
                )
                + f" {out}"
            )
            cfg = make_config(dry_run=False, runner_cmd=command, runner_url=url)
            payload = {"jobId": "job-3", "datasetName": "sample-dataset", "payload": {"n": 1}}
            command_result = run_command(cfg, payload)
            url_result = post_runner(cfg, payload)
            self.assertEqual(command_result["exitCode"], 0)
            self.assertEqual(json.loads(out.read_text(encoding="utf-8")), payload)
            self.assertEqual(url_result["status"], 200)
            self.assertEqual(received["body"], payload)
        finally:
            sink.shutdown()
            sink.server_close()
            out.unlink(missing_ok=True)


class LangfuseApiTests(unittest.TestCase):
    def test_lists_count_without_item_bodies(self) -> None:
        seen: list[tuple[str, str]] = []

        class Handler(BaseHTTPRequestHandler):
            def do_GET(self) -> None:
                seen.append((self.path, self.headers.get("Authorization", "")))
                if self.path.startswith("/api/public/v2/datasets/"):
                    body = {
                        "id": "dataset-1",
                        "name": "a/b",
                        "projectId": "proj_123",
                        "description": None,
                        "metadata": None,
                    }
                else:
                    body = {
                        "data": [
                            {
                                "id": "item-1",
                                "input": "do not keep this prompt",
                                "expectedOutput": "do not keep this output",
                            }
                        ],
                        "meta": {"page": 1, "limit": 1, "totalItems": 30, "totalPages": 30},
                    }
                raw = json.dumps(body).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(raw)))
                self.end_headers()
                self.wfile.write(raw)

            def log_message(self, fmt: str, *args: object) -> None:
                return None

        server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            cfg = make_config(
                langfuse_host=f"http://127.0.0.1:{server.server_address[1]}",
                langfuse_public_key="pk-lf-test",
                langfuse_secret_key="sk-lf-test",
            )
            summary = fetch_dataset_summary(cfg, "a/b")
            self.assertEqual(summary["itemCount"], 30)
            self.assertEqual(summary["itemIdsSample"], ["item-1"])
            encoded = json.dumps(summary)
            self.assertNotIn("do not keep", encoded)
            self.assertTrue(seen[0][0].startswith("/api/public/v2/datasets/a%2Fb"))
            self.assertTrue(seen[1][0].startswith("/api/public/dataset-items?"))
            self.assertIn("datasetName=a%2Fb", seen[1][0])
            self.assertIn("limit=1", seen[1][0])
            token = seen[0][1]
            self.assertTrue(token.startswith("Basic "))
            self.assertNotIn("sk-lf-test", token)
        finally:
            server.shutdown()
            server.server_close()


class UnitTests(unittest.TestCase):
    def test_signature_window_and_raw_body(self) -> None:
        raw = b'{"datasetName":"n"}'
        secret = "lf-whsec_test"
        now = 1_700_000_000
        header = sign(raw, secret, now)
        self.assertTrue(
            verify_langfuse_signature(raw, header, secret, 300, now=now + 10)
        )
        self.assertFalse(
            verify_langfuse_signature(raw, header, secret, 300, now=now + 301)
        )
        self.assertFalse(
            verify_langfuse_signature(raw + b" ", header, secret, 300, now=now)
        )
        self.assertFalse(verify_langfuse_signature(raw, None, secret, 300, now=now))

    def test_sanitize_redacts_secrets(self) -> None:
        cleaned = sanitize(
            {
                "api_key": "pk-lf-abcdefghijklmnopqrstuvwxyz",
                "note": "prefix sk-lf-abcdefghijklmnopqrstuvwxyz suffix",
                "nested": [{"token": "x"}] * 3,
            }
        )
        self.assertEqual(cleaned["api_key"], "<redacted>")
        self.assertNotIn("sk-lf-", cleaned["note"])
        self.assertEqual(cleaned["nested"][0]["token"], "<redacted>")

    def test_dry_run_defaults_on(self) -> None:
        previous = os.environ.get("DRY_RUN")
        os.environ.pop("DRY_RUN", None)
        try:
            self.assertTrue(load_config().dry_run)
            os.environ["DRY_RUN"] = "0"
            self.assertFalse(load_config().dry_run)
            os.environ["DRY_RUN"] = "1"
            self.assertTrue(load_config().dry_run)
        finally:
            if previous is None:
                os.environ.pop("DRY_RUN", None)
            else:
                os.environ["DRY_RUN"] = previous

    def test_module_accepts_sample_post(self) -> None:
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            port = sock.getsockname()[1]
        env = {
            "PATH": os.environ.get("PATH", ""),
            "HOST": "127.0.0.1",
            "PORT": str(port),
            "DRY_RUN": "1",
            "LOG_LEVEL": "INFO",
            "PYTHONUNBUFFERED": "1",
        }
        proc = subprocess.Popen(
            [sys.executable, "-m", "langfuse_experiment_webhook"],
            cwd=ROOT,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )
        lines: list[str] = []

        def _read() -> None:
            assert proc.stdout is not None
            for line in proc.stdout:
                lines.append(line)

        reader = threading.Thread(target=_read, daemon=True)
        reader.start()
        stdout = ""
        try:
            deadline = time.monotonic() + 5
            health = None
            while time.monotonic() < deadline:
                if proc.poll() is not None:
                    break
                try:
                    with urllib.request.urlopen(f"http://127.0.0.1:{port}/health", timeout=0.5) as response:
                        health = json.loads(response.read().decode("utf-8"))
                        break
                except (urllib.error.URLError, TimeoutError, ConnectionError):
                    time.sleep(0.05)
            self.assertEqual(health, {"status": "ok"})
            raw = json.dumps(SAMPLE).encode("utf-8")
            request = urllib.request.Request(
                f"http://127.0.0.1:{port}/langfuse/experiment",
                data=raw,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(request, timeout=3) as response:
                body = json.loads(response.read().decode("utf-8"))
                self.assertEqual(response.status, 202)
            self.assertEqual(body["accepted"], True)
            self.assertTrue(body["jobId"])
            deadline = time.monotonic() + 3
            while time.monotonic() < deadline and not any("job finished" in line for line in lines):
                time.sleep(0.05)
        finally:
            proc.terminate()
            proc.wait(timeout=5)
            reader.join(timeout=2)
            if proc.stdout is not None:
                proc.stdout.close()
            stdout = "".join(lines)
        self.assertIn("job finished", stdout)
        self.assertIn("sample-dataset", stdout)
        self.assertIn("dry_run", stdout)
        self.assertNotIn("sk-lf-", stdout)
        self.assertNotIn("lf-whsec_", stdout)


if __name__ == "__main__":
    unittest.main()
