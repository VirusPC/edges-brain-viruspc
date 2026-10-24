# grokbot-langfuse-export

把全部 Grok Bot 助手的对话按真实时间（分钟精度）写进自建 Langfuse 项目 Edges，每轮一条 trace。写入复用官方 [langfuse/cursor-observability-plugin](https://github.com/langfuse/cursor-observability-plugin) 的 `emitTurn`，插件源码不改；本目录只补「读 Grok Bot 对话」和「把 Cursor 字样换成 Grok Bot」两件事。routine 的每小时流程见 [SKILL.md](SKILL.md)，日程见 [schedule.md](schedule.md)。

## 文件

| 路径 | 作用 | 为什么需要 |
|---|---|---|
| `vendor/cursor-observability-plugin/` | 官方插件，git submodule，钉在 `a36d39a7` | 复用它的 `emitTurn`、确定性 id、密钥遮罩，不自己写 Langfuse 写入逻辑 |
| `adapter/stage-from-search-index.mjs` | 从 box 本地消息索引 `/home/box/agent-data/search-index.db` 导出每个 bot 的全量对话到 `<staging>/<botId>.jsonl` | routine 里 ReadTranscript 可能不可用；索引有可见 user/assistant 文本和真实时间戳（无 tool 名） |
| `adapter/read-grokbot-transcripts.mjs` | 读 staging / daily-scan JSONL，切成轮次：分钟时间戳、可见文本、tool 名、3 小时 session 规则、`turnPos` 编号 | 插件只懂 Cursor 的 hook 事件，不懂 Grok Bot 对话格式 |
| `adapter/to-plugin-turn.mjs` | 轮次转成插件自己的 `Turn` 和 `Config` | 通过插件已有字段设 traceId 种子、sessionId、tags、userId、`grokbot.*` metadata，避免改插件 |
| `adapter/rename-cursor-to-grokbot.mjs` | SpanProcessor 包装：`Cursor Turn` 改 `Grok Bot Turn`，去掉 `cursor` tag，`cursor.*` metadata 改 `grokbot.*` | 这三处在插件里写死，Config / Turn 改不了 |
| `adapter/instrumentation-with-rename.mjs` | 照抄插件 `setupInstrumentation`（约 30 行），在 Langfuse 处理器外套一层上面的改名处理器，`service.name=grok-bot`，dry-run 用内存 exporter | 插件在函数内部 new 处理器和 exporter，没有挂钩，只能复制一份再插入改名 |
| `adapter/export-cli.mjs` | 入口：读 cursor、首次只回填 24 小时、分批调 `emitTurn` 并 flush、失败批次不推进 cursor、输出 JSON summary | 每小时增量导出与去重 |
| `package.json` | `npm run stage` / `npm run export`；依赖版本按插件 `pnpm-lock.yaml` 精确钉住 | 用 `tsx` 直接 import 插件 TS 源 |

## 准备（新 checkout）

```bash
git submodule update --init projects/routines/grokbot-langfuse-export/vendor/cursor-observability-plugin
cd projects/routines/grokbot-langfuse-export && npm ci
```

## 运行

```bash
npm run -s stage                       # 写 /workspace/langfuse-export-staging/<botId>.jsonl
npm run -s export -- --source staging  # 需要 LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY
npm run -s export -- --source staging --dry-run --dump-spans   # 不发网络、不写 cursor
```

`export` 参数：`--source staging|daily-scan`、`--staging-dir`、`--daily-scan`、`--agents-dir`、`--cursor-file`、`--host`、`--backfill-hours 24`、`--batch-size 20`、`--max-turns N`、`--bot <id|名>`（可重复）、`--dry-run`、`--dump-spans`、`--force-reexport`。有失败时退出码为 1。

## 更新钉住的插件版本

```bash
cd projects/routines/grokbot-langfuse-export/vendor/cursor-observability-plugin
git fetch origin && git checkout <新 commit>
cd ../..
# 对照插件新版 package.json / pnpm-lock.yaml 调整本目录 package.json 的钉版本
npm install && npm run -s export -- --source staging --dry-run --max-turns 3 --dump-spans
# 检查：根名为 Grok Bot Turn、无 cursor tag、tool 无 input/output。
# 插件若改了 emitTurn 签名、Turn 字段或写死的名字，改 to-plugin-turn.mjs 或 rename-cursor-to-grokbot.mjs；
# 若改了 setupInstrumentation，同步 instrumentation-with-rename.mjs。
git add vendor/cursor-observability-plugin package.json package-lock.json
git commit -m "chore: bump cursor-observability-plugin to <sha>"
```

并把上表里钉住的 commit 改成新值。
