#!/usr/bin/env python3
"""Render LLM Arena top-N bar chart as SVG (+ optional PNG).

Input: Arena JSON from fetch_llm_arena.py (items with rank/model/organization/score/votes),
or a plain ranked list JSON: [{"rank", "model", "organization"?, "score", "votes"?}, ...]

NEW highlights:
  --highlight NAME (repeatable) OR comma-separated --highlight "A,B"
  else auto: lowest --new-count vote models among the plotted top-N (proxy when only one board date).

PNG export tries cairosvg, then rsvg-convert, then matplotlib Agg fallback.
"""
from __future__ import annotations

import argparse
import html
import json
import math
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any


ORG_COLORS = {
    "google": "#5B9BD5",
    "anthropic": "#E8A87C",
    "meta": "#2F5496",
    "openai": "#10A37F",
    "moonshot": "#7B68EE",
    "xai": "#111111",
    "mistral": "#F2A900",
    "deepseek": "#4C8BF5",
    "alibaba": "#FF6A00",
    "bytedance": "#325AB4",
}
DEFAULT_COLOR = "#888888"
FONT_STACK = "Noto Sans CJK SC, Noto Sans CJK, DejaVu Sans, Arial, sans-serif"


def load_items(path: Path) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    meta: dict[str, Any] = {}
    if isinstance(raw, dict) and "items" in raw:
        items = list(raw["items"])
        meta = {k: v for k, v in raw.items() if k != "items"}
    elif isinstance(raw, list):
        items = list(raw)
    else:
        raise SystemExit(f"Unrecognized JSON shape in {path}")
    for i, it in enumerate(items):
        if "model" not in it or "score" not in it:
            raise SystemExit(f"Item {i} missing model/score: {it!r}")
        it.setdefault("rank", i + 1)
        it.setdefault("organization", "unknown")
        it.setdefault("votes", None)
    return items, meta


def pick_new(items: list[dict[str, Any]], n: int, explicit: list[str] | None) -> set[str]:
    if explicit is not None:
        wanted = {x.strip().lower() for x in explicit if x.strip()}
        return {it["model"] for it in items if it["model"].lower() in wanted}
    scored = [it for it in items if isinstance(it.get("votes"), (int, float))]
    if not scored:
        return set()
    scored.sort(key=lambda it: (it["votes"], it.get("rank", 10**9)))
    return {it["model"] for it in scored[: max(0, n)]}


def escape(s: Any) -> str:
    return html.escape(str(s), quote=True)


