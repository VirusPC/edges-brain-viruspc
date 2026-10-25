"""Langfuse Custom Experiment webhook.

本包只接收 Langfuse 的 remote experiment 触发、做校验和后台调度。
具体评测（包括任何消融或模型调用）不在这里实现。
"""

__version__ = "0.1.0"
