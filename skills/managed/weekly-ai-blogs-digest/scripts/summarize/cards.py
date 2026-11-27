"""文章和项目卡片的正文约定。源稿用「解决什么问题」，页面显示成「什么问题」。"""

from __future__ import annotations

import re
from html import unescape

from lib.issue import parse_version

LABELS = ("解决什么问题", "如何解决", "效果怎样", "洞察与启发", "相关工作")
DETAILS_CLASS_REQUIRED_AFTER = "0.0.11"


def details_class_problem(text: str, where: str, version: str | None) -> tuple[str | None, str | None]:
    """Return (error, warning) when a full-summary details block lacks its class."""
    for match in re.finditer(r"<details\b([^>]*)>([\s\S]*?)</details\s*>", str(text or ""), re.I):
        summary = re.search(r"<summary\b[^>]*>([\s\S]*?)</summary\s*>", match.group(2), re.I)
        if not summary or re.sub(r"\s+", " ", unescape(re.sub(r"<[^>]+>", " ", summary.group(1)))).strip() != "完整总结":
            continue
        classes = re.search(r"\bclass\s*=\s*(['\"])(.*?)\1", match.group(1), re.I)
        if classes and "article-more" in classes.group(2).split():
            continue
        problem = f"{where} 的完整总结 <details> 缺少 class=\"article-more\""
        got = parse_version(version)
        required_after = parse_version(DETAILS_CLASS_REQUIRED_AFTER)
        if got is not None and required_after is not None and got <= required_after:
            return None, f"warning: {problem}（记录版本 {version}，仅警告）"
        return problem, None
    return None, None


def card_problems(text: str, where: str) -> list[str]:
    if not isinstance(text, str) or not text.strip():
        return [f"{where} 缺少正文"]
    errors: list[str] = []
    bodies = _bodies(text)
    for label in LABELS:
        if label not in bodies:
            errors.append(f"{where} 缺少「{label}」")
        elif not bodies[label]:
            errors.append(f"{where} 的「{label}」是空的")
    intro = _intro(text)
    if not intro:
        errors.append(f"{where} 缺少导语")
    how = bodies.get("如何解决") or ""
    if intro and how and (intro == how or (len(how) >= 12 and how in intro)):
        errors.append(f"{where} 的导语重复了如何解决")
    return errors


def title_line_problems(text: str, stars, license_name, where: str) -> list[str]:
    line = next((item for item in str(text or "").splitlines() if item.startswith("####")), "")
    errors: list[str] = []
    cursor = line.find(")")
    if isinstance(stars, int):
        token = f"{stars} stars"
        at = line.find(token)
        if at < 0 or (cursor >= 0 and at < cursor):
            errors.append(f"{where} 的星标应写在标题链接后面")
        else:
            cursor = at
    if isinstance(license_name, str) and license_name.strip():
        at = line.find(license_name, max(cursor, 0))
        if at < 0:
            errors.append(f"{where} 的许可证应写在标题行，星标之后")
    return errors


def _bodies(text: str) -> dict[str, str]:
    marks: list[tuple[int, int, str]] = []
    for label in LABELS:
        found = None
        for token in (
            f"<strong>{label}：</strong>",
            f"<strong>{label}:</strong>",
            f"**{label}：**",
            f"**{label}:**",
        ):
            start = text.find(token)
            if start >= 0 and (found is None or start < found[0]):
                found = (start, start + len(token))
        if found:
            marks.append((found[0], found[1], label))
    marks.sort()
    bodies: dict[str, str] = {}
    for index, (_start, end, label) in enumerate(marks):
        stop = marks[index + 1][0] if index + 1 < len(marks) else len(text)
        raw = text[end:stop]
        raw = re.sub(r"</?(?:p|details|summary|div|span)[^>]*>", " ", raw, flags=re.I)
        raw = re.sub(r"<[^>]+>", "", raw)
        bodies[label] = re.sub(r"\s+", " ", raw).strip(" ：:")
    return bodies


def _intro(text: str) -> str:
    head = text.split("<details", 1)[0]
    lines = [line for line in head.splitlines() if not line.startswith("#")]
    raw = " ".join(lines)
    raw = re.sub(r"<[^>]+>", "", raw)
    raw = re.sub(r"\[[^\]]+\]\([^)]+\)", "", raw)
    return re.sub(r"\s+", " ", raw).strip()
