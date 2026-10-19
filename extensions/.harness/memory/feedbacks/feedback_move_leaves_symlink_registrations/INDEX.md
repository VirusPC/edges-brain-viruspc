---
name: feedback_move_leaves_symlink_registrations
description: >-
  改 NodeService.move
  或父级登记匹配时：软链接登记是指向别处的链接，不是节点本身；只迁移非软链接的那条登记，不改写、不删除、不重定向；断链是预期，交给诊断，不要在 move
  里修。
metadata:
  edges-title: move 不改写软链接登记
  edges-type: feedback
  edges-origin-session-id: bc-26a663b5-98fe-51ee-82aa-08690d91a997
  edges-agent-client: cursor
  edges-username: Cursor Agent
  edges-email: cursoragent@cursor.com
  edges-updated-at: '2026-10-18T19:10:44+00:00'
---

软链接登记是指向别处的一条链接，不是被移动节点本身。`move` 只迁移该节点自己的非软链接登记；软链接登记原样保留，因此可能仍指向旧位置而断开。这是预期行为。

**Why:** 与 Unix `mv` 一致，也与本仓索引迁移跳过软链接一致。用 `canonicalPath` 把软链接当成节点别名时，跨父级移动会删掉或改写这条链接。断开的登记由人决定修或删，移动本身不重定向。2026-10-11 用户确认。

**How to apply:** 匹配父级登记时先用 `firstSymlink` 排除软链接，再比较 `canonicalPath`。`removeChild`、`addChild`、`carryReferenceSuffix` 只作用于节点自己的那条登记。发现和校验图时不要把软链接登记加载成节点。不要在 `move` 里重写软链接目标。`edges memory doctor` 的 `dead-entry` 只看下层 `AGENTS.md` 登记，不会报告一般节点上指向缺失目标的软链接登记；补上这个诊断之前，不要假定 doctor 能发现这类断链。
