# html-plan 来源

本目录除本文件外，均从上游原样拷贝，未改动内容。

- 上游仓库：<https://github.com/anthropics/claude-plugins-community>（Anthropic 社区插件市场的只读镜像）
- 上游路径：`html-plan/skills/html-plan/`（插件 `html-plan`，作者 Thariq Shihipar）
- 拷贝时的上游 commit：`06ec7b6a0a82bdc4bec44bd82d4368c42f20d7c1`（该目录最后一次变更：`88003be1129c09381d27100b37a8fdc21b3214bf`）
- 原安装方式（Claude Code）：`claude plugin install html-plan@claude-community`
- 未拷贝：插件外壳 `html-plan/.claude-plugin/plugin.json` 与插件级 `html-plan/README.md`

## 许可证

`LICENSE` 是上游仓库根目录的 Apache License 2.0 原文。上游插件 `plugin.json` 另标 `"license": "MIT"`，但上游仓库没有 MIT 许可文本；按仓库根 `LICENSE` 保留。

## 使用注意

- `SKILL.md` 按 Claude Code 斜杠命令写：`/html-plan <要做的事>`，正文用 `$ARGUMENTS` 接参数。其他 Agent 没有这个替换时，把 `$ARGUMENTS` 理解为用户的需求描述。
- 打包需要 `node`：`node <skill 目录>/runtime/pack.mjs plan.html --root <repo>`，生成 `plan.packed.html`。
- `--artifact` 与「Artifact tool」只在有对应工具的客户端可用。

## 同步上游

```bash
git clone --depth 1 https://github.com/anthropics/claude-plugins-community /tmp/cpc
rsync -a --delete --exclude UPSTREAM.md --exclude LICENSE /tmp/cpc/html-plan/skills/html-plan/ shared-extensions/skills/html-plan/
cp /tmp/cpc/LICENSE shared-extensions/skills/html-plan/LICENSE
```

同步后更新本文件的 commit，并按本层约定升 `VERSION`、写 `CHANGELOG.md`。
