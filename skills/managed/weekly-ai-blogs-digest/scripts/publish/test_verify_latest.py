#!/usr/bin/env python3
"""latest.json 指针核验。用本地 HTTP，不访问线上站点。"""

from __future__ import annotations

import json
import subprocess
import sys
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from publish.verify_latest import evaluate, points_at_issue, run  # noqa: E402

ISSUE = "2026-11-27"
ORIGIN = "https://viruspc.github.io"
LATEST = f"{ORIGIN}/edges-brain-viruspc/ai-news/latest.json"
PAGE = f"{ORIGIN}/edges-brain-viruspc/ai-news/{ISSUE}/"
CARD_LABELS = ("什么问题", "如何解决", "效果怎样", "洞察与启发", "相关工作")


def issue_page(*, degraded: bool = False) -> str:
    sections = "".join(f'<div class="note-card-k">{name}</div><p>正文</p>' for name in CARD_LABELS)
    card = f'<article class="note-card article-card"><h4>一张</h4>{sections}</article>'
    projects = "".join(card for _ in range(5))
    residue = "[LLM Arena Top 15，2026-11-27]" if degraded else ""
    return (
        '<div data-model-board=""><select aria-label="切换模型榜单"></select></div>'
        f"{residue}"
        f"<h2>三、项目开源</h2>{projects}<h2>四、精选文章</h2>{card}<h2>五、精选推文</h2>"
    )


def document(issue: str = ISSUE, url: str = PAGE) -> dict:
    return {"id": issue, "url": url, "title": f"{issue} AI 资讯"}


class EvaluateTest(unittest.TestCase):
    def test_points_at_issue_page(self) -> None:
        self.assertTrue(points_at_issue(PAGE, ISSUE))
        self.assertTrue(points_at_issue(PAGE.rstrip("/"), ISSUE))
        self.assertTrue(points_at_issue(PAGE + "index.html", ISSUE))
        self.assertFalse(points_at_issue(f"{ORIGIN}/edges-brain-viruspc/ai-news/{ISSUE}/extra", ISSUE))
        self.assertFalse(points_at_issue(f"{ORIGIN}/edges-brain-viruspc/ai-news/?id={ISSUE}", ISSUE))
        self.assertFalse(points_at_issue(f"{ORIGIN}/edges-brain-viruspc/ai-news/{ISSUE}-extra/", ISSUE))

    def test_accepts_matching_pointer_and_page(self) -> None:
        errors = evaluate(
            document(),
            ISSUE,
            latest_url=LATEST,
            page_status=200,
            final_url=PAGE,
        )
        self.assertEqual(errors, [])

    def test_rejects_other_issue_id(self) -> None:
        errors = evaluate(
            document("2026-11-20", f"{ORIGIN}/edges-brain-viruspc/ai-news/2026-11-20/"),
            ISSUE,
            latest_url=LATEST,
            page_status=200,
            final_url=f"{ORIGIN}/edges-brain-viruspc/ai-news/2026-11-20/",
        )
        self.assertTrue(any("id" in item for item in errors))

    def test_rejects_url_on_another_origin(self) -> None:
        errors = evaluate(
            document(url=f"https://example.com/ai-news/{ISSUE}/"),
            ISSUE,
            latest_url=LATEST,
            page_status=200,
            final_url=PAGE,
        )
        self.assertTrue(any("url" in item for item in errors))
        self.assertTrue(all("200" not in item for item in errors))

    def test_rejects_page_that_is_not_200(self) -> None:
        errors = evaluate(
            document(),
            ISSUE,
            latest_url=LATEST,
            page_status=404,
            final_url=PAGE,
        )
        self.assertEqual(len(errors), 1)
        self.assertIn("404", errors[0])

    def test_rejects_redirect_to_another_issue(self) -> None:
        other = f"{ORIGIN}/edges-brain-viruspc/ai-news/2026-11-20/"
        errors = evaluate(
            document(),
            ISSUE,
            latest_url=LATEST,
            page_status=200,
            final_url=other,
        )
        self.assertTrue(any("最终地址" in item for item in errors))

    def test_rejects_non_object(self) -> None:
        errors = evaluate([], ISSUE, latest_url=LATEST, page_status=200, final_url=PAGE)
        self.assertEqual(errors, ["latest.json 不是对象"])


