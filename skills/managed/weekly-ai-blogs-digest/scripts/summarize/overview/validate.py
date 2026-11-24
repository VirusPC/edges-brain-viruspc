"""校验 summary/overview.json。Agent 撰写，这里只检查形状、引用和主线 tag。"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from lib.issue import parse_version, read_json, schema_for, version_reached  # noqa: E402
from lib.jsonschema import validate as validate_schema  # noqa: E402
from summarize.merge.write_index import skill_version  # noqa: E402

NO_MODEL = "本周无重要模型发布"
NO_MODEL_TAG = "无重要发布"
TAG_SINCE = "0.0.9"
THEME_TAG_WEIGHT = 5
MAX_CHARS = 280
SHORT_CHARS = 120
SKIP_FILES = {"overview.json", "keywords.json", "index.json", "stage.json", "gaps.json"}
_MODEL_LETTERS = re.compile(r"[A-Za-z]")
_MODEL_DIGITS = re.compile(r"\d")


def validate(issue: Path) -> tuple[list[str], list[str]]:
    issue = Path(issue)
    path = issue / "summary" / "overview.json"
    if not path.is_file():
        return ["summary/overview.json 缺失"], []
    try:
        data = read_json(path)
    except ValueError as exc:
        return [f"summary/overview.json: {exc}"], []
    schema_errors = [
        f"summary/overview.json: {item}"
        for item in validate_schema(data, schema_for("schemas/summary/overview.schema.json"))
    ]
    if not isinstance(data, dict):
        return schema_errors or ["summary/overview.json 不是 object"], []
    errors = list(schema_errors)
    warnings: list[str] = []
    themes = data.get("themes")
    if not isinstance(themes, list):
        return errors, warnings
    if not 3 <= len(themes) <= 5:
        errors.append("summary/overview.json 不是 3 到 5 条")
    skill = data.get("skill") if isinstance(data.get("skill"), dict) else {}
    recorded = skill.get("version") if isinstance(skill.get("version"), str) else None
    errors.extend(_version_errors(recorded))
    tag_rules = version_reached(recorded, TAG_SINCE)
    names = _collect_names(issue) if tag_rules else {"articles": set(), "projects": set(), "models": set()}
    seen_tags: set[str] = set()
    known = _known_ids(issue)
    model_ids = _model_card_ids(issue)
    texts: list[str] = []
    for index, theme in enumerate(themes, start=1):
        if not isinstance(theme, dict):
            continue
        kind = theme.get("kind")
        text = theme.get("text") if isinstance(theme.get("text"), str) else ""
        refs = theme.get("refs") if isinstance(theme.get("refs"), list) else []
        texts.append(text)
        if index == 1 and kind != "model":
            errors.append("summary/overview.json 首条 kind 不是 model")
        if index != 1 and kind == "model":
            errors.append("summary/overview.json 首条之外还有 kind=model")
        if isinstance(theme.get("text"), str) and len(text) > MAX_CHARS:
            errors.append(f"summary/overview.json 第 {index} 条超过 {MAX_CHARS} 字")
        if text and text != NO_MODEL and len(text) < SHORT_CHARS:
            warnings.append(f"警告: summary/overview.json 第 {index} 条少于 {SHORT_CHARS} 字")
        if index == 1 and text == NO_MODEL and model_ids:
            errors.append("summary/overview.json 本期有模型卡片，但首条写成「本周无重要模型发布」")
        if text != NO_MODEL and not refs:
            errors.append(f"summary/overview.json 第 {index} 条 refs 为空")
        for ref in refs:
            if not isinstance(ref, dict):
                continue
            ref_id = ref.get("id")
            label = ref.get("label") if isinstance(ref.get("label"), str) else ""
            if isinstance(ref_id, str) and ref_id not in known:
                errors.append(f"summary/overview.json 第 {index} 条引用的 ID 不在本期 summary 里: {ref_id}")
            if label and text.count(label) == 0:
                errors.append(f"summary/overview.json 第 {index} 条的 label「{label}」在正文里找不到")
            elif label and text.count(label) > 1:
                warnings.append(
                    f"警告: summary/overview.json 第 {index} 条的 label「{label}」在正文里出现多次，站点只链第一处"
                )
        if tag_rules:
            errors.extend(_tag_errors(index, theme, names, seen_tags))
    body = "\n".join(texts)
    article_ids = _lane_ids(issue, "articles")
    errors.extend(_category_coverage(themes, article_ids, _lane_ids(issue, "projects")))
    errors.extend(_article_cluster(themes, article_ids))
    for name in _theme_words(issue):
        if name not in body:
            warnings.append(f"警告: 关键词「{name}」的 theme 为 true，总结正文里没有出现")
    return errors, warnings


def _version_errors(recorded: str | None) -> list[str]:
    current = skill_version()
    got = parse_version(recorded)
    head = parse_version(current)
    if got is None or head is None:
        return ["summary/overview.json 的 skill.version 不是 semver"]
    if got > head:
        return [f"summary/overview.json 的 skill.version {recorded} 新于当前 skill {current}"]
    return []


def _tag_errors(index: int, theme: dict, names: dict[str, set[str]], seen: set[str]) -> list[str]:
    errors: list[str] = []
    prefix = f"summary/overview.json 第 {index} 条"
    if "tag" not in theme:
        return [f"{prefix}缺少 tag"]
    raw = theme.get("tag")
    if not isinstance(raw, str):
        return errors
    if raw != raw.strip() or any(char in raw for char in "\n\r\t"):
        return [f"{prefix}的 tag 不能有首尾空白或换行"]
    if not raw:
        return [f"{prefix}的 tag 为空"]
    norm = _norm(raw)
    if norm in seen:
        errors.append(f"{prefix}的 tag「{raw}」与另一条主线重复")
    else:
        seen.add(norm)
    text = theme.get("text") if isinstance(theme.get("text"), str) else ""
    refs = theme.get("refs") if isinstance(theme.get("refs"), list) else []
    if text == NO_MODEL:
        if raw != NO_MODEL_TAG:
            errors.append(f"{prefix}的 tag 必须是「{NO_MODEL_TAG}」")
        return errors
    if theme.get("kind") == "model":
        if _looks_like_model_name(raw, refs, names["models"]):
            errors.append(f"{prefix}的 tag 不得是型号名")
        return errors
    if _looks_like_item_name(raw, refs, names):
        errors.append(f"{prefix}的 tag 不得是单篇文章或单个项目、产品名")
    return errors


def _looks_like_model_name(tag: str, refs: list, model_names: set[str]) -> bool:
    norm = _norm(tag)
    if norm in model_names:
        return True
    if _ref_matches(norm, refs):
        return True
    return _MODEL_LETTERS.search(tag) is not None and _MODEL_DIGITS.search(tag) is not None


def _looks_like_item_name(tag: str, refs: list, names: dict[str, set[str]]) -> bool:
    norm = _norm(tag)
    if norm in names["articles"] or norm in names["projects"] or norm in names["models"]:
        return True
    return _ref_matches(norm, refs)


def _ref_matches(norm: str, refs: list) -> bool:
    if not norm:
        return False
    for ref in refs:
        if not isinstance(ref, dict):
            continue
        for key in ("id", "label"):
            value = ref.get(key)
            if isinstance(value, str) and _norm(value) == norm:
                return True
    return False


def _norm(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip()).casefold()


def _cited_ids(theme: dict) -> list[str]:
    found: list[str] = []
    for ref in theme.get("refs") or []:
        if isinstance(ref, dict) and isinstance(ref.get("id"), str):
            found.append(ref["id"])
    return found


def _article_cluster(themes: list, article_ids: set[str]) -> list[str]:
    errors: list[str] = []
    if themes and isinstance(themes[0], dict):
        if any(ref_id in article_ids for ref_id in _cited_ids(themes[0])):
            errors.append("summary/overview.json 首条引用了文章")
    if len(article_ids) < 3:
        return errors
    best = 0
    for theme in themes:
        if not isinstance(theme, dict) or theme.get("kind") != "other":
            continue
        count = len({ref_id for ref_id in _cited_ids(theme) if ref_id in article_ids})
        best = max(best, count)
    if best < 3:
        errors.append("summary/overview.json 有至少 3 篇精选文章，但没有一条 other 主线引用不少于 3 篇文章")
    return errors


def _category_coverage(themes: list, article_ids: set[str], project_ids: set[str]) -> list[str]:
    if not article_ids or not project_ids:
        return []
    cited: set[str] = set()
    for theme in themes:
        if not isinstance(theme, dict):
            continue
        for ref in theme.get("refs") or []:
            if isinstance(ref, dict) and isinstance(ref.get("id"), str):
                cited.add(ref["id"])
    errors = []
    if cited.isdisjoint(project_ids):
        errors.append("summary/overview.json 有精选项目，但主线没有引用项目")
    if cited.isdisjoint(article_ids):
        errors.append("summary/overview.json 有精选文章，但主线没有引用文章")
    return errors


def _lane_ids(issue: Path, lane: str) -> set[str]:
    found: set[str] = set()
    directory = issue / "summary" / lane
    if not directory.is_dir():
        return found
    for path in directory.glob("*.json"):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        if isinstance(data, dict) and isinstance(data.get("id"), str):
            found.add(data["id"])
    return found


def _known_ids(issue: Path) -> set[str]:
    found: set[str] = set()
    summary = issue / "summary"
    if not summary.is_dir():
        return found
    for path in summary.rglob("*.json"):
        if path.name in SKIP_FILES:
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        if isinstance(data, dict) and isinstance(data.get("id"), str):
            found.add(data["id"])
        items = data.get("items") if isinstance(data, dict) else None
        for item in items or []:
            if isinstance(item, dict) and isinstance(item.get("id"), str):
                found.add(item["id"])
    return found


def _model_card_ids(issue: Path) -> set[str]:
    found: set[str] = set()
    directory = issue / "summary" / "models"
    if not directory.is_dir():
        return found
    for path in directory.glob("*.json"):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        if isinstance(data, dict) and isinstance(data.get("id"), str):
            found.add(data["id"])
    return found


def _collect_names(issue: Path) -> dict[str, set[str]]:
    articles: set[str] = set()
    projects: set[str] = set()
    models: set[str] = set()
    for lane, bucket, keys in (
        ("articles", articles, ("id", "title")),
        ("projects", projects, ("id",)),
        ("models", models, ("id", "name", "title")),
    ):
        directory = issue / "summary" / lane
        if not directory.is_dir():
            continue
        for path in directory.glob("*.json"):
            data = _read_object(path)
            if data is None:
                continue
            for key in keys:
                value = data.get(key)
                if isinstance(value, str) and value.strip():
                    bucket.add(_norm(value))
            if lane == "projects" and isinstance(data.get("id"), str):
                base = data["id"].rstrip("/").rsplit("/", 1)[-1]
                if len(base) >= 2:
                    bucket.add(_norm(base))
    boards = issue / "summary" / "models" / "boards"
    if boards.is_dir():
        for path in boards.glob("*.json"):
            data = _read_object(path)
            if data is None:
                continue
            for item in data.get("items") or []:
                if not isinstance(item, dict):
                    continue
                for key in ("id", "name"):
                    value = item.get(key)
                    if isinstance(value, str) and value.strip():
                        models.add(_norm(value))
    return {"articles": articles, "projects": projects, "models": models}


def _read_object(path: Path) -> dict | None:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    return data if isinstance(data, dict) else None


def _theme_words(issue: Path) -> list[str]:
    path = issue / "summary" / "keywords.json"
    if not path.is_file():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []
    words = data.get("keywords") if isinstance(data, dict) else None
    names: list[str] = []
    for item in words or []:
        if isinstance(item, dict) and item.get("theme") is True and isinstance(item.get("name"), str):
            names.append(item["name"])
    return names


def main(argv: list[str]) -> int:
    if len(argv) != 1:
        print("用法: python3 scripts/summarize/overview/validate.py issues/<生成日>", file=sys.stderr)
        return 2
    errors, warnings = validate(Path(argv[0]))
    for item in warnings:
        print(item, file=sys.stderr)
    if errors:
        for item in errors:
            print(item, file=sys.stderr)
        return 1
    print("ok summary/overview")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
