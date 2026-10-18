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
    sandbox: str
    timeout_seconds: int


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
        clients[client_id] = Client(
            id=client_id,
            command=_required_str(body, "command", client_id),
            sandbox=_required_str(body, "sandbox", client_id),
            timeout_seconds=timeout,
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


def _required_str(body: dict[str, Any], key: str, where: str) -> str:
    value = body.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ConfigError(f"{where}.{key} must be a non-empty string")
    return value.strip()
