"""Retrieval eval: git repository × agent client × samples.

Importing this package puts `.harness/observation` on `sys.path`.
`langfuse_sink` is not installed; `import langfuse_sink` works after this
package has been imported. No third-party packages are required.
"""

from __future__ import annotations

import sys
from pathlib import Path

_OBSERVATION_DIR = Path(__file__).resolve().parents[2] / "observation"
if str(_OBSERVATION_DIR) not in sys.path:
    sys.path.insert(0, str(_OBSERVATION_DIR))
