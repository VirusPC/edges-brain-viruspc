"""Personal entry for the Langfuse experiment URL.

Signature checks, HTTP, and in-process dispatch live in the framework package
``experiment_webhook`` (VirusPC/edges ``packages/services/evaluation``).
This module finds that package and applies the bind defaults for this
deployment. The host ops entry is ``edges evaluation server``. Domain and
tunnel stay under ``ops/``.
"""

from __future__ import annotations

import logging
import os
import sys
from collections.abc import Mapping
from pathlib import Path


# Framework commit this wrap was written against (VirusPC/edges main).
PIN = "b054de961e580ae0c1ce478e3eb4065d22b958ca"

RETIRED = (
    "DRY_RUN",
    "EXPERIMENT_RUNNER_CMD",
    "EXPERIMENT_RUNNER_URL",
    "EXPERIMENT_RUNNER_TIMEOUT_SECONDS",
    "WEBHOOK_MAX_WORKERS",
    "LANGFUSE_API_TIMEOUT_SECONDS",
)

_PACKAGE = "experiment_webhook"
_REPORTS = Path(__file__).resolve().parent.parent / "reports"

UNAVAILABLE = f"""\
langfuse-experiment-webhook: 找不到框架包 experiment_webhook。

HTTP、签名和调度在 VirusPC/edges 的 packages/services/evaluation
（{PIN} 起）。本进程不再自带一套，也不会退回以前的 dry-run 服务器。

宿主上的运维入口是：
  edges config init
  edges evaluation server install
  edges evaluation server start

这条薄封装只在还要直接跑 python 时使用。设置下面其中一个：
  EDGES_ROOT=/path/to/edges
  EXPERIMENT_WEBHOOK_HOME=/path/to/edges/packages/services/evaluation

隧道和域名仍在 ops/。步骤在 ops/README.md。
"""


def _raw(source: Mapping[str, str], name: str) -> str | None:
    value = source.get(name)
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def package_root(path: Path) -> Path | None:
    """Return the directory that should go on ``sys.path``.

    Accepts either the service directory (parent of ``experiment_webhook``)
    or the package directory itself.
    """
    candidate = path.expanduser()
    if (candidate / _PACKAGE / "server.py").is_file():
        return candidate.resolve()
    if candidate.name == _PACKAGE and (candidate / "server.py").is_file():
        return candidate.parent.resolve()
    return None


def resolve_framework_home(environ: Mapping[str, str]) -> Path:
    """Locate the framework service. Explicit paths win over an import already on ``sys.path``."""
    explicit = _raw(environ, "EXPERIMENT_WEBHOOK_HOME")
    if explicit:
        root = package_root(Path(explicit))
        if root is None:
            raise SystemExit(
                "langfuse-experiment-webhook: EXPERIMENT_WEBHOOK_HOME 不是框架包目录 "
                f"({explicit})。它应包含 experiment_webhook/server.py。"
            )
        return root
    edges = _raw(environ, "EDGES_ROOT")
    if edges:
        root = package_root(Path(edges) / "packages" / "services" / "evaluation")
        if root is None:
            raise SystemExit(
                "langfuse-experiment-webhook: EDGES_ROOT 下没有 "
                f"packages/services/evaluation ({edges})。"
            )
        return root
    found = _importable_home()
    if found is not None:
        return found
    raise SystemExit(UNAVAILABLE)


def _importable_home() -> Path | None:
    try:
        import experiment_webhook
    except ImportError:
        return None
    file = getattr(experiment_webhook, "__file__", None)
    if not file:
        return None
    root = Path(file).resolve().parent.parent
    if (root / _PACKAGE / "server.py").is_file():
        return root
    return None


def apply_personal_defaults(environ: dict[str, str]) -> None:
    """Fill bind and report defaults only when the operator has not set them.

    The framework package listens on ``127.0.0.1:8791`` unless told otherwise.
    This deployment's tunnel ingress is ``127.0.0.1:8787``.
    """
    if _raw(environ, "EXPERIMENT_WEBHOOK_HOST") is None and _raw(environ, "HOST") is None:
        environ["HOST"] = "0.0.0.0"
    if _raw(environ, "EXPERIMENT_WEBHOOK_PORT") is None and _raw(environ, "PORT") is None:
        environ["PORT"] = "8787"
    if _raw(environ, "EXPERIMENT_WEBHOOK_REPORTS_DIR") is None:
        environ["EXPERIMENT_WEBHOOK_REPORTS_DIR"] = str(_REPORTS)


def retired_names(environ: Mapping[str, str]) -> tuple[str, ...]:
    """Names from the old in-tree server that this process no longer reads."""
    return tuple(name for name in RETIRED if _raw(environ, name))


def use_framework(home: Path) -> None:
    entry = str(home)
    if entry not in sys.path:
        sys.path.insert(0, entry)


def main() -> None:
    logging.basicConfig(
        level=getattr(logging, os.environ.get("LOG_LEVEL", "INFO").upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(message)s",
    )
    home = resolve_framework_home(os.environ)
    use_framework(home)
    apply_personal_defaults(os.environ)
    retired = retired_names(os.environ)
    if retired:
        logging.warning("ignored retired settings: %s", ",".join(retired))
    logging.info("framework home %s", home)
    try:
        from experiment_webhook.server import serve
    except ImportError as exc:
        raise SystemExit(
            "langfuse-experiment-webhook: 已定位框架目录但无法导入 "
            f"experiment_webhook.server ({home}): {exc}"
        ) from None
    serve()
