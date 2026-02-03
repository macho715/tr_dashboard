#!/usr/bin/env python3
"""
SSOT Guard: Reuses autopilot validate_optionc.py.
Run from repo root. Searches data/schedule/option_c.json then option_c.json.
"""

from pathlib import Path
import runpy

_autopilot_script = (
    Path(__file__).resolve().parents[2]
    / "tr-dashboard-autopilot"
    / "scripts"
    / "validate_optionc.py"
)
runpy.run_path(str(_autopilot_script), run_name="__main__")
