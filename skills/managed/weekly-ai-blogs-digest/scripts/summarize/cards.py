"""卡片只存结构化字段时的校验。导语、五段和发布要点允许行内 mark 与链接，其余字段是纯文本。"""

from __future__ import annotations

import re

LABELS = ("解决什么问题", "如何解决", "效果怎样", "洞察与启发", "相关工作")
MARK_RE = re.compile(r'<mark class="note-card-hl">([^<>]+)</mark>')
LINK_RE = re.compile(r'<a href="(https?://[^"]+)">([^<>]+)</a>')
MARKDOWN_RE = re.compile(r"(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|!?\[[^\]]*\]\()")
PLAIN_TEXT_KEYS = ("id", "title", "link", "category", "company", "purpose", "change", "license")


def card_problems(item: dict, where: str) -> list[str]:
    """文章卡和项目卡的字段检查：导语、五段、行内标记、纯文本字段。"""
    errors: list[str] = []
    if not isinstance(item, dict):
        return [f"{where} 不是对象"]
    lede = item.get("lede")
    if not isinstance(lede, str) or not lede.strip():
        errors.append(f"{where} 缺少导语")
    else:
        errors.extend(_markup_problems(lede, f"{where} 的导语"))
    sections = item.get("sections")
    if not isinstance(sections, dict):
        errors.append(f"{where} 缺少五段")
        sections = {}
    for label in LABELS:
        body = sections.get(label)
        if body is None:
            errors.append(f"{where} 缺少「{label}」")
        elif not isinstance(body, str) or not body.strip():
            errors.append(f"{where} 的「{label}」是空的")
        else:
            errors.extend(_markup_problems(body, f"{where} 的「{label}」"))
    how = sections.get("如何解决")
    if isinstance(lede, str) and lede.strip() and isinstance(how, str) and how.strip():
        if lede.strip() == how.strip() or (len(how.strip()) >= 12 and how.strip() in lede):
            errors.append(f"{where} 的导语重复了如何解决")
    for key in PLAIN_TEXT_KEYS:
        errors.extend(_plain_problems(item.get(key), f"{where} 的 {key}"))
    return errors


def model_card_problems(item: dict, where: str) -> list[str]:
    """模型卡的字段检查：导语、发布要点、纯文本字段。"""
    errors: list[str] = []
    if not isinstance(item, dict):
        return [f"{where} 不是对象"]
    for key in ("id", "title", "link"):
        errors.extend(_plain_problems(item.get(key), f"{where} 的 {key}"))
    lede = item.get("lede")
    if not isinstance(lede, str) or not lede.strip():
        errors.append(f"{where} 缺少导语")
    else:
        errors.extend(_markup_problems(lede, f"{where} 的导语"))
    points = item.get("points")
    if not isinstance(points, list):
        return errors
    for index, point in enumerate(points, start=1):
        if not isinstance(point, dict):
            continue
        errors.extend(_plain_problems(point.get("label"), f"{where} 第 {index} 条要点的 label"))
        text = point.get("text")
        if isinstance(text, str) and text.strip():
            errors.extend(_markup_problems(text, f"{where} 第 {index} 条要点"))
    return errors


def stars_license_problems(item: dict, cleaned: dict, where: str) -> list[str]:
    """stars 和 license 只沿用 cleaned 里的事实，不编造。"""
    errors: list[str] = []
    if not isinstance(item, dict):
        return errors
    cleaned = cleaned if isinstance(cleaned, dict) else {}
    stars = item.get("stars")
    cleaned_stars = cleaned.get("stars")
    if isinstance(cleaned_stars, int) and not isinstance(cleaned_stars, bool):
        if stars != cleaned_stars:
            errors.append(f"{where} 的 stars 应与 cleaned 一致，是 {cleaned_stars}")
    elif stars is not None:
        errors.append(f"{where} 的 cleaned 没有星标，stars 只能省略或 null")
    license_name = item.get("license")
    cleaned_license = cleaned.get("license")
    if isinstance(cleaned_license, str) and cleaned_license.strip():
        if license_name != cleaned_license:
            errors.append(f"{where} 的 license 应与 cleaned 一致，是 {cleaned_license}")
    elif license_name is not None:
        errors.append(f"{where} 的 cleaned 没有许可证，license 只能省略")
    return errors


def _markup_problems(text: str, where: str) -> list[str]:
    errors: list[str] = []
    if len(MARK_RE.findall(text)) > 1:
        errors.append(f"{where} 最多一处 mark")
    rest = MARK_RE.sub("", text)
    rest = LINK_RE.sub("", rest)
    if "<" in rest or ">" in rest:
        errors.append(f"{where} 只能有 mark 和 https 链接，不能有其他标签")
    if MARKDOWN_RE.search(rest):
        errors.append(f"{where} 不能写 markdown")
    return errors


def _plain_problems(value, where: str) -> list[str]:
    if value is None:
        return []
    if not isinstance(value, str):
        return [f"{where} 必须是纯文本"]
    if "<" in value or ">" in value:
        return [f"{where} 必须是纯文本，不能有标签"]
    if MARKDOWN_RE.search(value):
        return [f"{where} 必须是纯文本，不能写 markdown"]
    return []
