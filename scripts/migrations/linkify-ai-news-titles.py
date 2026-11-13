#!/usr/bin/env python3
"""把 AI 资讯周报条目标题改成来源链接，并去掉「原始链接」引用块。

可重复运行：已经是新格式的稿件保持不变。先在内存里改完全部文件，任一处对不上就整批不写。

    python3 scripts/migrations/linkify-ai-news-titles.py --self-test
    python3 scripts/migrations/linkify-ai-news-titles.py --dry-run
    python3 scripts/migrations/linkify-ai-news-titles.py
    python3 scripts/migrations/linkify-ai-news-titles.py --check
"""

from __future__ import annotations

import argparse
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
AI_NEWS = ROOT / "ai-news"
ISSUE = re.compile(r"^\d{4}-\d{2}-\d{2}-ai-news\.md$")

LINK_RE = re.compile(r"(?<!!)\[([^\[\]]*)\]\((https?://[^)\s]+)\)")
HEADING_RE = re.compile(r"^####[ \t]+(.*)$")
NEXT_HEADING_RE = re.compile(r"^#{2,4}[ \t]+\S")
QUOTE_RE = re.compile(r"^>[ \t]*原始链接[：:]")
PREFIX_RE = re.compile(r"^>[ \t]*原始链接[：:][ \t]*")
DATE_RE = re.compile(r"[（(]发布日[ \t]*\d{4}-\d{2}-\d{2}[）)]")
TAG_RE = re.compile(r"^((?:&lt;[^&\n]+?&gt;|<[^>\n]+>)+)(.*)$")
LIST_ITEM_RE = re.compile(
    r"^(?P<prefix>\s*[-*]\s+)\*\*(?P<name>[^*]+)\*\*(?P<rest>.*)\[链接\]\((?P<url>https?://[^)\s]+)\)(?P<tail>[ \t]*)$"
)
BARE_URL_RE = re.compile(r"https?://\S+")


class TransformError(Exception):
    pass


def newline_of(line: str) -> str:
    if line.endswith("\r\n"):
        return "\r\n"
    if line.endswith("\n"):
        return "\n"
    return ""


def markdown_links(text: str) -> list[tuple[str, str]]:
    return LINK_RE.findall(text)


def url_multiset(text: str) -> Counter:
    return Counter(url for _label, url in markdown_links(text))


def bare_url_multiset(text: str) -> Counter:
    stripped = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", text)
    stripped = LINK_RE.sub("", stripped)
    return Counter(BARE_URL_RE.findall(stripped))


def primary_index(links: list[tuple[str, str]]) -> int:
    for index, (label, _url) in enumerate(links):
        if label.strip() != "社区帖":
            return index
    return 0


def link_markup(label: str, url: str) -> str:
    return f"[{label}]({url})"


def clean_quote_line(line: str) -> list[tuple[str, str]]:
    body = line.rstrip("\r\n")
    if not QUOTE_RE.match(body):
        raise TransformError(f"不是原始链接引用：{body}")
    links = markdown_links(body)
    if not links:
        raise TransformError(f"引用块里没有链接：{body}")
    rest = PREFIX_RE.sub("", body, count=1)
    for label, url in links:
        needle = link_markup(label, url)
        if needle not in rest:
            raise TransformError(f"链接无法从引用块拆出：{body}")
        rest = rest.replace(needle, "", 1)
    rest = DATE_RE.sub("", rest)
    rest = rest.replace("；", "").replace(";", "").replace("、", "")
    if rest.strip():
        raise TransformError(f"引用块里还有未搬走的文字：{body} -> {rest!r}")
    return links


def linked_heading(heading_body: str, url: str) -> str:
    if LINK_RE.search(heading_body):
        raise TransformError(f"标题里已经有链接：{heading_body}")
    tag = ""
    title = heading_body.strip()
    matched = TAG_RE.match(title)
    if matched:
        tag = matched.group(1)
        title = matched.group(2).strip()
    if not title:
        raise TransformError(f"标题是空的：{heading_body}")
    if "[" in title or "]" in title:
        raise TransformError(f"标题含有方括号，不能直接做成链接：{title}")
    if ")" in url or " " in url:
        raise TransformError(f"链接地址含有空格或右括号：{url}")
    return f"#### {tag}[{title}]({url})"


