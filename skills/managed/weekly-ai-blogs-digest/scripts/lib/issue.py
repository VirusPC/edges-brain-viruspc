"""读一期目录、套 schema、按 gaps.json 判断必需文件。"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any

from lib.jsonschema import validate

SKILL_ROOT = Path(__file__).resolve().parents[2]
DATE = re.compile(r"\d{4}-\d{2}-\d{2}")
SUMMARY_RULES_SINCE = "0.0.11"


def schema_for(rel: str) -> dict:
    path = SKILL_ROOT / rel
    return json.loads(path.read_text(encoding="utf-8"))


def read_json(path: Path) -> Any:
    raw = path.read_bytes()
    if not raw.strip():
        raise ValueError("空文件")
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise ValueError("不是 UTF-8") from exc
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        raise ValueError(f"JSON 无法解析: {exc}") from exc


def check_document(path: Path, display: str, schema_rel: str, *, reject_skipped: bool = False) -> tuple[list[str], Any | None]:
    try:
        data = read_json(path)
    except ValueError as exc:
        return [f"{display}: {exc}"], None
    if reject_skipped and isinstance(data, dict) and data.get("skipped") is True:
        return [f"{display}: skipped 不能当作已经准备好"], None
    errors = [f"{display}: {item}" for item in validate(data, schema_for(schema_rel))]
    if errors:
        return errors, None
    return [], data


def gaps_for_lane(issue: Path, stage: str) -> tuple[list[dict], list[str]]:
    """子步骤校验用。gaps.json 还没写就当作没有缺口。"""
    stage_dir = issue / stage
    if not (stage_dir / "gaps.json").is_file():
        return [], []
    return load_gaps(stage_dir, stage)


def print_result(errors: list[str], ok: str) -> int:
    if errors:
        for item in errors:
            print(item, file=sys.stderr)
        return 1
    print(ok)
    return 0


def load_gaps(stage_dir: Path, stage: str) -> tuple[list[dict], list[str]]:
    path = stage_dir / "gaps.json"
    display = f"{stage}/gaps.json"
    if not path.is_file():
        return [], [f"{display} 缺失"]
    errors, data = check_document(path, display, f"schemas/{stage}/gaps.schema.json")
    if errors or not isinstance(data, dict):
        return [], errors
    return list(data.get("gaps") or []), []


def gap_covers(gaps: list[dict], slot: str) -> bool:
    for gap in gaps:
        reason = str(gap.get("reason") or "").strip()
        if gap.get("path") == slot and reason:
            return True
    return False


def require_file(
    stage_dir: Path,
    stage: str,
    rel: str,
    schema_rel: str,
    gaps: list[dict],
    *,
    optional: bool = False,
    reject_skipped: bool = False,
) -> list[str]:
    path = stage_dir / rel
    display = f"{stage}/{rel}"
    if path.is_file():
        errors, _data = check_document(path, display, schema_rel, reject_skipped=reject_skipped)
        return errors
    if optional or gap_covers(gaps, rel):
        return []
    return [f"{display} 缺失，{stage}/gaps.json 里也没有 path 为 {rel} 的缺口"]


def require_pattern(
    stage_dir: Path,
    stage: str,
    pattern: str,
    slot: str,
    schema_rel: str,
    gaps: list[dict],
    *,
    reject_skipped: bool = False,
) -> list[str]:
    regex = re.compile(pattern)
    matches = sorted(
        path
        for path in stage_dir.rglob("*")
        if path.is_file() and regex.fullmatch(path.relative_to(stage_dir).as_posix())
    )
    if not matches:
        if gap_covers(gaps, slot):
            return []
        return [f"{stage}/{slot} 缺失，{stage}/gaps.json 里也没有 path 为 {slot} 的缺口"]
    errors: list[str] = []
    for path in matches:
        rel = path.relative_to(stage_dir).as_posix()
        found, _data = check_document(path, f"{stage}/{rel}", schema_rel, reject_skipped=reject_skipped)
        errors.extend(found)
    return errors


def require_board_dir(
    stage_dir: Path,
    stage: str,
    rel_dir: str,
    slot: str,
    schema_rel: str,
    gaps: list[dict],
) -> tuple[list[str], list[tuple[Path, dict]]]:
    directory = stage_dir / rel_dir
    display = f"{stage}/{rel_dir}"
    if not directory.exists():
        if gap_covers(gaps, slot):
            return [], []
        return [f"{display} 缺失，{stage}/gaps.json 里也没有 path 为 {slot} 的缺口"], []
    if not directory.is_dir():
        return [f"{display} 不是目录"], []
    files = sorted(directory.glob("*.json"))
    if not files:
        if gap_covers(gaps, slot):
            return [], []
        return [f"{display} 没有文件，{stage}/gaps.json 里也没有 path 为 {slot} 的缺口"], []
    errors: list[str] = []
    loaded: list[tuple[Path, dict]] = []
    for path in files:
        rel = path.relative_to(stage_dir).as_posix()
        found, data = check_document(path, f"{stage}/{rel}", schema_rel)
        errors.extend(found)
        if isinstance(data, dict):
            loaded.append((path, data))
    return errors, loaded


def parse_version(value: str | None) -> tuple[int, int, int] | None:
    if not isinstance(value, str):
        return None
    match = re.fullmatch(r"(\d+)\.(\d+)\.(\d+)", value.strip())
    if not match:
        return None
    return tuple(int(part) for part in match.groups())


def stage_version(issue: Path, stage: str) -> str | None:
    path = issue / stage / "stage.json"
    if not path.is_file():
        return None
    try:
        data = read_json(path)
    except ValueError:
        return None
    version = data.get("version") if isinstance(data, dict) else None
    return version if isinstance(version, str) else None


def version_reached(recorded: str | None, minimum: str) -> bool:
    """没有记录版本时按现行规则。有记录时，只有达到 minimum 才启用此后新增的规则。"""
    got = parse_version(recorded)
    need = parse_version(minimum)
    if got is None or need is None:
        return True
    return got >= need


def summary_version(issue: Path) -> str | None:
    """Read the version that governs summary rules; only fall back if index is absent."""
    index = issue / "summary" / "index.json"
    if index.is_file():
        try:
            data = read_json(index)
        except ValueError:
            return None
        skill = data.get("skill") if isinstance(data, dict) else None
        version = skill.get("version") if isinstance(skill, dict) else None
        return version if isinstance(version, str) else None
    return stage_version(issue, "summary")


def check_stage_file(issue: Path, stage: str) -> list[str]:
    path = issue / stage / "stage.json"
    display = f"{stage}/stage.json"
    if not path.is_file():
        return [f"{display} 缺失"]
    errors, _data = check_document(path, display, f"schemas/{stage}/stage.schema.json")
    return errors


def source_file(issue: Path, source: str) -> tuple[Path | None, str | None]:
    if not isinstance(source, str) or not source.strip():
        return None, "source 为空"
    raw = source.split("#", 1)[0]
    if not raw or raw.startswith("/") or "\\" in raw:
        return None, "source 必须是期次内的相对路径"
    parts = Path(raw).parts
    if ".." in parts:
        return None, "source 不能跳出期次目录"
    path = (issue / raw).resolve()
    try:
        path.relative_to(issue.resolve())
    except ValueError:
        return None, "source 不能跳出期次目录"
    if not path.is_file():
        return None, f"source 指向的文件不存在: {raw}"
    return path, None


def item_files(directory: Path) -> list[Path]:
    if not directory.is_dir():
        return []
    return sorted(path for path in directory.glob("*.json") if path.name != "index.json")


def align_index(
    issue: Path,
    stage: str,
    lane: str,
    index_schema: str,
    item_schema: str,
    gaps: list[dict],
    *,
    source_prefix: str,
    id_pattern: str | None = None,
    name_is_id: bool = False,
) -> tuple[list[str], dict[str, dict]]:
    stage_dir = issue / stage
    index_rel = f"{lane}/index.json"
    index_path = stage_dir / index_rel
    files = item_files(stage_dir / lane)
    if not index_path.is_file():
        if gap_covers(gaps, index_rel):
            if files:
                return [f"{stage}/{index_rel} 已记缺口，但 {lane} 里还有条目文件"], {}
            return [], {}
        return [f"{stage}/{index_rel} 缺失，{stage}/gaps.json 里也没有 path 为 {index_rel} 的缺口"], {}

    errors, index = check_document(index_path, f"{stage}/{index_rel}", index_schema)
    if errors or not isinstance(index, dict):
        return errors, {}

    found: dict[str, dict] = {}
    owners: dict[str, str] = {}
    for path in files:
        rel = path.relative_to(issue).as_posix()
        item_errors, data = check_document(path, rel, item_schema)
        errors.extend(item_errors)
        if not isinstance(data, dict):
            continue
        item_id = data.get("id")
        if not isinstance(item_id, str):
            continue
        if item_id in found:
            errors.append(f"{rel} 与 {owners[item_id]} 使用了同一个 ID {item_id}")
            continue
        found[item_id] = data
        owners[item_id] = rel
        if name_is_id and data.get("name") != item_id:
            errors.append(f"{rel} 的 id 必须等于官方名")
        if id_pattern and re.fullmatch(id_pattern, item_id) is None:
            errors.append(f"{rel} 的 id 不符合 {id_pattern}")
        errors.extend(_source_prefix(issue, rel, data.get("source"), source_prefix))

    listed = set(index.get("ids") or [])
    have = set(found)
    for missing in sorted(listed - have):
        errors.append(f"{stage}/{index_rel} 列出了 {missing}，没有对应条目文件")
    for extra in sorted(have - listed):
        errors.append(f"{owners[extra]} 的 ID {extra} 不在 {stage}/{index_rel}")
    return errors, found


def collect_items(
    issue: Path,
    stage: str,
    lane: str,
    schema_rel: str,
    *,
    source_prefix: str,
    id_pattern: str | None = None,
    source_id: bool = False,
) -> tuple[list[str], dict[str, dict]]:
    directory = issue / stage / lane
    if not directory.is_dir():
        return [f"{stage}/{lane} 缺失"], {}
    errors: list[str] = []
    found: dict[str, dict] = {}
    owners: dict[str, str] = {}
    for path in item_files(directory):
        rel = path.relative_to(issue).as_posix()
        item_errors, data = check_document(path, rel, schema_rel)
        errors.extend(item_errors)
        if not isinstance(data, dict) or not isinstance(data.get("id"), str):
            continue
        item_id = data["id"]
        if item_id in found:
            errors.append(f"{rel} 与 {owners[item_id]} 使用了同一个 ID {item_id}")
            continue
        found[item_id] = data
        owners[item_id] = rel
        if id_pattern and re.fullmatch(id_pattern, item_id) is None:
            errors.append(f"{rel} 的 id 不符合 {id_pattern}")
        if source_id:
            errors.extend(_source_same_id(issue, rel, data.get("source"), item_id, source_prefix))
        else:
            errors.extend(_source_prefix(issue, rel, data.get("source"), source_prefix))
    return errors, found


def _source_prefix(issue: Path, rel: str, source: Any, prefix: str) -> list[str]:
    if not isinstance(source, str):
        return [f"{rel}: source 为空"]
    _path, error = source_file(issue, source)
    if error:
        return [f"{rel}: {error}"]
    if not source.split("#", 1)[0].startswith(prefix):
        return [f"{rel} 的 source 必须回指 {prefix}"]
    return []


def _source_same_id(issue: Path, rel: str, source: Any, item_id: str, prefix: str) -> list[str]:
    if not isinstance(source, str):
        return [f"{rel}: source 为空"]
    path, error = source_file(issue, source)
    if error:
        return [f"{rel}: {error}"]
    raw = source.split("#", 1)[0]
    if not raw.startswith(prefix):
        return [f"{rel} 的 source 必须回指 {prefix}"]
    try:
        upstream = read_json(path)
    except ValueError as exc:
        return [f"{rel}: {exc}"]
    if not isinstance(upstream, dict) or upstream.get("id") != item_id:
        return [f"{rel} 的 source 对不上上一阶段里 ID 为 {item_id} 的条目"]
    return []
