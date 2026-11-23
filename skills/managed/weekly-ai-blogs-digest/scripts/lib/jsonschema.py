"""JSON Schema 的一个小子集，只够校验本 skill 的契约。不依赖第三方包。"""

from __future__ import annotations

import re
from typing import Any


def validate(instance: Any, schema: dict, path: str = "$") -> list[str]:
    errors: list[str] = []

    def fail(message: str) -> None:
        errors.append(f"{path}: {message}")

    if not isinstance(schema, dict):
        fail("schema 不是 object")
        return errors

    if "const" in schema and instance != schema["const"]:
        fail(f"必须是 {schema['const']!r}")
        return errors

    if "enum" in schema and instance not in schema["enum"]:
        fail(f"必须是 {schema['enum']!r} 之一")
        return errors

    expected = schema.get("type")
    if expected is not None and not _matches_type(instance, expected):
        fail(f"类型应为 {expected}，实际是 {_type_name(instance)}")
        return errors

    if isinstance(instance, str):
        if "minLength" in schema and len(instance) < schema["minLength"]:
            fail(f"长度至少 {schema['minLength']}")
        if "maxLength" in schema and len(instance) > schema["maxLength"]:
            fail(f"长度至多 {schema['maxLength']}")
        if "pattern" in schema and re.fullmatch(schema["pattern"], instance) is None:
            fail(f"不符合 {schema['pattern']}")

    if isinstance(instance, (int, float)) and not isinstance(instance, bool):
        if "minimum" in schema and instance < schema["minimum"]:
            fail(f"不能小于 {schema['minimum']}")
        if "exclusiveMinimum" in schema and instance <= schema["exclusiveMinimum"]:
            fail(f"必须大于 {schema['exclusiveMinimum']}")

    if isinstance(instance, dict):
        required = schema.get("required") or []
        for key in required:
            if key not in instance:
                errors.append(f"{path}.{key}: 缺少")
        properties = schema.get("properties") or {}
        additional = schema.get("additionalProperties", True)
        if "minProperties" in schema and len(instance) < schema["minProperties"]:
            fail(f"至少要有 {schema['minProperties']} 个字段")
        for key, value in instance.items():
            if key in properties:
                errors.extend(validate(value, properties[key], f"{path}.{key}"))
            elif additional is False:
                fail(f"不允许字段 {key}")

    if isinstance(instance, list):
        if "minItems" in schema and len(instance) < schema["minItems"]:
            fail(f"至少 {schema['minItems']} 项")
        if "maxItems" in schema and len(instance) > schema["maxItems"]:
            fail(f"至多 {schema['maxItems']} 项")
        if schema.get("uniqueItems") and len(instance) != len(_freeze(instance)):
            fail("有重复项")
        prefix = schema.get("prefixItems")
        if isinstance(prefix, list):
            if len(instance) < len(prefix):
                fail(f"至少要有 {len(prefix)} 项按位校验")
            for index, item_schema in enumerate(prefix):
                if index >= len(instance):
                    break
                if isinstance(item_schema, dict):
                    errors.extend(validate(instance[index], item_schema, f"{path}[{index}]"))
            if "items" not in schema and len(instance) > len(prefix):
                fail(f"至多 {len(prefix)} 项")
        item_schema = schema.get("items")
        if isinstance(item_schema, dict):
            start = len(prefix) if isinstance(prefix, list) else 0
            for index, value in enumerate(instance[start:], start=start):
                errors.extend(validate(value, item_schema, f"{path}[{index}]"))

    return errors


def _matches_type(instance: Any, expected: Any) -> bool:
    if isinstance(expected, list):
        return any(_matches_type(instance, item) for item in expected)
    if expected == "object":
        return isinstance(instance, dict)
    if expected == "array":
        return isinstance(instance, list)
    if expected == "string":
        return isinstance(instance, str)
    if expected == "number":
        return isinstance(instance, (int, float)) and not isinstance(instance, bool)
    if expected == "integer":
        return isinstance(instance, int) and not isinstance(instance, bool)
    if expected == "boolean":
        return isinstance(instance, bool)
    if expected == "null":
        return instance is None
    return False


def _type_name(instance: Any) -> str:
    if instance is None:
        return "null"
    if isinstance(instance, bool):
        return "boolean"
    if isinstance(instance, str):
        return "string"
    if isinstance(instance, int):
        return "integer"
    if isinstance(instance, float):
        return "number"
    if isinstance(instance, list):
        return "array"
    if isinstance(instance, dict):
        return "object"
    return type(instance).__name__


def _freeze(values: list[Any]) -> set[Any]:
    frozen = set()
    for value in values:
        if isinstance(value, (str, int, float, bool)) or value is None:
            frozen.add(value)
        else:
            frozen.add(repr(value))
    return frozen
