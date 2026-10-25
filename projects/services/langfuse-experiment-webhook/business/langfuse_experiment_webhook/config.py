from __future__ import annotations

import os
from dataclasses import dataclass


_LIVE_DRY_RUN = {"0", "false", "no", "off"}


def _raw(name: str) -> str | None:
    value = os.environ.get(name)
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def _int(name: str, default: int, minimum: int) -> int:
    raw = _raw(name)
    if raw is None:
        return default
    try:
        parsed = int(raw)
    except ValueError:
        return default
    return parsed if parsed >= minimum else default


def dry_run_enabled() -> bool:
    """未设置、空、以及除 0/false/no/off 以外的值都保持 dry-run。"""
    raw = os.environ.get("DRY_RUN")
    if raw is None or raw.strip() == "":
        return True
    return raw.strip().lower() not in _LIVE_DRY_RUN


@dataclass(frozen=True)
class Config:
    host: str
    port: int
    dry_run: bool
    webhook_secret: str | None
    signature_tolerance_seconds: int
    langfuse_host: str | None
    langfuse_public_key: str | None
    langfuse_secret_key: str | None
    langfuse_api_timeout_seconds: int
    runner_cmd: str | None
    runner_url: str | None
    runner_timeout_seconds: int
    max_workers: int
    max_body_bytes: int = 1_048_576

    @property
    def langfuse_configured(self) -> bool:
        return bool(self.langfuse_host and self.langfuse_public_key and self.langfuse_secret_key)

    def public_summary(self) -> dict[str, str | bool | int]:
        runner = "none"
        if self.runner_cmd and self.runner_url:
            runner = "cmd+url"
        elif self.runner_cmd:
            runner = "cmd"
        elif self.runner_url:
            runner = "url"
        return {
            "dryRun": self.dry_run,
            "signatureVerification": self.webhook_secret is not None,
            "langfuseApi": self.langfuse_configured,
            "runner": runner,
            "port": self.port,
        }


def load_config() -> Config:
    return Config(
        host=_raw("HOST") or "0.0.0.0",
        port=_int("PORT", 8787, 0),
        dry_run=dry_run_enabled(),
        webhook_secret=_raw("LANGFUSE_WEBHOOK_SECRET"),
        signature_tolerance_seconds=_int("LANGFUSE_WEBHOOK_TOLERANCE_SECONDS", 300, 0),
        langfuse_host=_raw("LANGFUSE_HOST"),
        langfuse_public_key=_raw("LANGFUSE_PUBLIC_KEY"),
        langfuse_secret_key=_raw("LANGFUSE_SECRET_KEY"),
        langfuse_api_timeout_seconds=_int("LANGFUSE_API_TIMEOUT_SECONDS", 20, 1),
        runner_cmd=_raw("EXPERIMENT_RUNNER_CMD"),
        runner_url=_raw("EXPERIMENT_RUNNER_URL"),
        runner_timeout_seconds=_int("EXPERIMENT_RUNNER_TIMEOUT_SECONDS", 600, 1),
        max_workers=_int("WEBHOOK_MAX_WORKERS", 4, 1),
    )
