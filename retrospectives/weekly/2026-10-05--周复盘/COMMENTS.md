# 2026-10-05 周复盘 · 用户评论

正文 `INDEX.md` 保持原样，之后的更正和评论记在这里。

## 2026-10-19

- 更正：正文「代码审查、断掉的软链接、中文任务名」一节说 [#208](https://github.com/VirusPC/edges/pull/208)、[#211](https://github.com/VirusPC/edges/pull/211) 随 [#204](https://github.com/VirusPC/edges/pull/204) 合入，这是错的。两者 10-11 合进的是叠层分支，#204 早几秒把该栈 squash 进 main，main 里从来没有它们。修复由 [#289](https://github.com/VirusPC/edges/pull/289) 重新实现，10-19 09:32 合入，早于 1.5.0 发版。详见 [2026-10-12 周复盘](../2026-10-12--周复盘/INDEX.md)。
