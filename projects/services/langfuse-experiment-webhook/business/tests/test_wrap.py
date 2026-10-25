from __future__ import annotations

import hashlib
import hmac
import json
import os
import socket
import subprocess
import sys
import time
import unittest
import urllib.error
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SERVICE = ROOT.parent
sys.path.insert(0, str(ROOT))

from langfuse_experiment_webhook import wrap  # noqa: E402


def _clean_env(**extra: str) -> dict[str, str]:
    env = {
        "PATH": os.environ.get("PATH", ""),
        "HOME": os.environ.get("HOME", "/tmp"),
        "LANG": os.environ.get("LANG", "C.UTF-8"),
        "PYTHONUNBUFFERED": "1",
        "LOG_LEVEL": "INFO",
    }
    env.update(extra)
    return env


def _write_fake(home: Path, marker: str) -> None:
    package = home / "experiment_webhook"
    package.mkdir(parents=True)
    (package / "__init__.py").write_text("", encoding="utf-8")
    (package / "server.py").write_text(
        "import os\n"
        "from pathlib import Path\n"
        f"MARKER = {marker!r}\n"
        "def serve(config=None):\n"
        "    Path(os.environ['WRAP_SENTINEL']).write_text(\n"
        "        MARKER + '|' + os.environ.get('HOST', '') + '|' + os.environ.get('PORT', '')\n"
        "        + '|' + os.environ.get('EXPERIMENT_WEBHOOK_REPORTS_DIR', ''),\n"
        "        encoding='utf-8',\n"
        "    )\n",
        encoding="utf-8",
    )


def _sign(raw: bytes, secret: str, timestamp: int | None = None) -> str:
    issued = int(time.time()) if timestamp is None else timestamp
    message = f"{issued}.".encode("utf-8") + raw
    digest = hmac.new(secret.encode("utf-8"), message, hashlib.sha256).hexdigest()
    return f"t={issued},v1={digest}"