class Handler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:  # noqa: N802
        self.server.hits += 1  # type: ignore[attr-defined]
        route = self.server.routes.get(self.path)  # type: ignore[attr-defined]
        if route is None:
            self.send_response(404)
            self.end_headers()
            return
        status, location, body = route
        self.send_response(status)
        if location:
            self.send_header("Location", location)
        if body is not None:
            payload = body if isinstance(body, bytes) else body.encode("utf-8")
            self.send_header("Content-Type", "application/json" if self.path.endswith(".json") else "text/html")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return
        self.end_headers()

    def log_message(self, fmt: str, *args) -> None:
        return


class LiveCheckTest(unittest.TestCase):
    def serve(self, routes: dict):
        server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        server.routes = routes  # type: ignore[attr-defined]
        server.hits = 0  # type: ignore[attr-defined]
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()

        def close() -> None:
            server.shutdown()
            server.server_close()
            thread.join(timeout=3)

        self.addCleanup(close)
        return server

    def test_cli_accepts_local_site(self) -> None:
        page = f"/ai-news/{ISSUE}/"
        server = self.serve({})
        host = f"http://127.0.0.1:{server.server_port}"
        server.routes["/ai-news/latest.json"] = (  # type: ignore[attr-defined]
            200,
            None,
            json.dumps({"id": ISSUE, "url": host + page}),
        )
        server.routes[page] = (200, None, issue_page())  # type: ignore[attr-defined]
        result = subprocess.run(
            [
                sys.executable,
                str(Path(__file__).with_name("verify_latest.py")),
                "--issue",
                ISSUE,
                "--latest",
                host + "/ai-news/latest.json",
                "--timeout",
                "5",
            ],
            check=False,
            capture_output=True,
            text=True,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(server.hits, 2)  # type: ignore[attr-defined]

    def test_run_stops_when_page_is_missing(self) -> None:
        page = f"/ai-news/{ISSUE}/"
        server = self.serve({})
        host = f"http://127.0.0.1:{server.server_port}"
        server.routes["/ai-news/latest.json"] = (  # type: ignore[attr-defined]
            200,
            None,
            json.dumps({"id": ISSUE, "url": host + page}),
        )
        errors = run(ISSUE, host + "/ai-news/latest.json", 5)
        self.assertTrue(any("404" in item for item in errors))
        self.assertEqual(server.hits, 2)  # type: ignore[attr-defined]

    def test_run_does_not_fetch_a_substitute_page(self) -> None:
        server = self.serve({"/ai-news/latest.json": (200, None, json.dumps(document(url=f"https://example.com/ai-news/{ISSUE}/")))})
        host = f"http://127.0.0.1:{server.server_port}"
        errors = run(ISSUE, host + "/ai-news/latest.json", 5)
        self.assertTrue(errors)
        self.assertEqual(server.hits, 1)  # type: ignore[attr-defined]

    def test_run_rejects_bracket_chart_text(self) -> None:
        page = f"/ai-news/{ISSUE}/"
        server = self.serve({})
        host = f"http://127.0.0.1:{server.server_port}"
        server.routes["/ai-news/latest.json"] = (  # type: ignore[attr-defined]
            200,
            None,
            json.dumps({"id": ISSUE, "url": host + page}),
        )
        server.routes[page] = (200, None, issue_page(degraded=True))  # type: ignore[attr-defined]
        errors = run(ISSUE, host + "/ai-news/latest.json", 5)
        self.assertTrue(any("方括号" in item for item in errors))


if __name__ == "__main__":
    unittest.main()
