---
name: edges-memory-add-type
description: 在所选作用域或主题 Project 按 LAYOUT 登记一个自定义 Memory Type。仅当用户明确要求新增 type 时使用。官方类型按选择采用；不要把示例 type 写进 init 模板。
version: 0.2.0
---

# Project Memory Add Type

在已经有有效系统入口的 scope 内登记自定义 Memory Type。类型 README 记录身份与权限，材料清单登记发现入口，不另写 JSON/YAML 注册表。选择主题 Project 时保持原 scope，使用根参数 `--project <相对 scope/.edges/projects 的路径>`，类型直接写在 Project 的 memory / skills 下，登记到 Project INDEX；同名类型只在所选材料根内检查唯一性，不另建 AGENTS 或 .edges。PROTOCOL 不枚举类型，具体布局以 LAYOUT 为准。

执行前确认 `edges memory add-type --help` 可用。类型布局见 [`LAYOUT.md`](../edges/references/memory/references/LAYOUT.md)，执行能力由 Edges CLI 提供。

## 什么时候用

- 用户明确要求「给这一层加一个 type / 登记一个 Memory Type」。
- 不要在 remember / ask / doctor / init 里代为调用。
- 不要把 `docs` / `progress` / `tasks` / `research` / `reminder` / `scheduler` 写进 `AGENTS.tmpl.md`。它们只是示例名，用户要才登记。
- `tasks` Memory Type ≠ 作用域 `tasks/` 或 `.edges/tasks/` 看板。看板状态夹本 skill 碰都不能碰。

## 步骤

1. 确认原 scope 有有效 AGENTS，并确定要采用类型的材料根；可以只有 Skills，选定 Project 也不要求先采用其他 Memory 类型。缺系统入口时说明缺口，在用户明确授权后按 [memory-init.md](../edges/references/memory-init.md) 初始化，不给 Project 补 AGENTS。
2. 要 `--name`（小写 snake_case，不能是 `user` / `feedback` / `project` / `reference` / `managed` / `referenced`）和一句 `--description`（写进本层清单，供 ask 挑选）。
3. 特权 flag 只在用户点名时加：
   - `--gitignore`：按用户记忆 / ADR-0003 把入口与复数目录追加进仓库根 `.gitignore`（含 `**/` 下层）。
   - `--index-only`：只索引，remember 拒绝写入。
   - `--skills-format`：条目形态为 `<name>/SKILL.md`，不改变所属模块。
   - `--external-content-dir`：当前不支持，CLI 会拒绝；不要绕过它增加外部内容映射。
4. 执行：

   ```bash
   edges --scope <目录> memory add-type \
     --module memory \
     --name <type> \
     --description <一句说明> \
     [--gitignore] [--index-only] [--skills-format]
   ```

   属于主题时，在 `memory` 前加 `--project <P/projects/Q>`；不要把 Project 路径填进 `--target-dir`。`--super` / `--all` 不改变登记目标。

5. 按返回 JSON 汇报 `type` / `index` / `contentDir` / `action`，路径相对原 scope。若用户同时要求保存内容，用相同 scope / Project 调用 `$edges-memory-remember`；不要为了冒烟往真实记忆里写测试条目。

## 规则

- 能力面仍是 CLI + Skill + MCP 三者并列；本 Skill 调用 `edges memory add-type`。CLI 迁移本身不表示 Memory 的 MCP 入口已经实现。
- 布局按 LAYOUT，执行规则由 CLI service 维护，不另建类型总配置。
- 官方 init 种子不因示例膨胀。

`--module memory|skills` 默认 memory。模块与 format 独立；现有自定义类型不因 Skill 格式搬容器，同一材料根内的类型身份不能在两模块重复登记；不同 Project 可以各自采用同名类型。`--gitignore` 按实际路径覆盖索引和正文且在写入前生效。旧布局迁移和现有类型权限保留规则见 [LAYOUT](../edges/references/memory/references/LAYOUT.md)。
