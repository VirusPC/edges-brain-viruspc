# Retrieval smoke edges__codex__retrieval-smoke_edges

Evaluation Smoke. 这是链路记录，不是公开基准证明，也不是项目记忆有效的证据。

- repository: `https://github.com/VirusPC/edges.git`
- ref: `main`
- commit: `85e1b9e0b972394e8fa2de0af823e40b099e51ef`
- client: `codex`
- samples: `retrieval-smoke/edges`

## Macro

| metric | value |
| --- | --- |
| R@5 | 0.8333 |
| P@5 | 0.2000 |
| nDCG@5 | 0.8333 |
| MAP@5 | 0.8333 |
| MRR | 0.8333 |
| Hit@5 | 0.8333 |
| score | 0.8333 |

## Samples

| id | score | grade | predicted |
| --- | --- | --- | --- |
| edges_smoke_0008 | 1.0000 | good | `docs/adr/0008-evaluation-smoke-is-not-benchmark-proof.md`, `.harness/evaluation/reports/2026-09-16-locomo-smoke-kimi-for-coding.md`, `.harness/tasks/_default/done/2026-09-16--LoCoMo评测流水线冒烟/INDEX.md`, `CONTEXT.md`, `.harness/evaluation/README.md` |
| edges_smoke_compose | 1.0000 | good | `docs/adr/0034-compose-harness-repos-into-workspace.md`, `extensions/cli/README.md`, `CONTEXT.md`, `docs/superpowers/specs/2026-10-18-compose-node-design.md`, `extensions/cli/src/domain/models/README.md` |
| edges_smoke_git_memory | 1.0000 | good | `notes/2026-10-14--基于-git-repo-与文件系统的-agent-memory/INDEX.md`, `projects/memory/2026-10-17-Letta与Devin-git记忆的接入检索与沉淀.md`, `projects/memory/memory-filesystem-tree-related-work.md`, `projects/memory/2026-10-13-Devin-Agent-Memory-Repo.md`, `projects/memory/2026-10-14-Agent-Memory-Dreaming调研.md` |
| edges_smoke_system_entry | 1.0000 | good | `CONTEXT.md`, `docs/adr/0029-recursive-system-two-entries.md`, `.harness/memory/projects/project_recursive_system_two_entry/INDEX.md`, `docs/superpowers/specs/2026-10-06-recursive-system-two-entries-design.md`, `docs/adr/0035-harness-readme-as-layer-material-index.md` |
| edges_smoke_mem0 | 1.0000 | good | `edges/AI-LLM/知识&记忆/mem0/INDEX.md`, `edges/一口气读完Agent Memory的21篇论文/INDEX.md`, `edges/AI-LLM/知识&记忆/对话历史记录管理/INDEX.md` |
| edges_smoke_locomo_runner | 0.0000 | bad | `.harness/evaluation/README.md`, `.harness/evaluation/cases/locomo-smoke/README.md`, `.harness/evaluation/third_party/README.md`, `docs/adr/0008-evaluation-smoke-is-not-benchmark-proof.md`, `.harness/evaluation/reports/2026-09-16-locomo-smoke-kimi-for-coding.md` |