def render_svg(
    items: list[dict[str, Any]],
    *,
    title: str,
    subtitle: str,
    footnote: str,
    new_models: set[str],
    width: int = 1100,
    row_h: float = 42.0,
) -> str:
    n = len(items)
    margin_l, margin_r, margin_t, margin_b = 320, 110, 70, 78
    height = int(margin_t + n * row_h + margin_b)
    plot_w = width - margin_l - margin_r
    scores = [float(it["score"]) for it in items]
    smin = min(scores)
    smax = max(scores)
    pad = max(2.0, (smax - smin) * 0.08)
    xmin = math.floor((smin - pad) / 5) * 5
    xmax = math.ceil((smax + pad) / 5) * 5
    if xmax <= xmin:
        xmax = xmin + 10

    def x_of(score: float) -> float:
        return margin_l + (score - xmin) / (xmax - xmin) * plot_w

    # tick step
    span = xmax - xmin
    for step in (1, 2, 5, 10, 20, 25, 50):
        if span / step <= 8:
            tick_step = step
            break
    else:
        tick_step = 50

    parts: list[str] = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" '
        f'viewBox="0 0 {width} {height}">',
        f"<title>{escape(title)}</title>",
        f'<rect width="100%" height="100%" fill="#ffffff"/>',
        f'<text x="{width/2:.1f}" y="28" text-anchor="middle" '
        f'font-family="{FONT_STACK}" font-size="18" font-weight="700" fill="#222">'
        f"{escape(title)}</text>",
    ]
    if subtitle:
        parts.append(
            f'<text x="{width/2:.1f}" y="50" text-anchor="middle" '
            f'font-family="{FONT_STACK}" font-size="12" fill="#555">{escape(subtitle)}</text>'
        )

    # grid + axis
    y0 = margin_t
    y1 = margin_t + n * row_h
    parts.append(
        f'<line x1="{margin_l}" y1="{y0}" x2="{margin_l}" y2="{y1}" stroke="#ccc" stroke-width="1"/>'
    )
    t = xmin
    while t <= xmax + 1e-9:
        x = x_of(t)
        parts.append(
            f'<line x1="{x:.1f}" y1="{y0}" x2="{x:.1f}" y2="{y1}" stroke="#eee" stroke-width="1"/>'
        )
        parts.append(
            f'<text x="{x:.1f}" y="{y1 + 18}" text-anchor="middle" '
            f'font-family="{FONT_STACK}" font-size="11" fill="#666">{int(t) if float(t).is_integer() else t}</text>'
        )
        t += tick_step

    parts.append(
        f'<text x="{margin_l + plot_w/2:.1f}" y="{y1 + 38}" text-anchor="middle" '
        f'font-family="{FONT_STACK}" font-size="12" fill="#444">Arena Score</text>'
    )

    # bars
    bar_h = row_h * 0.55
    orgs_used: list[str] = []
    for i, it in enumerate(items):
        cy = margin_t + (i + 0.5) * row_h
        score = float(it["score"])
        x1 = margin_l
        x2 = x_of(score)
        org = str(it.get("organization") or "unknown").lower()
        color = ORG_COLORS.get(org, DEFAULT_COLOR)
        if org not in orgs_used:
            orgs_used.append(org)
        label = f"{it.get('rank', i+1)}. {it['model']}"
        parts.append(
            f'<text x="{margin_l - 12}" y="{cy + 4:.1f}" text-anchor="end" '
            f'font-family="{FONT_STACK}" font-size="12" fill="#222">{escape(label)}</text>'
        )
        parts.append(
            f'<rect x="{x1}" y="{cy - bar_h/2:.1f}" width="{max(1.0, x2-x1):.1f}" height="{bar_h:.1f}" '
            f'rx="3" ry="3" fill="{color}"/>'
        )
        parts.append(
            f'<text x="{x2 + 8:.1f}" y="{cy + 4:.1f}" text-anchor="start" '
            f'font-family="{FONT_STACK}" font-size="12" font-weight="600" fill="#222">'
            f'{score:.1f}</text>'
        )

        if it["model"] in new_models:
            # ellipse around bar + labels roughly
            cx = (margin_l - 8 + x2 + 70) / 2
            rx = (x2 + 70 - (margin_l - 280)) / 2 + 20
            # Better: wrap from label left to score
            left = margin_l - 300
            right = x2 + 55
            cx = (left + right) / 2
            rx = (right - left) / 2
            ry = row_h * 0.42
            parts.append(
                f'<ellipse cx="{cx:.1f}" cy="{cy:.1f}" rx="{rx:.1f}" ry="{ry:.1f}" '
                f'fill="none" stroke="#E53935" stroke-width="2.5" opacity="0.95"/>'
            )
            badge_x = right + 8
            badge_y = cy - 11
            parts.append(
                f'<rect x="{badge_x:.1f}" y="{badge_y:.1f}" width="44" height="22" rx="6" ry="6" fill="#E53935"/>'
            )
            parts.append(
                f'<text x="{badge_x + 22:.1f}" y="{cy + 4:.1f}" text-anchor="middle" '
                f'font-family="{FONT_STACK}" font-size="11" font-weight="700" fill="#fff">NEW</text>'
            )

    # legend
    lx = width - margin_r - 10
    ly = y1 - 8 - 18 * len(orgs_used)
    for j, org in enumerate(orgs_used):
        yy = ly + j * 18
        parts.append(
            f'<rect x="{lx - 90}" y="{yy - 9}" width="12" height="12" rx="2" fill="{ORG_COLORS.get(org, DEFAULT_COLOR)}"/>'
        )
        parts.append(
            f'<text x="{lx - 74}" y="{yy + 1}" font-family="{FONT_STACK}" font-size="11" fill="#333">'
            f"{escape(org)}</text>"
        )

    if footnote:
        # wrap roughly
        parts.append(
            f'<text x="24" y="{height - 22}" font-family="{FONT_STACK}" font-size="11" fill="#666">'
            f"{escape(footnote)}</text>"
        )

    parts.append("</svg>")
    return "\n".join(parts)


