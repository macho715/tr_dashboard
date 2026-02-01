#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sync files/agi tr final schedule.json -> data/schedule/option_c.json
Run after agent pipeline completes.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "files" / "agi tr final schedule.json"
TARGET = ROOT / "data" / "schedule" / "option_c.json"


def main() -> None:
    if not SOURCE.is_file():
        print(f"SKIP: {SOURCE} not found")
        return

    data = json.loads(SOURCE.read_text(encoding="utf-8"))
    if "activities" not in data or not isinstance(data["activities"], list):
        print("ERROR: Invalid JSON structure (missing activities)")
        return

    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Synced: {SOURCE.name} -> {TARGET.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
