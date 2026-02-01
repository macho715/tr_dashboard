#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sync files/out/tide_voyage.json -> data/schedule/tide.json
Run after tide_to_voyage_overview.py --output-json.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "files" / "out" / "tide_voyage.json"
TARGET = ROOT / "data" / "schedule" / "tide.json"


def main() -> None:
    if not SOURCE.is_file():
        print(f"SKIP: {SOURCE} not found (run tide_to_voyage_overview.py --output-json first)")
        return

    data = json.loads(SOURCE.read_text(encoding="utf-8"))
    if "voyages" not in data or not isinstance(data["voyages"], list):
        print("ERROR: Invalid JSON structure (missing voyages)")
        return

    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Synced: {SOURCE.name} -> {TARGET.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
