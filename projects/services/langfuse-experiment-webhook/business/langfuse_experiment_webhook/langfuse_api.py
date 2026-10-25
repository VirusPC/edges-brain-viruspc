from __future__ import annotations

import base64
import json
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

from langfuse_experiment_webhook.config import Config


class LangfuseAPIError(Exception):
    def __init__(self, status: int, path: str):
        super().__init__(f"langfuse api status={status} path={path}")
        self.status = status
        self.path = path


def fetch_dataset_summary(config: Config, dataset_name: str) -> dict[str, Any]:
    """按名称读取数据集，并用 dataset-items 的 meta.totalItems 取条数。

    只保留 id 和计数。条目的 input / expectedOutput 不进入返回值。
    """
    if not config.langfuse_configured:
        raise LangfuseAPIError(0, "unconfigured")
    host = str(config.langfuse_host).rstrip("/")
    dataset_path = "/api/public/v2/datasets/" + urllib.parse.quote(dataset_name, safe="")
    dataset = _get_json(config, host + dataset_path, dataset_path)
    query = urllib.parse.urlencode(
        {"datasetName": dataset_name, "page": 1, "limit": 1}
    )
    items_path = "/api/public/dataset-items"
    items = _get_json(config, f"{host}{items_path}?{query}", items_path)
    meta = items.get("meta") if isinstance(items, dict) else None
    data = items.get("data") if isinstance(items, dict) else None
    sample_ids: list[str] = []
    if isinstance(data, list):
        for item in data:
            if isinstance(item, dict) and isinstance(item.get("id"), str):
                sample_ids.append(item["id"])
    return {
        "id": dataset.get("id") if isinstance(dataset, dict) else None,
        "name": dataset.get("name") if isinstance(dataset, dict) else dataset_name,
        "projectId": dataset.get("projectId") if isinstance(dataset, dict) else None,
        "itemCount": meta.get("totalItems") if isinstance(meta, dict) else None,
        "itemIdsSample": sample_ids,
        "page": meta.get("page") if isinstance(meta, dict) else None,
        "totalPages": meta.get("totalPages") if isinstance(meta, dict) else None,
    }


def _get_json(config: Config, url: str, path_for_errors: str) -> dict[str, Any]:
    token = base64.b64encode(
        f"{config.langfuse_public_key}:{config.langfuse_secret_key}".encode("utf-8")
    ).decode("ascii")
    request = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Basic {token}",
            "Accept": "application/json",
            "User-Agent": "langfuse-experiment-webhook",
        },
        method="GET",
    )
    try:
        with urllib.request.urlopen(request, timeout=config.langfuse_api_timeout_seconds) as response:
            raw = response.read()
            status = response.status
    except urllib.error.HTTPError as exc:
        exc.read()
        exc.close()
        raise LangfuseAPIError(exc.code, path_for_errors) from None
    except urllib.error.URLError as exc:
        raise LangfuseAPIError(0, path_for_errors) from exc
    if status < 200 or status >= 300:
        raise LangfuseAPIError(status, path_for_errors)
    parsed = json.loads(raw.decode("utf-8"))
    if not isinstance(parsed, dict):
        raise LangfuseAPIError(status, path_for_errors)
    return parsed
