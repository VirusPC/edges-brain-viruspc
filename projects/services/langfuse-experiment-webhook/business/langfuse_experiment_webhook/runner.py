from __future__ import annotations

import json
import shlex
import subprocess
import urllib.error
import urllib.request
from typing import Any

from langfuse_experiment_webhook.config import Config
from langfuse_experiment_webhook.sanitize import sanitize


def run_command(config: Config, payload: dict[str, Any]) -> dict[str, Any]:
    """执行操作者配置的命令。命令来自环境变量，不从请求里取。"""
    if not config.runner_cmd:
        return {"ran": False, "reason": "unset"}
    argv = shlex.split(config.runner_cmd)
    if not argv:
        return {"ran": False, "reason": "empty"}
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    try:
        completed = subprocess.run(
            argv,
            input=body,
            capture_output=True,
            timeout=config.runner_timeout_seconds,
            check=False,
        )
    except subprocess.TimeoutExpired:
        return {"ran": True, "exitCode": None, "error": "timeout"}
    except OSError as exc:
        return {"ran": False, "error": type(exc).__name__}
    result: dict[str, Any] = {
        "ran": True,
        "exitCode": completed.returncode,
        "stdoutBytes": len(completed.stdout),
        "stderrBytes": len(completed.stderr),
    }
    if completed.returncode != 0 and completed.stderr:
        result["stderr"] = sanitize(completed.stderr.decode("utf-8", errors="replace")[:500])
    return result


def post_runner(config: Config, payload: dict[str, Any]) -> dict[str, Any]:
    """把 job JSON POST 到操作者配置的 URL。不跟随请求体里的地址。"""
    if not config.runner_url:
        return {"ran": False, "reason": "unset"}
    if not config.runner_url.startswith(("http://", "https://")):
        return {"ran": False, "reason": "unsupported_scheme"}
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(
        config.runner_url,
        data=body,
        headers={
            "Content-Type": "application/json; charset=utf-8",
            "User-Agent": "langfuse-experiment-webhook",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=config.runner_timeout_seconds) as response:
            response.read()
            status = response.status
    except urllib.error.HTTPError as exc:
        exc.read()
        exc.close()
        return {"ran": True, "status": exc.code}
    except urllib.error.URLError:
        return {"ran": False, "error": "URLError"}
    except TimeoutError:
        return {"ran": False, "error": "timeout"}
    return {"ran": True, "status": status}
