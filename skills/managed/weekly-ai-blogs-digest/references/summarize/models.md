# 模型经验与榜单

把 `usable/models/` 的事实和榜单数字写成展示内容。不依赖文章选文，也不把 GitHub 项目榜写进来。

产出：

- `page/models/{id}.json`：一张模型卡片。三行是价格、速度、效果，数字和名次只用清洗结果。`rank` 不是正整数就不写名次，没有数字就写「暂无」。发布要点按上线、定位、成绩，最后一条是可用或实测。没有第三方实测就写可用。
- `page/models/boards/`：只存绘图数据，包括给读者的一句说明，以及圈谁、Arena 榜单发布日。不要求另存 SVG 或 PNG。博客按这些数据画图。

说明句写这张榜相对上一期可核验的变化；没有对比就只说本期格局。不写「数据取自」「快照」「抓取于」。没有证据就不写上升、下降或新进。Arena 名次变化对照上一期 `page/` 实际采用的那份榜，不用原始响应里的 `prior_publish_date` 代替。发布日与上一期相同就沿用那张图的数据，说明写榜没有换。对照时锁定上一期文件和版本。

Artificial Analysis 按智力指数取 Top 15。红圈只圈窗口内新发布、且出现在这张 Top 15 上的模型。OpenRouter 编程用量要写明是 token 用量，不是质量榜。

「GitHub Trending（weekly / all 前 5）」标题下面不要写概括前五名字的介绍句。那一组不属于模型榜。

站点还在读 markdown 时，模型发布要点用这张卡片。关键数字用一处 `<mark class="note-card-hl">` 包住原句里已有的数字。

```html
<aside class="info-card">
<p class="info-card-label"><span>发布要点</span></p>
<ul>
<li><strong>上线</strong> 哪一天、在哪发布。</li>
<li><strong>成绩</strong> 原文里的数字，用 <mark class="note-card-hl">一处数字</mark> 标出来。</li>
</ul>
<p class="info-card-note">来源：<a href="{{url}}">{{标题}}</a></p>
</aside>
```

画图工具仍是同级 skill [`llm-arena-marked-chart`](../../../llm-arena-marked-chart/SKILL.md)。它今天会导出图文件；目标数据产品只要 `page/models/boards/` 里的绘图数据。

榜单数字或模型事实变了，重写对应卡片、榜单数据和映射到这些 ID 的关键词。