def export_png(svg_path: Path, png_path: Path, scale: float = 2.0) -> str:
    """Return method used."""
    # 1) cairosvg
    try:
        import cairosvg  # type: ignore

        cairosvg.svg2png(
            url=str(svg_path),
            write_to=str(png_path),
            scale=scale,
        )
        return "cairosvg"
    except Exception as e:
        cairosvg_err = e

    # 2) rsvg-convert
    rsvg = shutil.which("rsvg-convert")
    if rsvg:
        cmd = [rsvg, "-z", str(scale), "-o", str(png_path), str(svg_path)]
        subprocess.check_call(cmd)
        return "rsvg-convert"

    # 3) matplotlib Agg (SVG via pillow not great; use cairo-less raster via wand? skip)
    # Last resort: inkscape
    ink = shutil.which("inkscape")
    if ink:
        subprocess.check_call(
            [ink, str(svg_path), "--export-type=png", f"--export-filename={png_path}", f"--export-dpi={96*scale}"]
        )
        return "inkscape"

    raise SystemExit(
        f"PNG export failed (cairosvg error: {cairosvg_err!r}). Install cairosvg or rsvg-convert."
    )


def parse_highlights(values: list[str] | None) -> list[str] | None:
    if not values:
        return None
    out: list[str] = []
    for v in values:
        out.extend([p.strip() for p in v.split(",") if p.strip()])
    return out


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--json", required=True, type=Path, help="Arena JSON path")
    p.add_argument("--out-svg", required=True, type=Path)
    p.add_argument("--out-png", type=Path, default=None)
    p.add_argument("--top", type=int, default=15)
    p.add_argument("--new-count", type=int, default=4, help="Auto NEW: lowest-N votes in top")
    p.add_argument(
        "--highlight",
        action="append",
        default=None,
        help="Explicit model name(s) to mark NEW (repeat or comma-separated). Disables vote heuristic.",
    )
    p.add_argument("--title", default=None)
    p.add_argument("--subtitle", default=None)
    p.add_argument("--footnote", default=None)
    p.add_argument("--png-scale", type=float, default=2.0)
    p.add_argument("--no-png", action="store_true")
    args = p.parse_args(argv)

    items, meta = load_items(args.json)
    items = sorted(items, key=lambda it: it.get("rank", 10**9))[: args.top]
    explicit = parse_highlights(args.highlight)
    new_models = pick_new(items, args.new_count, explicit)

    pub = meta.get("leaderboard_publish_date") or (items[0].get("leaderboard_publish_date") if items else "")
    title = args.title or f"LLM Arena Top {len(items)} — publish {pub}"
    subtitle = args.subtitle or (
        f"HF {meta.get('dataset', 'lmarena-ai/leaderboard-dataset')} / "
        f"{meta.get('config', '')} / {meta.get('category', 'overall')}"
    )
    if args.footnote is not None:
        footnote = args.footnote
    elif explicit is not None:
        footnote = "红圈/NEW：显式指定的本周新模型"
    else:
        footnote = (
            f"红圈/NEW：本周疑似新上榜（票数最低 {args.new_count} 个代理；"
            f"数据集仅有 {pub or '单日'} 一版）"
        )

    svg = render_svg(items, title=title, subtitle=subtitle, footnote=footnote, new_models=new_models)
    args.out_svg.parent.mkdir(parents=True, exist_ok=True)
    args.out_svg.write_text(svg, encoding="utf-8")
    print(f"SVG: {args.out_svg}")
    print("NEW:", ", ".join(sorted(new_models)) if new_models else "(none)")

    if not args.no_png:
        png = args.out_png or args.out_svg.with_suffix(".png")
        method = export_png(args.out_svg, png, scale=args.png_scale)
        print(f"PNG: {png} via {method}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
