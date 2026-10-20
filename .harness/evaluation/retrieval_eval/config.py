"""Load the three registries and expand them into cells."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


EVAL_DIR = Path(__file__).resolve().parents[1]
DEFAULT_CONFIG = Path(__file__).resolve().parent / "config" / "config.json"


class ConfigError(ValueError):
    """The experiment config or a sample file is not usable."""


@dataclass(frozen=True)
class Repository:
    id: str
    url: str
    ref: str | None


@dataclass(frozen=True)
class Client:
    id: str
    command: str
    timeout_seconds: int
    sandbox: str | None = None
    kind: str = "codex"
    reasoning_summary: str | None = None
    reasoning_effort: str | None = None
    show_raw_reasoning: bool | None = None
    provider: str | None = None
    model: str | None = None
    thinking: str | None = None
    env: dict[str, str] | None = None

    def codex_config_overrides(self) -> list[str]:
        """`key=value` pairs for `codex exec -c`. Empty when reasoning is unset."""
        overrides: list[str] = []
        if self.reasoning_summary:
            overrides.append(f"model_reasoning_summary={self.reasoning_summary}")
        if self.show_raw_reasoning is not None:
            flag = "true" if self.show_raw_reasoning else "false"
            overrides.append(f"show_raw_agent_reasoning={flag}")
        if self.reasoning_effort:
            overrides.append(f"model_reasoning_effort={self.reasoning_effort}")
        return overrides

    def reasoning_metadata(self) -> dict[str, str]:
        """Root-span metadata for the trace exporter. Omitted keys were not set."""
        if self.kind == "pi":
            metadata: dict[str, str] = {}
            if self.provider:
                metadata["provider"] = self.provider
            if self.model:
                metadata["model"] = self.model
            if self.thinking:
                metadata["thinking"] = self.thinking
            return metadata
        metadata = {}
        if self.reasoning_summary:
            metadata["reasoning_summary"] = self.reasoning_summary
        if self.reasoning_effort:
            metadata["reasoning_effort"] = self.reasoning_effort
        if self.show_raw_reasoning is not None:
            metadata["show_raw_reasoning"] = "true" if self.show_raw_reasoning else "false"
        return metadata

    def reasoning_record(self) -> dict[str, str | bool | None]:
        if self.kind == "pi":
            return {
                "provider": self.provider,
                "model": self.model,
                "thinking": self.thinking,
            }
        return {
            "summary": self.reasoning_summary,
            "effort": self.reasoning_effort,
            "show_raw": self.show_raw_reasoning,
        }


@dataclass(frozen=True)
class Cell:
    repository: Repository
    client: Client
    sample_id: str
    sample_path: Path

    @property
    def cell_id(self) -> str:
        sample_key = self.sample_id.replace("/", "_")
        return f"{self.repository.id}__{self.client.id}__{sample_key}"


def load_cells(config_path: Path | None = None) -> list[Cell]:
    """Expand config blocks into repository × client × sample cells."""
    path = config_path or DEFAULT_CONFIG
    config_dir = path.parent
    blocks = _read_json(path)
    if not isinstance(blocks, list) or not blocks:
        raise ConfigError(f"{path} must be a non-empty list of blocks")

    repositories = _load_repositories(config_dir / "repositories.json")
    clients = _load_clients(config_dir / "clients.json")
    cells: list[Cell] = []
    seen: set[str] = set()
    for index, block in enumerate(blocks):
        if not isinstance(block, dict):
            raise ConfigError(f"block {index} must be an object")
        for repo_id in _id_list(block, "repositories", index):
            for client_id in _id_list(block, "clients", index):
                for sample_id in _id_list(block, "samples", index):
                    cell = Cell(
                        repository=repositories[repo_id],
                        client=clients[client_id],
                        sample_id=sample_id,
                        sample_path=_sample_path(sample_id),
                    )
                    if cell.cell_id in seen:
                        raise ConfigError(f"duplicate cell {cell.cell_id}")
                    seen.add(cell.cell_id)
                    cells.append(cell)
    return cells


def override_cells(
    cells: list[Cell],
    *,
    client_ids: list[str] | None = None,
    sample_ids: list[str] | None = None,
    config_dir: Path | None = None,
) -> list[Cell]:
    """Replace the client and/or sample set on each cell. Other dimensions stay."""
    if not client_ids and not sample_ids:
        return list(cells)
    directory = config_dir or DEFAULT_CONFIG.parent
    chosen: list[Client] | None = None
    if client_ids:
        registry = _load_clients(directory / "clients.json")
        missing = [client_id for client_id in client_ids if client_id not in registry]
        if missing:
            known = ", ".join(sorted(registry))
            raise ConfigError(f"unknown client {missing[0]}; known clients: {known}")
        chosen = [registry[client_id] for client_id in client_ids]
    out: list[Cell] = []
    seen: set[str] = set()
    for cell in cells:
        for client in chosen or [cell.client]:
            for sample_id in sample_ids or [cell.sample_id]:
                updated = Cell(
                    repository=cell.repository,
                    client=client,
                    sample_id=sample_id,
                    sample_path=_sample_path(sample_id),
                )
                if updated.cell_id in seen:
                    raise ConfigError(f"duplicate cell {updated.cell_id}")
                seen.add(updated.cell_id)
                out.append(updated)
    if not out:
        raise ConfigError("no cells")
    return out


def load_samples(path: Path) -> list[dict[str, Any]]:
    """Read one sample file. Ground truth stays on the sample for scoring."""
    data = _read_json(path)
    if not isinstance(data, dict):
        raise ConfigError(f"{path} must be an object")
    samples = data.get("samples")
    if not isinstance(samples, list) or not samples:
        raise ConfigError(f"{path} needs a non-empty samples array")
    out: list[dict[str, Any]] = []
    seen: set[str] = set()
    for index, sample in enumerate(samples):
        where = f"{path} samples[{index}]"
        if not isinstance(sample, dict):
            raise ConfigError(f"{where} must be an object")
        sample_id = _required_str(sample, "id", where)
        prompt = _required_str(sample, "prompt", where)
        if "ground_truth" not in sample or not isinstance(sample["ground_truth"], list):
            raise ConfigError(f"{where}.ground_truth must be an array")
        if sample_id in seen:
            raise ConfigError(f"duplicate sample id {sample_id}")
        seen.add(sample_id)
        out.append(
            {
                "id": sample_id,
                "prompt": prompt,
                "ground_truth": sample["ground_truth"],
            }
        )
    return out


def _load_repositories(path: Path) -> dict[str, Repository]:
    raw = _read_object(path)
    repos: dict[str, Repository] = {}
    for repo_id, body in raw.items():
        if not isinstance(body, dict):
            raise ConfigError(f"{path} entry {repo_id} must be an object")
        url = _required_str(body, "url", repo_id)
        if "://" not in url and not url.startswith("git@"):
            raise ConfigError(f"{repo_id}.url must be a remote git URL")
        ref = body.get("ref")
        if ref is not None and (not isinstance(ref, str) or not ref.strip()):
            raise ConfigError(f"{repo_id}.ref must be a non-empty string when set")
        repos[repo_id] = Repository(
            id=repo_id,
            url=url,
            ref=ref.strip() if isinstance(ref, str) else None,
        )
    return repos


def _load_clients(path: Path) -> dict[str, Client]:
    raw = _read_object(path)
    clients: dict[str, Client] = {}
    for client_id, body in raw.items():
        if not isinstance(body, dict):
            raise ConfigError(f"{path} entry {client_id} must be an object")
        timeout = body.get("timeout_seconds", 600)
        if not isinstance(timeout, int) or timeout <= 0:
            raise ConfigError(f"{client_id}.timeout_seconds must be a positive integer")
        kind = body.get("kind", "codex")
        if kind not in {"codex", "pi"}:
            raise ConfigError(f"{client_id}.kind must be codex or pi")
        sandbox = _required_str(body, "sandbox", client_id) if kind == "codex" else None
        provider = _optional_token(body, "provider", client_id)
        model = _optional_token(body, "model", client_id)
        thinking = _optional_token(body, "thinking", client_id)
        if kind == "pi" and not all((provider, model, thinking)):
            raise ConfigError(f"{client_id} requires provider, model, and thinking")
        clients[client_id] = Client(
            id=client_id,
            command=_required_str(body, "command", client_id),
            timeout_seconds=timeout,
            sandbox=sandbox,
            kind=kind,
            reasoning_summary=_optional_token(body, "reasoning_summary", client_id),
            reasoning_effort=_optional_token(body, "reasoning_effort", client_id),
            show_raw_reasoning=_optional_bool(body, "show_raw_reasoning", client_id),
            provider=provider,
            model=model,
            thinking=thinking,
            env=_optional_env(body, client_id),
        )
    return clients


def _sample_path(sample_id: str) -> Path:
    if not sample_id or sample_id.startswith("/") or ".." in Path(sample_id).parts:
        raise ConfigError(f"invalid sample id {sample_id!r}")
    path = EVAL_DIR / "cases" / f"{sample_id}.json"
    if not path.is_file():
        raise ConfigError(f"sample file not found: {path}")
    return path


def _id_list(block: dict[str, Any], key: str, index: int) -> list[str]:
    value = block.get(key)
    if not isinstance(value, list) or not value or not all(isinstance(x, str) and x for x in value):
        raise ConfigError(f"block {index}.{key} must be a non-empty list of ids")
    return list(value)


def _read_object(path: Path) -> dict[str, Any]:
    data = _read_json(path)
    if not isinstance(data, dict) or not data:
        raise ConfigError(f"{path} must be a non-empty object")
    return data


def _read_json(path: Path) -> Any:
    if not path.is_file():
        raise ConfigError(f"file not found: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def _optional_env(body: dict[str, Any], where: str) -> dict[str, str] | None:
    """Keep `$NAME` references. Do not read or store the process environment."""
    if "env" not in body or body["env"] is None:
        return None
    raw = body["env"]
    if not isinstance(raw, dict) or not raw:
        raise ConfigError(f"{where}.env must be a non-empty object")
    env: dict[str, str] = {}
    for key, value in raw.items():
        if not isinstance(key, str) or not key.isidentifier():
            raise ConfigError(f"{where}.env keys must be identifiers")
        if not isinstance(value, str) or not value:
            raise ConfigError(f"{where}.env.{key} must be a non-empty string")
        if any(char.isspace() for char in value):
            raise ConfigError(f"{where}.env.{key} must not contain whitespace")
        if value.startswith("$") and not value[1:].isidentifier():
            raise ConfigError(f"{where}.env.{key} reference must be $NAME")
        env[key] = value
    return env


def _optional_token(body: dict[str, Any], key: str, where: str) -> str | None:
    if key not in body or body[key] is None:
        return None
    value = body[key]
    if not isinstance(value, str) or not value.strip():
        raise ConfigError(f"{where}.{key} must be a non-empty string")
    token = value.strip()
    if "=" in token or any(char.isspace() for char in token):
        raise ConfigError(f"{where}.{key} must be a single token")
    return token


def _optional_bool(body: dict[str, Any], key: str, where: str) -> bool | None:
    if key not in body or body[key] is None:
        return None
    value = body[key]
    if not isinstance(value, bool):
        raise ConfigError(f"{where}.{key} must be a boolean")
    return value


def _required_str(body: dict[str, Any], key: str, where: str) -> str:
    value = body.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ConfigError(f"{where}.{key} must be a non-empty string")
    return value.strip()
