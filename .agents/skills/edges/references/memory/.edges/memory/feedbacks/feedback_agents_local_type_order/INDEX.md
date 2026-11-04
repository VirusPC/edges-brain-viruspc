---
name: feedback_agents_local_type_order
description: 改 AGENTS.md 本层记忆清单或挑类型时：先 user，再 feedback，再 project（兜底），再 reference；skills / agent_skills 仍靠后。
metadata:
  edges-title: AGENTS.md 本层入口顺序：user → feedback → project → reference
  edges-type: feedback
  edges-origin-session-id: bc-663b0001-3491-4486-adc3-bb07786f26e8
  edges-agent-client: cursor
  edges-username: Coding 专家
  edges-email: grok-bot@users.noreply.github.com
  edges-updated-at: "2026-09-11T12:07:27+00:00"
---

`AGENTS.md` 本层记忆清单的顺序是检索优先级：`user` → `feedback` → `project` → `reference`。`project` 是兜底——对不上更具体的类型再走它。`skills` / `agent_skills` 仍放在后面。

**Why:**

用户纠正：先前把 `user` 插在 `project` 和 `reference` 之间，扫入口时不像「先个人、再纠正、再项目兜底、再外部资料」。清单顺序会被当成挑类型的默认路径，错序会让人先掉进 `project`。

**How to apply:**

- 改 `AGENTS.tmpl.md` 本层记忆区块的行序，不要手改各层 `AGENTS.md`；init / doctor 按模板刷新。
- 写或检索时先问是不是本仓不宜公开的个人材料（`user`），再问是不是纠正/禁区（`feedback`）；都不是、也不是外部指针，再进 `project`。
- 不要为了「和 Claude Code 官方四类字母序/官方序对齐」把 `user` 放到 `reference` 前面或 `feedback` 后面。