def rewrite_list_line(line: str) -> str:
    ending = newline_of(line)
    body = line[: len(line) - len(ending)] if ending else line
    matched = LIST_ITEM_RE.match(body)
    if matched is None:
        if "[链接](" in body:
            raise TransformError(f"列表项里的「链接」对不上加粗名称：{body}")
        return line
    name = matched.group("name")
    rest = matched.group("rest")
    if "[" in name or "]" in name or "[" in rest or "http" in rest:
        raise TransformError(f"列表项里还有别的链接：{body}")
    url = matched.group("url")
    rewritten = (
        f"{matched.group('prefix')}**[{name}]({url})**{rest}{matched.group('tail')}"
    )
    return rewritten + ending


def transform_section(lines: list[str]) -> list[str]:
    heading = lines[0]
    ending = newline_of(heading)
    heading_match = HEADING_RE.match(heading.rstrip("\r\n"))
    if heading_match is None:
        raise TransformError(f"不是四级标题：{heading!r}")
    body = lines[1:]
    quote_indexes = [index for index, line in enumerate(body) if QUOTE_RE.match(line)]
    if not quote_indexes:
        return [heading, *[rewrite_list_line(line) for line in body]]

    first, last = quote_indexes[0], quote_indexes[-1]
    for index in range(first, last + 1):
        if index not in quote_indexes and body[index].strip():
            raise TransformError("同一条下面的原始链接中间夹了别的内容")
    links: list[tuple[str, str]] = []
    for index in quote_indexes:
        links.extend(clean_quote_line(body[index]))
    chosen = primary_index(links)
    extras = [link for index, link in enumerate(links) if index != chosen]
    new_heading = linked_heading(heading_match.group(1), links[chosen][1]) + ending

    drop = set(range(first, last + 1))
    if first > 0 and body[first - 1].strip() == "":
        drop.add(first - 1)

    if extras:
        anchor = None
        for index in range(first - 1, -1, -1):
            if index in drop or body[index].strip() == "":
                continue
            anchor = index
            break
        if anchor is None:
            raise TransformError(f"多条链接没有可附着的短述：{heading_match.group(1)}")
        anchor_line = body[anchor]
        if anchor_line.lstrip().startswith(("![", "- ", "* ", "1. ", "<br")):
            raise TransformError(f"多条链接不该接到这一行：{anchor_line.strip()}")
        extra_text = "；".join(link_markup(label, url) for label, url in extras)
        anchor_ending = newline_of(anchor_line)
        anchor_body = anchor_line[: len(anchor_line) - len(anchor_ending)] if anchor_ending else anchor_line
        spacer = "" if anchor_body.endswith((" ", "　")) else " "
        body[anchor] = f"{anchor_body}{spacer}{extra_text}{anchor_ending}"

    kept = [line for index, line in enumerate(body) if index not in drop]
    return [new_heading, *kept]


def transform(text: str) -> str:
    lines = text.splitlines(keepends=True)
    if text and not text.endswith(("\n", "\r\n")) and lines:
        lines[-1] = lines[-1]  # splitlines already kept a line without newline
    output: list[str] = []
    index = 0
    while index < len(lines):
        if HEADING_RE.match(lines[index].rstrip("\r\n")):
            end = index + 1
            while end < len(lines) and not NEXT_HEADING_RE.match(lines[end]):
                end += 1
            output.extend(transform_section(lines[index:end]))
            index = end
            continue
        output.append(lines[index])
        index += 1
    rewritten = "".join(output)
    if url_multiset(text) != url_multiset(rewritten):
        raise TransformError("改写前后的链接地址对不上")
    if bare_url_multiset(text) != bare_url_multiset(rewritten):
        raise TransformError("改写前后的裸链接对不上")
    if "原始链接" in rewritten:
        raise TransformError("改写后仍有「原始链接」")
    return rewritten


