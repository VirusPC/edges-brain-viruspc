#!/usr/bin/env python3
"""把栏目「AI Coding 资讯」改成「AI 资讯」，并把周报文件名改成 ai-news。

可重复运行。先检查目标是否已存在，再改名、再替换正文。本脚本自己的源码不参与替换。
项目记忆 `.edges/memory/` 不在这里改，交给 `edges memory remember`。

    python3 scripts/migrations/rename-ai-coding-column-to-ai-news.py --self-test
    python3 scripts/migrations/rename-ai-coding-column-to-ai-news.py --dry-run
    python3 scripts/migrations/rename-ai-coding-column-to-ai-news.py
    python3 scripts/migrations/rename-ai-coding-column-to-ai-news.py --check
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = Path(__file__).resolve()
AI_NEWS = ROOT / "ai-news"

ISSUE_NAME = __import__("re").compile(r"^(\d{4}-\d{2}-\d{2})-ai-coding-news(\.notes)?\.md$")
DIR_TOKEN = "AI-Coding-资讯"
DIR_TOKEN_NEW = "AI-资讯"
ENCODED_DIR_TOKEN = "AI-Coding-%E8%B5%84%E8%AE%AF"
ENCODED_DIR_TOKEN_NEW = "AI-%E8%B5%84%E8%AE%AF"

SKIP_DIR_NAMES = {
    ".git",
    "node_modules",
    "dist",
    ".astro",
    "posts",
}
SKIP_PREFIXES = (
    ROOT / ".edges" / "memory",
    ROOT / "posts",
)
TEXT_SUFFIXES = {
    ".md",
    ".mjs",
    ".js",
    ".cjs",
    ".ts",
    ".tsx",
    ".astro",
    ".py",
    ".json",
    ".yml",
    ".yaml",
    ".txt",
    ".css",
    ".html",
    ".xml",
    ".svg",
    ".opml",
}
WEEKLY_COLUMN_ROOTS = (
    ROOT / "ai-news" / "README.md",
    ROOT / "projects",
    ROOT / "scripts" / "migrations" / "linkify-ai-news-titles.py",
)

GLOBAL_REPLACEMENTS = (
    ("-ai-coding-news.notes.md", "-ai-news.notes.md"),
    ("-ai-coding-news.md", "-ai-news.md"),
    ("-ai-coding-news\\.md", "-ai-news\\.md"),
    ("ai-coding-news\\.notes", "ai-news\\.notes"),
    (ENCODED_DIR_TOKEN, ENCODED_DIR_TOKEN_NEW),
    (DIR_TOKEN, DIR_TOKEN_NEW),
    ("ai\\_coding\\_资讯", "ai\\_资讯"),
    ("ai_coding_资讯", "ai_资讯"),
    ("AI Coding 资讯", "AI 资讯"),
)
WEEKLY_COLUMN_REPLACEMENT = ("AI Coding 周报", "AI 资讯周报")

LEFTOVER_NEEDLES = (
    "ai-coding-news",
    "AI Coding 资讯",
    DIR_TOKEN,
    "ai_coding_资讯",
    "ai\\_coding\\_资讯",
    ENCODED_DIR_TOKEN,
)
TRIGGER_FILE = ROOT / "skills" / "managed" / "weekly-ai-blogs-digest" / "SKILL.md"
ALLOWED_TRIGGER = '触发短语："本周 AI 资讯"、"AI Coding 资讯"'


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def skipped(path: Path) -> bool:
    if path.resolve() == SCRIPT:
        return True
    for prefix in SKIP_PREFIXES:
        if path == prefix or prefix in path.parents:
            return True
    return False


def weekly_column_file(path: Path) -> bool:
    for root in WEEKLY_COLUMN_ROOTS:
        if path == root or root in path.parents:
            return True
    return False


def apply_text(path: Path, text: str) -> str:
    updated = text
    for old, new in GLOBAL_REPLACEMENTS:
        updated = updated.replace(old, new)
    if weekly_column_file(path):
        old, new = WEEKLY_COLUMN_REPLACEMENT
        updated = updated.replace(old, new)
    return updated


def plan_issue_renames() -> list[tuple[Path, Path]]:
    planned: list[tuple[Path, Path]] = []
    if not AI_NEWS.is_dir():
        raise SystemExit(f"缺少目录：{rel(AI_NEWS)}")
    for path in sorted(AI_NEWS.iterdir()):
        match = ISSUE_NAME.match(path.name)
        if not match:
            continue
        dest = path.with_name(f"{match.group(1)}-ai-news{match.group(2) or ''}.md")
        planned.append((path, dest))
    return planned


def plan_dir_renames() -> list[tuple[Path, Path]]:
    planned: list[tuple[Path, Path]] = []
    for dirpath, dirnames, _filenames in os.walk(ROOT):
        current = Path(dirpath)
        if skipped(current) or any(part in SKIP_DIR_NAMES for part in current.parts):
            dirnames[:] = []
            continue
        kept: list[str] = []
        for name in dirnames:
            if name in SKIP_DIR_NAMES:
                continue
            child = current / name
            if DIR_TOKEN in name:
                planned.append((child, child.with_name(name.replace(DIR_TOKEN, DIR_TOKEN_NEW))))
            kept.append(name)
        dirnames[:] = kept
    planned.sort(key=lambda item: len(item[0].parts), reverse=True)
    return planned


def plan_token_file_renames(dir_renames: list[tuple[Path, Path]]) -> list[tuple[Path, Path]]:
    """Log files keep the old stem until the parent directory has moved."""
    moved = {src.resolve(): dest for src, dest in dir_renames}
    planned: list[tuple[Path, Path]] = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        current = Path(dirpath)
        if any(part in SKIP_DIR_NAMES for part in current.parts):
            dirnames[:] = []
            continue
        dirnames[:] = [name for name in dirnames if name not in SKIP_DIR_NAMES]
        parent = current
        for src, dest in moved.items():
            try:
                relative = current.resolve().relative_to(src)
            except ValueError:
                continue
            parent = dest / relative
            break
        for name in filenames:
            if DIR_TOKEN not in name:
                continue
            source = parent / name
            planned.append((source, source.with_name(name.replace(DIR_TOKEN, DIR_TOKEN_NEW))))
    return planned


def path_before_dir_move(path: Path, dir_renames: list[tuple[Path, Path]]) -> Path:
    """Log renames are planned at the path they will have after the parent directory moves."""
    for src, dest in dir_renames:
        try:
            relative = path.relative_to(dest)
        except ValueError:
            continue
        return src / relative
    return path


def check_conflicts(pairs: list[tuple[Path, Path]], dir_renames: list[tuple[Path, Path]]) -> None:
    seen_dest: set[str] = set()
    errors: list[str] = []
    for src, dest in pairs:
        if src == dest:
            errors.append(f"源和目标相同：{rel(src)}")
            continue
        if dest.exists():
            errors.append(f"目标已存在，停止以免覆盖：{rel(dest)}")
        key = rel(dest)
        if key in seen_dest:
            errors.append(f"多个来源要写成同一个目标：{key}")
        seen_dest.add(key)
        current = path_before_dir_move(src, dir_renames)
        if not current.exists():
            errors.append(f"计划改名时源文件不存在：{rel(current)}")
    if errors:
        raise SystemExit("冲突：\n" + "\n".join(errors))


def git_mv(src: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["git", "mv", rel(src), rel(dest)], cwd=ROOT, check=True)


def iter_text_files() -> list[Path]:
    found: list[Path] = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        current = Path(dirpath)
        if any(part in SKIP_DIR_NAMES for part in current.parts):
            dirnames[:] = []
            continue
        dirnames[:] = [name for name in dirnames if name not in SKIP_DIR_NAMES]
        for name in filenames:
            path = current / name
            if path.suffix.lower() not in TEXT_SUFFIXES or skipped(path):
                continue
            found.append(path)
    return found


def rewrite_texts(dry_run: bool) -> list[str]:
    notes: list[str] = []
    for path in iter_text_files():
        original = path.read_text(encoding="utf-8")
        updated = apply_text(path, original)
        if updated == original:
            continue
        notes.append(rel(path))
        if not dry_run:
            path.write_text(updated, encoding="utf-8")
    return notes


def leftover_hits() -> list[str]:
    hits: list[str] = []
    for path in iter_text_files():
        text = path.read_text(encoding="utf-8")
        if path == TRIGGER_FILE:
            text = text.replace(ALLOWED_TRIGGER, "", 1)
        for needle in LEFTOVER_NEEDLES:
            if needle in text:
                hits.append(f"{rel(path)}: {needle}")
        if weekly_column_file(path) and WEEKLY_COLUMN_REPLACEMENT[0] in text:
            hits.append(f"{rel(path)}: {WEEKLY_COLUMN_REPLACEMENT[0]}")
    old_issues = [
        path.name
        for path in AI_NEWS.iterdir()
        if ISSUE_NAME.match(path.name) or DIR_TOKEN in path.name
    ]
    for name in old_issues:
        hits.append(f"ai-news/{name}: 旧文件名还在")
    for dirpath, dirnames, filenames in os.walk(ROOT):
        current = Path(dirpath)
        if any(part in SKIP_DIR_NAMES for part in current.parts):
            dirnames[:] = []
            continue
        for name in list(dirnames) + filenames:
            if DIR_TOKEN in name or name.endswith("-ai-coding-news.md") or "-ai-coding-news.notes.md" in name:
                hits.append(f"{rel(current / name)}: 旧路径还在")
    return hits


def self_test() -> None:
    samples = {
        "AI Coding 资讯周报": "AI 资讯周报",
        "# {{yyyy-MM-DD}} AI Coding 资讯": "# {{yyyy-MM-DD}} AI 资讯",
        "2026-11-13-ai-coding-news.md": "2026-11-13-ai-news.md",
        "2026-11-13-ai-coding-news.notes.md": "2026-11-13-ai-news.notes.md",
        r"/^(\d{4}-\d{2}-\d{2})-ai-coding-news\.md$/": r"/^(\d{4}-\d{2}-\d{2})-ai-news\.md$/",
        r"/-ai-coding-news\.md$/": r"/-ai-news\.md$/",
        "ai-coding-news\\.notes": "ai-news\\.notes",
        "name: ai_coding_资讯周报补充推文": "name: ai_资讯周报补充推文",
        r"ai\_coding\_资讯周报": r"ai\_资讯周报",
        "2026-11-12--AI-Coding-资讯周报": "2026-11-12--AI-资讯周报",
        "AI-Coding-%E8%B5%84%E8%AE%AF": "AI-%E8%B5%84%E8%AE%AF",
        "和 AI Coding / Agent 相关时": "和 AI Coding / Agent 相关时",
        "AI Coding 相关条目附带研发落点": "AI Coding 相关条目附带研发落点",
        "如果和AI Coding相关": "如果和AI Coding相关",
        "看看这周 AI Coding 有什么新东西": "看看这周 AI Coding 有什么新东西",
        "AI / AI Coding 领域": "AI / AI Coding 领域",
        "title=\"AI News\"": "title=\"AI News\"",
        "/ai-news/": "/ai-news/",
        "ai-coding-blogs.opml": "ai-coding-blogs.opml",
        "/tmp/ai-coding-feeds.json": "/tmp/ai-coding-feeds.json",
    }
    readme = ROOT / "ai-news" / "README.md"
    readme_sample = apply_text(readme, "# AI Coding 周报归档\nAI Coding 相关条目附带研发落点。\n")
    if readme_sample != "# AI 资讯周报归档\nAI Coding 相关条目附带研发落点。\n":
        raise SystemExit(f"README 栏目名替换不对：{readme_sample!r}")
    outside = ROOT / "retrospectives" / "daily" / "example.md"
    kept = apply_text(outside, "PR #441（AI Coding 周报归档）")
    if kept != "PR #441（AI Coding 周报归档）":
        raise SystemExit("复盘里的历史说法被改掉了")
    for source, expected in samples.items():
        got = apply_text(ROOT / "site" / "src" / "lib" / "ai-news.mjs", source)
        if got != expected:
            raise SystemExit(f"替换结果不对：{source!r} → {got!r}，期望 {expected!r}")
    print("self-test ok")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="只打印计划，不改文件")
    parser.add_argument("--check", action="store_true", help="检查旧栏目名和旧文件名是否还在")
    parser.add_argument("--self-test", action="store_true", help="只跑替换样例")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return
    if args.check:
        hits = leftover_hits()
        if hits:
            raise SystemExit("仍有旧栏目名或旧文件名：\n" + "\n".join(hits))
        print("check ok")
        return

    dir_renames = plan_dir_renames()
    issue_renames = plan_issue_renames()
    file_renames = plan_token_file_renames(dir_renames)
    check_conflicts(dir_renames + issue_renames + file_renames, dir_renames)

    print(f"目录 {len(dir_renames)}，周报文件 {len(issue_renames)}，任务日志 {len(file_renames)}")
    for src, dest in dir_renames + issue_renames + file_renames:
        print(f"mv {rel(src)} -> {rel(dest)}")
    if args.dry_run:
        notes = rewrite_texts(dry_run=True)
        print(f"将改写 {len(notes)} 个文本文件")
        for note in notes:
            print(f"edit {note}")
        return

    for src, dest in dir_renames + issue_renames:
        git_mv(src, dest)
    for src, dest in file_renames:
        git_mv(src, dest)
    notes = rewrite_texts(dry_run=False)
    print(f"已改写 {len(notes)} 个文本文件")
    hits = leftover_hits()
    if hits:
        raise SystemExit("改完后仍有旧栏目名或旧文件名：\n" + "\n".join(hits))


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as error:
        sys.exit(error.returncode)
