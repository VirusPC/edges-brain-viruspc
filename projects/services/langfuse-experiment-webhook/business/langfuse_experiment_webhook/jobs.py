from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Any

from langfuse_experiment_webhook.config import Config
from langfuse_experiment_webhook.langfuse_api import fetch_dataset_summary
from langfuse_experiment_webhook.runner import post_runner, run_command
from langfuse_experiment_webhook.sanitize import sanitize


@dataclass(frozen=True)
class Job:
    job_id: str
    project_id: str
    dataset_id: str
    dataset_name: str
    payload: Any


@dataclass
class Dependencies:
    fetch_dataset: Any = fetch_dataset_summary
    run_command: Any = run_command
    post_runner: Any = post_runner


def default_dependencies() -> Dependencies:
    return Dependencies()


def run_job(job: Job, config: Config, deps: Dependencies | None = None) -> dict[str, Any]:
    """后台任务。dry-run 只记日志并可选地读取数据集条数，不调用 runner。"""
    deps = deps or default_dependencies()
    logging.info(
        "job start %s",
        _dumps(
            {
                "jobId": job.job_id,
                "projectId": job.project_id,
                "datasetId": job.dataset_id,
                "datasetName": job.dataset_name,
                "dryRun": config.dry_run,
                "payload": sanitize(job.payload),
            }
        ),
    )

    dataset: dict[str, Any] | None = None
    dataset_error: str | None = None
    if config.langfuse_configured:
        try:
            dataset = deps.fetch_dataset(config, job.dataset_name)
        except Exception as exc:
            dataset_error = type(exc).__name__
            logging.warning(
                "dataset fetch failed jobId=%s error=%s",
                job.job_id,
                dataset_error,
            )
    else:
        logging.info(
            "dataset fetch skipped jobId=%s reason=langfuse_api_not_configured",
            job.job_id,
        )

    runner: dict[str, Any]
    if config.dry_run:
        runner = {"skipped": True, "reason": "dry_run"}
        logging.info("runner skipped jobId=%s reason=dry_run", job.job_id)
    else:
        outgoing = {
            "jobId": job.job_id,
            "projectId": job.project_id,
            "datasetId": job.dataset_id,
            "datasetName": job.dataset_name,
            "payload": job.payload,
            "dryRun": False,
            "dataset": dataset,
        }
        command_result = deps.run_command(config, outgoing)
        url_result = deps.post_runner(config, outgoing)
        runner = {"command": command_result, "url": url_result}

    result = {
        "jobId": job.job_id,
        "dryRun": config.dry_run,
        "datasetName": job.dataset_name,
        "payload": sanitize(job.payload),
        "dataset": dataset,
        "datasetError": dataset_error,
        "runner": runner,
    }
    logging.info("job finished %s", _dumps(sanitize(result)))
    return result


def _dumps(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, default=str)