def issue_paths() -> list[Path]:
    return sorted(path for path in AI_NEWS.iterdir() if ISSUE.match(path.name))


def run_files(dry_run: bool, check: bool) -> int:
    paths = issue_paths()
    if len(paths) != 12:
        print(f"期望 12 期正文，实际 {len(paths)}", file=sys.stderr)
        return 1
    planned: list[tuple[Path, str]] = []
    for path in paths:
        original = path.read_text(encoding="utf-8")
        try:
            rewritten = transform(original)
        except TransformError as error:
            print(f"{path.name}: {error}", file=sys.stderr)
            return 1
        planned.append((path, rewritten))
        quotes = original.count("> 原始链接")
        print(f"{path.name}: 引用块 {quotes}，变更 {original != rewritten}")
    changed = [(path, text) for path, text in planned if path.read_text(encoding="utf-8") != text]
    if check and changed:
        print(f"还有 {len(changed)} 期没有套上标题链接", file=sys.stderr)
        return 1
    if dry_run or check:
        return 0
    for path, text in changed:
        path.write_text(text, encoding="utf-8")
    print(f"写入 {len(changed)} 期")
    return 0


def self_test() -> int:
    single = """#### &lt;产品&gt;示例标题

一句短述。

> 原始链接：[原文标题](https://openai.com/index/a)（发布日 2026-11-01）

#### 整体排名

![LLM Arena](llm-arena.png)
"""
    got = transform(single)
    assert got == """#### &lt;产品&gt;[示例标题](https://openai.com/index/a)

一句短述。

#### 整体排名

![LLM Arena](llm-arena.png)
""", got

    multi = """#### Kiroween

以官方页面为准。

> 原始链接：[Kiroween on Devpost](https://kiroween.devpost.com)；[社区帖](https://linux.do/t/topic/1)

#### 只有社区帖

一句。

> 原始链接：[社区帖](https://linux.do/t/topic/2)

#### 上下篇

分上下篇。

> 原始链接：[从业务问题到可信数据（上篇）](https://mp.weixin.qq.com/s?a=1)；[从数字到业务决策（下篇）](https://mp.weixin.qq.com/s?b=2)
"""
    got = transform(multi)
    assert "#### [Kiroween](https://kiroween.devpost.com)" in got
    assert "以官方页面为准。 [社区帖](https://linux.do/t/topic/1)" in got
    assert "kiroween.devpost.com" in got.split("只有社区帖")[0]
    assert "#### [只有社区帖](https://linux.do/t/topic/2)" in got
    assert "#### [上下篇](https://mp.weixin.qq.com/s?a=1)" in got
    assert "分上下篇。 [从数字到业务决策（下篇）](https://mp.weixin.qq.com/s?b=2)" in got
    assert "原始链接" not in got
    assert transform(got) == got

    community_first = """#### 官方在后

短述。

> 原始链接：[社区帖](https://linux.do/t/topic/3)；[Zed — Education](https://zed.dev/education)
"""
    got = transform(community_first)
    assert got.startswith("#### [官方在后](https://zed.dev/education)\n")
    assert "短述。 [社区帖](https://linux.do/t/topic/3)" in got

    shorts = """#### 其他短讯

- **OpenAI Images 2.6**：图像生成更新。[链接](https://openai.com/index/images)
- **Phonon TTS**（Gradium）：端侧语音。[链接](https://huggingface.co/blog/phonon)

#### GitHub Trending（daily / all 前 5）

1. [owner/repo](https://github.com/owner/repo)：说明。
"""
    got = transform(shorts)
    assert "- **[OpenAI Images 2.6](https://openai.com/index/images)**：图像生成更新。" in got
    assert "- **[Phonon TTS](https://huggingface.co/blog/phonon)**（Gradium）：端侧语音。" in got
    assert "[链接]" not in got
    assert "#### GitHub Trending（daily / all 前 5）" in got
    assert "1. [owner/repo](https://github.com/owner/repo)：说明。" in got
    assert transform(got) == got
    print("self-test ok")
    return 0


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args(argv)
    if args.self_test:
        return self_test()
    return run_files(dry_run=args.dry_run, check=args.check)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
