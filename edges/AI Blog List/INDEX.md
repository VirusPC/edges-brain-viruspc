
1. https://www.anthropic.com/engineering
2. https://openai.com/zh-Hans-CN/news/
3. https://research.google/blog/
4. https://manus.im/blog
5. https://cursor.com/cn/blog
6.  https://cognition.ai/blog/1
7. https://blog.langchain.com/
8. https://ampcode.com/chronicle
9. https://www.trae.ai/blog
10. https://qoder.com/blog
11. https://www.codebuddy.ai/blog
12. https://qwen.ai/research
13. https://huggingface.co/blog
14. https://aws.amazon.com/cn/blogs/machine-learning/
15. https://sankalp.bearblog.dev/
16. https://latitude-blog.ghost.io/blog/
17. https://www.datacamp.com/blog/category/ai
18. https://lovable.dev/blog
19. https://kiro.dev/blog/
20. https://www.philschmid.de/
21. https://block.github.io/goose/blog
22. https://zed.dev/blog
23. https://roocode.com/blog


## 周报归档

- [周报索引与维护约定](weekly/README.md)

## 任务执行流程
1. 对于给定的每个blog网站，收集过去一段时间（时间范围默认取过去一周，不含当天）新发布的文章链接。
2. 确保链接真实有效，无效则尝试修复。
3. 对每一篇新发布的文章，分别进行不超过200字、突出重点的摘要汇总。如果和AI Coding相关，则增加一句话总结对于大前端研发的落地点或值得研究的方向
4. 对所有文章的摘要汇总，总结这段时间的技术风向，插到文章最前。
5. 将结果保存为 Markdown 到本仓 [`weekly/`](weekly/README.md)，并更新周报归档索引。

## 输出内容模版

### 文章整体框架

```
# {{yyyy-MM-DD}} AI Coding 资讯

## 本周风向：{{yyyy-MM-DD}}～{{yyyy-MM-DD}}
{{本周风向}}

## 文章总结列表
{{ 文章总结1 }}
{{ 文章总结2 }}
{{...}}
{{ 文章总结n }}

```

### 单篇文章总结模版
```md
### {{标题}} - {{yyyy-MM-DD}}

{{一段话内容}}

> 原始链接：{{}}
```
内容总结要求：
1. 200字以内
2. 一段话内讲完
3. 如果和AI Coding相关，则增加一句话总结对于大前端研发的落地点或值得研究的方向。 

## 强制要求

1. 网站链接**必须**确保真实有效。如果不存在，请尝试修复。
2. 文章总结按时间排序 

## 参考博客网址列表
```md
1. https://www.anthropic.com/engineering
2. https://openai.com/zh-Hans-CN/news/
3. https://research.google/blog/
4. https://manus.im/blog
5. https://cursor.com/cn/blog
6.  https://cognition.ai/blog/1
7. https://blog.langchain.com/
8. https://ampcode.com/chronicle
9. https://www.trae.ai/blog
10. https://qoder.com/blog
11. https://www.codebuddy.ai/blog
12. https://qwen.ai/research
13. https://huggingface.co/blog
14. https://aws.amazon.com/cn/blogs/machine-learning/
15. https://sankalp.bearblog.dev/
16. https://latitude-blog.ghost.io/blog/
17. https://www.datacamp.com/blog/category/ai
18. https://lovable.dev/blog
19. https://kiro.dev/blog/
20. https://www.philschmid.de/
21. https://block.github.io/goose/blog
22. https://zed.dev/blog
23. https://roocode.com/blog
```
