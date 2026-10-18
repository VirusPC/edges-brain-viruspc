"""Clone a remote repository into the eval cache and check out a ref."""

from __future__ import annotations

import subprocess
from pathlib import Path


class GitError(RuntimeError):
    """git clone or checkout failed."""


def sync_clone(url: str, ref: str | None, dest: Path) -> str:
    """Clone `url` into `dest` if needed, then detach at `ref` or the remote default.

    Returns the checked-out commit. `dest` is a cache directory, not a user checkout.
    Submodules are not cloned.
    """
    dest.parent.mkdir(parents=True, exist_ok=True)
    if not (dest / ".git").exists():
        _run(["git", "clone", "--no-recurse-submodules", url, str(dest)])
    if ref:
        _run(["git", "fetch", "--no-recurse-submodules", "origin", ref], cwd=dest)
        _run(["git", "checkout", "--detach", "FETCH_HEAD"], cwd=dest)
    else:
        _run(["git", "fetch", "--no-recurse-submodules", "origin"], cwd=dest)
        _run(["git", "checkout", "--detach", "origin/HEAD"], cwd=dest)
    return _run(["git", "rev-parse", "HEAD"], cwd=dest).strip()


def cache_dir(root: Path, repo_id: str, ref: str | None) -> Path:
    """Cache path for one repository id and ref. The ref segment is a filename."""
    label = "default" if not ref else ref.replace("/", "_")
    return root / repo_id / label


def _run(command: list[str], cwd: Path | None = None) -> str:
    result = subprocess.run(
        command,
        cwd=cwd,
        check=False,
        text=True,
        capture_output=True,
    )
    if result.returncode != 0:
        detail = (result.stderr or result.stdout or "").strip()
        raise GitError(f"{' '.join(command)} failed: {detail}")
    return result.stdout
