---
title: json.dumps 与 JSON.stringify 的默认差异
---
# json.dumps 与 JSON.stringify 的默认差异

`json.dumps` 基本相当于 `TypeScript` 里的 `JSON.stringify`，都是把对象转成 JSON 字符串。反方向的 `json.loads` 对应 `JSON.parse`。用的时候有四处默认行为不一样。

## 对应关系

| `Python` | `TypeScript` / `JavaScript` |
| --- | --- |
| `json.dumps` | `JSON.stringify` |
| `json.loads` | `JSON.parse` |

## 四处默认差异

1. **中文处理。** `JSON.stringify` 默认保留中文原样；`json.dumps` 默认会把中文转成 `\uXXXX`。加上 `ensure_ascii=False` 后，效果才和 `JSON.stringify` 一致。
2. **默认格式。** `json.dumps` 默认在冒号和逗号后面带空格，输出 `{"a": 1, "b": 2}`；`JSON.stringify` 输出紧凑的 `{"a":1,"b":2}`。要和 `JavaScript` 完全一致，可以传 `separators=(",", ":")`。
3. **不支持的类型。** `json.dumps` 碰到 `datetime`、自定义对象这类类型会直接抛 `TypeError`；`JSON.stringify` 会静默丢掉 `undefined` 和函数。
4. **格式化输出。** 写法类似：`JSON.stringify(obj, null, 2)` 对应 `json.dumps(obj, indent=2)`。

## 对齐紧凑输出的写法

对普通的对象、数组、字符串、数字、布尔值和空值（字符串里可以含中文），下面这样调用的输出与 `JSON.stringify(obj)` 一致：

```python
import json

obj = {"name": "你好", "n": 1}
json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
# '{"name":"你好","n":1}'
```
