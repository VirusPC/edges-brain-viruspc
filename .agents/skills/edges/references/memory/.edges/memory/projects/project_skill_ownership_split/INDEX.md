---
name: project_skill_ownership_split
description: skills（managed）与 referenced 按谁有权改写分开，现行入口都在 .edges/skills/。2026-09-07 否掉把 .memory 改名为 .agents；当时两份入口都在 .memory/。
metadata:
  edges-title: skills 按「谁有权改写」分成两类
  edges-type: project
  edges-agent-client: claude-code
  edges-username: viruspc
  edges-email: cheng.peng.helloworld@gmail.com
  edges-updated-at: "2026-09-07T17:38:29+08:00"
---

`skills`（现行 managed）收 remember 自动沉淀的流程，`agent_skills`（现行 referenced）只索引人写或装入的技能，工具对后者一个字节都不写。现行两份入口都在 `.edges/skills/`。2026-09-07 它们都在 `.memory/`。

**Why:**

起点是「把 `.memory/` 改名 `.agents/` 是不是就兼容了」。**改名不成立，但直觉对了一半。** 查证：Claude Code 在**任何层级都不读** `.agents/skills`（官方 skills / claude-directory / settings-reference / memory / commands / agent-sdk 文档全量 grep 零命中）；`npx skills` 的 `AGENT_PROJECT_SKILL_DIRS` 只在 `searchPath`（仓库根）一层展开，嵌套层要靠「零结果兜底」的 depth-5 递归才捞得到。所以改名对 Claude Code 收益为零，对 CLI 只有根那一层，而需求恰恰是 monorepo 的嵌套层。

**我最早给的否定理由是错的，一起记下来防止有人拿它重新论证**：我说 `.agents/`「没有生态位」——不对，它是 CLI 那张 28 项表的首项，`~/.agents/skills` 是 Codex / Amp / Cursor / Gemini CLI / Factory / opencode 共读的中枢。真实理由是**作用域不匹配 + Claude Code 不读**。

对的那一半是：**skill 和 memory 机制不同**。spec 明写 `name` + `description` 是启动时全量加载的那一层，skill 的前提是「清单常驻」；memory 是「按需检索」。所以该分开放，只是分界不是目录改名，而是**谁有权改写**——这正是「受管区块 vs 区块外正文」从文件级提到目录级。

**两份入口都放 `.memory/`**，三个具体代价逼出来的：`index_files()` 的 key 取文件名小写，两个 `SKILLS.md` 会互相覆盖；往 `.agents/` 根部写 `SKILLS.md` 与「不允许自动生成」自相矛盾，且撞上生态对那个命名空间的所有权；协议规定一份入口就是一个 type，第二份得有自己的名字。

**没有把 skill 平铺进 `edges-local`**（一度考虑，理由是两跳「藏得深」）：破「固定两跳」这条冻结协议，且冲那条尚未实现的常驻硬上限（200 行 / 25 KB，超出静默丢弃）；根层还会与 harness 自己的常驻清单重复付费。真正的缺口只在**非 Claude 的 agent + 嵌套层**，那里 `AGENTS.md` 逐层索引是唯一 vendor 中立的发现机制——所以 `AGENT_SKILLS.md` 不是冗余，它是那种情况下唯一的路。

**How to apply:**

- 现行目录是 `.edges/skills/managed` 与 `.edges/skills/referenced`，不要再写到 `.memory/`。
- 判断一条东西进哪个类型：下次要不要被**执行** → `skills`；「以后别这么干」→ `feedback`；「当初为什么这么定」→ `project`。
- 再有人提议改维护目录的名字、或让工具往 `.agents/` 写东西，先问「**哪个 agent 在哪一层会读它**」，别停在「这是标准目录」。
- `EXTERNAL_CONTENT_DIRS`（`lib/paths.py`）这张表**同时表示「内容根越界」和「只读」**。加类型时先分清落在「格式由外部定义」（`AGENT_SKILL_FORMAT_TYPES`）还是「内容根在外部」（`EXTERNAL_CONTENT_DIRS`）哪一边，两者正交。
- 副作用：类型名多了以后，`--slug` 不能再以 `skills_` / `agent_skills_` 开头。
