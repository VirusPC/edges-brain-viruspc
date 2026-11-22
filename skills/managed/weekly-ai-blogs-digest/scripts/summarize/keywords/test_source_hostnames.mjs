import assert from "node:assert/strict";
import test from "node:test";
import { sourceHostnames } from "./source_hostnames.mjs";

test("title link and inline links each contribute a hostname", () => {
  const hosts = sourceHostnames(`#### [标题](https://openai.com/index/a)

短述。 [社区帖](https://linux.do/t/1)；[下篇](https://mp.weixin.qq.com/s?a=1)`);
  assert.deepEqual(hosts, ["openai.com", "linux.do", "mp.weixin.qq.com"]);
});

test("the same hostname counts once", () => {
  const hosts = sourceHostnames(`#### [上篇](https://mp.weixin.qq.com/s?a=1)

[下篇](https://mp.weixin.qq.com/s?b=2)`);
  assert.deepEqual(hosts, ["mp.weixin.qq.com"]);
});

test("a tag stays outside the link and still counts", () => {
  const hosts = sourceHostnames(
    "#### &lt;标签&gt;[标题](https://www.anthropic.com/claude)",
  );
  assert.deepEqual(hosts, ["www.anthropic.com"]);
});

test("unlinked headings and images add no hosts", () => {
  const hosts = sourceHostnames(`#### 整体排名

![图](llm-arena.png)

![外链图](https://example.com/chart.png)`);
  assert.deepEqual(hosts, []);
});

test("html comments are not scanned", () => {
  const hosts = sourceHostnames(`#### 本周关键词

<!-- keywords-cloud
[{"word":"x","url":"https://openai.com/hidden"}]
-->

[可见](https://kiro.dev/blog/a)`);
  assert.deepEqual(hosts, ["kiro.dev"]);
});