def _ensure_framework() -> Path:
    cache = Path(os.environ.get("TMPDIR", "/tmp")) / f"edges-experiment-webhook-{wrap.PIN[:12]}"
    marker = (
        cache
        / "packages"
        / "services"
        / "evaluation"
        / "experiment_webhook"
        / "server.py"
    )
    if marker.is_file():
        return cache
    if cache.exists():
        subprocess.run(["rm", "-rf", str(cache)], check=True)
    subprocess.run(
        [
            "git",
            "clone",
            "--filter=blob:none",
            "--no-checkout",
            "https://github.com/VirusPC/edges.git",
            str(cache),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    subprocess.run(
        ["git", "-C", str(cache), "sparse-checkout", "init", "--cone"],
        check=True,
        capture_output=True,
        text=True,
    )
    subprocess.run(
        [
            "git",
            "-C",
            str(cache),
            "sparse-checkout",
            "set",
            "packages/services/evaluation",
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    subprocess.run(
        ["git", "-C", str(cache), "fetch", "--depth", "1", "origin", wrap.PIN],
        check=True,
        capture_output=True,
        text=True,
    )
    subprocess.run(
        ["git", "-C", str(cache), "checkout", "FETCH_HEAD"],
        check=True,
        capture_output=True,
        text=True,
    )
    if not marker.is_file():
        raise AssertionError(f"pinned framework package missing at {marker}")
    return cache


class ResolveTests(unittest.TestCase):
    def test_home_beats_edges_root_and_accepts_package_dir(self) -> None:
        import tempfile

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            edges = root / "edges"
            service = edges / "packages" / "services" / "evaluation"
            _write_fake(service, "edges")
            other = root / "other"
            _write_fake(other, "home")
            chosen = wrap.resolve_framework_home(
                {
                    "EDGES_ROOT": str(edges),
                    "EXPERIMENT_WEBHOOK_HOME": str(other / "experiment_webhook"),
                }
            )
            self.assertEqual(chosen, other.resolve())

    def test_edges_root(self) -> None:
        import tempfile

        with tempfile.TemporaryDirectory() as tmp:
            edges = Path(tmp) / "edges"
            service = edges / "packages" / "services" / "evaluation"
            _write_fake(service, "edges")
            chosen = wrap.resolve_framework_home({"EDGES_ROOT": str(edges)})
            self.assertEqual(chosen, service.resolve())

    def test_bad_explicit_path_does_not_fall_through(self) -> None:
        with self.assertRaises(SystemExit) as raised:
            wrap.resolve_framework_home(
                {"EXPERIMENT_WEBHOOK_HOME": "/tmp/does-not-exist-experiment-webhook"}
            )
        self.assertIn("EXPERIMENT_WEBHOOK_HOME", str(raised.exception))

    def test_defaults_only_when_unset(self) -> None:
        env = {"HOST": "127.0.0.1", "EXPERIMENT_WEBHOOK_PORT": "9000"}
        wrap.apply_personal_defaults(env)
        self.assertEqual(env["HOST"], "127.0.0.1")
        self.assertNotIn("PORT", env)
        self.assertTrue(env["EXPERIMENT_WEBHOOK_REPORTS_DIR"].endswith(f"{os.sep}business{os.sep}reports"))

        empty: dict[str, str] = {}
        wrap.apply_personal_defaults(empty)
        self.assertEqual(empty["HOST"], "0.0.0.0")
        self.assertEqual(empty["PORT"], "8787")

    def test_retired_names_omit_values(self) -> None:
        self.assertEqual(
            wrap.retired_names({"DRY_RUN": "super-secret", "PORT": "8787", "EXPERIMENT_RUNNER_URL": "  "}),
            ("DRY_RUN",),
        )


class ProcessTests(unittest.TestCase):
    def test_removed_modules_stay_removed(self) -> None:
        package = ROOT / "langfuse_experiment_webhook"
        for name in ("signature.py", "jobs.py", "runner.py", "langfuse_api.py", "sanitize.py", "config.py"):
            self.assertFalse((package / name).exists(), name)

    def test_missing_package_exits(self) -> None:
        proc = subprocess.run(
            [sys.executable, "-m", "langfuse_experiment_webhook"],
            cwd=ROOT,
            env=_clean_env(PYTHONPATH=str(ROOT)),
            capture_output=True,
            text=True,
            timeout=15,
        )
        self.assertEqual(proc.returncode, 1)
        self.assertIn("EDGES_ROOT", proc.stderr)
        self.assertIn(wrap.PIN, proc.stderr)
        self.assertNotIn("listening", proc.stderr)

    def test_main_delegates_and_keeps_bind(self) -> None:
        import tempfile

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            preferred = root / "preferred"
            other = root / "other"
            _write_fake(preferred, "preferred")
            _write_fake(other, "other")
            sentinel = root / "sentinel"
            proc = subprocess.run(
                [sys.executable, "-m", "langfuse_experiment_webhook"],
                cwd=ROOT,
                env=_clean_env(
                    PYTHONPATH=str(other),
                    EXPERIMENT_WEBHOOK_HOME=str(preferred),
                    WRAP_SENTINEL=str(sentinel),
                    DRY_RUN="super-secret",
                ),
                capture_output=True,
                text=True,
                timeout=15,
            )
            self.assertEqual(proc.returncode, 0, proc.stderr)
            text = sentinel.read_text(encoding="utf-8")
            self.assertTrue(text.startswith("preferred|0.0.0.0|8787|"), text)
            self.assertIn("ignored retired settings: DRY_RUN", proc.stderr)
            self.assertNotIn("super-secret", proc.stderr)

    def test_preset_bind_wins(self) -> None:
        import tempfile

        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            home = root / "fw"
            _write_fake(home, "fw")
            sentinel = root / "sentinel"
            proc = subprocess.run(
                [sys.executable, "-m", "langfuse_experiment_webhook"],
                cwd=ROOT,
                env=_clean_env(
                    EXPERIMENT_WEBHOOK_HOME=str(home),
                    WRAP_SENTINEL=str(sentinel),
                    HOST="127.0.0.1",
                    PORT="9001",
                    EXPERIMENT_WEBHOOK_REPORTS_DIR=str(root / "reports"),
                ),
                capture_output=True,
                text=True,
                timeout=15,
            )
            self.assertEqual(proc.returncode, 0, proc.stderr)
            self.assertEqual(
                sentinel.read_text(encoding="utf-8"),
                f"fw|127.0.0.1|9001|{root / 'reports'}",
            )


class FrameworkHttpTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.edges = _ensure_framework()

    def test_signed_post_uses_framework_http(self) -> None:
        import tempfile

        with tempfile.TemporaryDirectory() as tmp:
            reports = Path(tmp)
            with socket.socket() as sock:
                sock.bind(("127.0.0.1", 0))
                port = sock.getsockname()[1]
            secret = "lf-whsec_wrap_test"
            log_path = Path(tmp) / "proc.log"
            log_file = log_path.open("w", encoding="utf-8")
            proc = subprocess.Popen(
                [sys.executable, "-m", "langfuse_experiment_webhook"],
                cwd=ROOT,
                env=_clean_env(
                    EDGES_ROOT=str(self.edges),
                    HOST="127.0.0.1",
                    PORT=str(port),
                    LANGFUSE_WEBHOOK_SECRET=secret,
                    EXPERIMENT_WEBHOOK_REPORTS_DIR=str(reports),
                ),
                stdout=log_file,
                stderr=subprocess.STDOUT,
                text=True,
            )
            try:
                health = _wait_health(port, proc, log_path)
                self.assertEqual(health, {"ok": True})
                raw = json.dumps(
                    {
                        "projectId": "proj_wrap",
                        "datasetId": "ds_wrap",
                        "datasetName": "personal-wrap-smoke",
                        "payload": {"note": "thin-wrap"},
                    }
                ).encode("utf-8")
                status, body = _post(port, raw, {})
                self.assertEqual(status, 401)
                self.assertEqual(body["error"], "invalid signature")
                self.assertNotIn("jobId", body)

                status, body = _post(
                    port,
                    raw,
                    {"x-langfuse-signature": _sign(raw, secret)},
                )
                self.assertEqual(status, 202)
                self.assertEqual(body["accepted"], True)
                self.assertTrue(body["runId"])
                self.assertNotIn("jobId", body)
                self._wait_report(reports, "unknown_experiment")
            finally:
                proc.terminate()
                proc.wait(timeout=5)
                log_file.close()

    def _wait_report(self, reports: Path, error: str) -> None:
        deadline = time.monotonic() + 5
        while time.monotonic() < deadline:
            for path in reports.glob("*.json"):
                data = json.loads(path.read_text(encoding="utf-8"))
                if data.get("error") == error:
                    return
            time.sleep(0.05)
        found = [path.name for path in reports.glob("*")]
        self.fail(f"report {error} not written; found {found}")


class OpsContractTests(unittest.TestCase):
    def test_ingress_and_docker_pin(self) -> None:
        ingress = (SERVICE / "ops" / "cloudflared-ingress.yml").read_text(encoding="utf-8")
        self.assertIn("lf-experiment.viruspc.tech", ingress)
        self.assertIn("127.0.0.1:8787", ingress)
        dockerfile = (SERVICE / "ops" / "Dockerfile").read_text(encoding="utf-8")
        self.assertIn(wrap.PIN, dockerfile)
        unit = (SERVICE / "ops" / "langfuse-experiment-webhook.service").read_text(encoding="utf-8")
        exec_lines = [line for line in unit.splitlines() if line.startswith("ExecStart=")]
        self.assertEqual(
            exec_lines,
            ["ExecStart=/usr/bin/env edges evaluation server start --dev"],
        )
        self.assertIn("EnvironmentFile=-%h/.config/edges/edges.env", unit)


def _wait_health(
    port: int,
    proc: subprocess.Popen[str],
    log_path: Path,
) -> dict[str, object]:
    deadline = time.monotonic() + 8
    while time.monotonic() < deadline:
        if proc.poll() is not None:
            raise AssertionError(
                f"process exited {proc.returncode}: {log_path.read_text(encoding='utf-8')}"
            )
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{port}/health", timeout=0.5) as response:
                body = json.loads(response.read().decode("utf-8"))
                if isinstance(body, dict):
                    return body
                raise AssertionError(f"health body was not an object: {body!r}")
        except (urllib.error.URLError, TimeoutError, ConnectionError, json.JSONDecodeError):
            time.sleep(0.05)
    raise AssertionError(f"health did not come up: {log_path.read_text(encoding='utf-8')}")


def _post(port: int, raw: bytes, headers: dict[str, str]) -> tuple[int, dict[str, object]]:
    request = urllib.request.Request(
        f"http://127.0.0.1:{port}/langfuse/experiment",
        data=raw,
        headers={"Content-Type": "application/json", **headers},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=3) as response:
            return response.status, json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        return exc.code, json.loads(exc.read().decode("utf-8"))


if __name__ == "__main__":
    unittest.main()
