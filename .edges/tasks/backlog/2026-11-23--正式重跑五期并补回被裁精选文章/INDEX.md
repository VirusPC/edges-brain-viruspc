---
metadata:
  edges-type: task
  edges-updated-at: '2026-11-23T21:35:45.563Z'
  edges-title: 正式重跑五期并补回被裁精选文章
  edges-tasks-status: backlog
  edges-task-priority: none
name: 正式重跑五期并补回被裁精选文章
description: >-
  ai-news-data#27 的 0.0.7 测试跑通过之后，再正式重跑五期，补回 10-23「天猫数字员工」和 10-30「Personal
  Agent」，并做站点核验。测试未通过前不替换线上数据。
---
**背景：**
关闭 [#572](https://github.com/VirusPC/edges-brain-viruspc/pull/572) 时约定：10-23「天猫数字员工」、10-30「Personal Agent」两篇在后面重新生成里补回。

2026-11-24 00:03–00:06 用户问「然后怎么做」「是不是只重跑部分节点就行」「是不是作为测试跑跑就行了，不用动线上数据？」，并同意测试跑与本周概览并行（「可以，两个agent」）。

数据仓 [ai-news-data#27](https://github.com/VirusPC/ai-news-data/pull/27) 的标题是「测试，勿合并：按 skill 0.0.7 重跑 2026-11-20」。2026-11-24 核对时它仍开着，没有合并。已合并的 [ai-news-data#28](https://github.com/VirusPC/ai-news-data/pull/28) 只补本周概览，不是五期正式重跑。

- 非目标：现在不要合并 #27。测试未通过时不要替换线上数据。不重开 #572。
- 关联：[#572](https://github.com/VirusPC/edges-brain-viruspc/pull/572)、[ai-news-data#27](https://github.com/VirusPC/ai-news-data/pull/27)、[ai-news-data#28](https://github.com/VirusPC/ai-news-data/pull/28)。

**目标：**
在测试跑（ai-news-data#27）通过之后，再正式重跑五期、补回上述两篇，并做站点核验。

**动作：**
- 先看 ai-news-data#27 的测试跑是否通过。通过之前不合并它，也不替换线上五期。
- 通过之后正式重跑五期，把 10-23「天猫数字员工」和 10-30「Personal Agent」补回，并做站点核验。

**完成标准：**
- [ ] 测试跑（ai-news-data#27）有通过结论之后，才做正式重跑；在此之前线上五期数据没有被这次测试替换。
- [ ] 五期正式重跑已完成，10-23「天猫数字员工」和 10-30「Personal Agent」出现在对应期次。
- [ ] 站点核验能看到补回的这两篇。
