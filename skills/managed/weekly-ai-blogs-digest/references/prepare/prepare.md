# 数据准备

输入是生成日、订阅真源和用户给出的补录。输出是 `issues/YYYY-MM-DD/raw/`。完整目录见 [数据存储](../../SKILL.md#数据存储)。

1. [确定窗口与入口](window.md)。
2. 然后三路并行，互不改写：
   - [文章与补录](articles.md)
   - [开源项目](projects.md)
   - [模型与榜单](models.md)
3. [汇合校验](check.md)。
