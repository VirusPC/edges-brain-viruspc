"""Cluster retrieval metrics at K=5.

Flat ground truth `["a", "b"]` is two clusters that must all be covered.
Nested ground truth `[["a", "a2"], ["b"]]` means any document inside a cluster covers it.
Ordered score is R@5, matching the source scorer.
"""

from __future__ import annotations

import math
from typing import Any, Sequence

CUTOFF_K = 5
GOOD_THRESHOLD = 0.70
BAD_THRESHOLD = 0.40


def parse_clusters(raw: Sequence[Any]) -> list[list[str]]:
    """Normalize a sample ground_truth array into clusters."""
    if not raw:
        return []
    if all(isinstance(item, str) for item in raw):
        return [[item] for item in _unique(raw)]
    if all(isinstance(item, list) for item in raw):
        clusters: list[list[str]] = []
        seen: set[str] = set()
        for group in raw:
            cluster = []
            for doc in _unique(group):
                if doc in seen:
                    continue
                seen.add(doc)
                cluster.append(doc)
            if cluster:
                clusters.append(cluster)
        return clusters
    raise ValueError("ground_truth must be all strings or all clusters")


def score_prediction(ground_truth: Sequence[Any], predicted: Sequence[str]) -> dict[str, Any]:
    """Score one ordered prediction. Empty ground truth is a negative example."""
    clusters = parse_clusters(list(ground_truth))
    ranked = _unique(predicted)
    if not clusters:
        empty_correct = 1.0 if not ranked else 0.0
        return {
            "mode": "ordered_no_confidence",
            "gt_empty": True,
            "ground_truth_length": 0,
            "predicted_length": len(ranked),
            "hits": 0,
            "empty_correct": empty_correct,
            "score": empty_correct,
            "grade": _grade(empty_correct),
            "predicted": ranked,
        }

    k = CUTOFF_K
    metrics = {
        "mode": "ordered_no_confidence",
        "gt_empty": False,
        "ground_truth_length": len(clusters),
        "predicted_length": len(ranked),
        "hits": len(_covered(ranked, clusters)),
        f"P@{k}": _precision_at_k(ranked, clusters, k),
        f"R@{k}": _recall_at_k(ranked, clusters, k),
        f"nDCG@{k}": _ndcg_at_k(ranked, clusters, k),
        f"MAP@{k}": _average_precision_at_k(ranked, clusters, k),
        "MRR": _mrr(ranked, clusters),
        f"Hit@{k}": _hit_at_k(ranked, clusters, k),
        "set_precision": _set_precision(ranked, clusters),
        "set_recall": _set_recall(ranked, clusters),
        "predicted": ranked,
    }
    score = float(metrics[f"R@{k}"])
    metrics["score"] = score
    metrics["grade"] = _grade(score)
    return metrics


def aggregate(samples: Sequence[dict[str, Any]]) -> dict[str, Any]:
    """Macro-average positive samples. Empty-ground-truth rows stay out of the mean."""
    positive = [row for row in samples if not row.get("gt_empty") and not row.get("skipped")]
    keys = ["P@5", "R@5", "nDCG@5", "MAP@5", "MRR", "Hit@5", "score"]
    macro = {key: _mean([row[key] for row in positive if row.get(key) is not None]) for key in keys}
    return {
        "count": len(samples),
        "positive_count": len(positive),
        "macro": macro,
    }


def _precision_at_k(ranked: Sequence[str], clusters: Sequence[Sequence[str]], k: int) -> float:
    relevant = {doc for cluster in clusters for doc in cluster}
    hits = sum(1 for doc in ranked[:k] if doc in relevant)
    return hits / k


def _recall_at_k(ranked: Sequence[str], clusters: Sequence[Sequence[str]], k: int) -> float:
    if k <= 0:
        return 0.0
    return len(_covered(ranked[:k], clusters)) / len(clusters)


def _hit_at_k(ranked: Sequence[str], clusters: Sequence[Sequence[str]], k: int) -> float:
    return 1.0 if _covered(ranked[:k], clusters) else 0.0


def _ndcg_at_k(ranked: Sequence[str], clusters: Sequence[Sequence[str]], k: int) -> float:
    seen: set[int] = set()
    dcg = 0.0
    for index, doc in enumerate(ranked[:k], start=1):
        cluster_index = _cluster_index(doc, clusters)
        if cluster_index is None or cluster_index in seen:
            continue
        seen.add(cluster_index)
        dcg += 1.0 / math.log2(index + 1)
    ideal_n = min(k, len(clusters))
    idcg = sum(1.0 / math.log2(i + 1) for i in range(1, ideal_n + 1))
    if idcg == 0.0:
        return 0.0
    return dcg / idcg


def _average_precision_at_k(
    ranked: Sequence[str], clusters: Sequence[Sequence[str]], k: int
) -> float:
    seen: set[int] = set()
    total = 0.0
    for index, doc in enumerate(ranked[:k], start=1):
        cluster_index = _cluster_index(doc, clusters)
        if cluster_index is None or cluster_index in seen:
            continue
        seen.add(cluster_index)
        total += len(seen) / index
    return total / len(clusters)


def _mrr(ranked: Sequence[str], clusters: Sequence[Sequence[str]]) -> float:
    for index, doc in enumerate(ranked, start=1):
        if _cluster_index(doc, clusters) is not None:
            return 1.0 / index
    return 0.0


def _set_precision(ranked: Sequence[str], clusters: Sequence[Sequence[str]]) -> float:
    if not ranked:
        return 0.0
    relevant = {doc for cluster in clusters for doc in cluster}
    return len(set(ranked) & relevant) / len(set(ranked))


def _set_recall(ranked: Sequence[str], clusters: Sequence[Sequence[str]]) -> float:
    return len(_covered(ranked, clusters)) / len(clusters)


def _covered(ranked: Sequence[str], clusters: Sequence[Sequence[str]]) -> set[int]:
    return {
        index
        for index, _cluster in enumerate(clusters)
        if any(_cluster_index(doc, clusters) == index for doc in ranked)
    }


def _cluster_index(doc: str, clusters: Sequence[Sequence[str]]) -> int | None:
    for index, cluster in enumerate(clusters):
        if doc in cluster:
            return index
    return None


def _unique(items: Sequence[Any]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for item in items:
        if not isinstance(item, str) or item in seen:
            continue
        seen.add(item)
        out.append(item)
    return out


def _mean(values: Sequence[float]) -> float | None:
    if not values:
        return None
    return sum(values) / len(values)


def _grade(score: float) -> str:
    if score >= GOOD_THRESHOLD:
        return "good"
    if score < BAD_THRESHOLD:
        return "bad"
    return "mid"
