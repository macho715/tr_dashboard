#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sync all agent pipeline outputs to dashboard data.
Runs: schedule sync, tide generation + sync, optional weather/go_nogo sync.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def run_sync_schedule() -> bool:
    result = subprocess.run(
        [sys.executable, str(ROOT / "scripts" / "sync_schedule_to_dashboard.py")],
        cwd=str(ROOT),
    )
    return result.returncode == 0


def run_tide_generation() -> bool:
    tide_script = ROOT / "files" / "tide_to_voyage_overview.py"
    if not tide_script.is_file():
        print("SKIP: tide_to_voyage_overview.py not found")
        return True
    out_json = ROOT / "files" / "out" / "tide_voyage.json"
    out_json.parent.mkdir(parents=True, exist_ok=True)
    result = subprocess.run(
        [sys.executable, str(tide_script), "--output-json", str(out_json)],
        cwd=str(ROOT / "files"),
    )
    return result.returncode == 0


def run_sync_tide() -> bool:
    result = subprocess.run(
        [sys.executable, str(ROOT / "scripts" / "sync_tide_to_dashboard.py")],
        cwd=str(ROOT),
    )
    return result.returncode == 0


def sync_weather_if_exists() -> bool:
    src = ROOT / "files" / "out" / "weather.json"
    tgt = ROOT / "data" / "schedule" / "weather.json"
    if not src.is_file():
        return True
    try:
        data = json.loads(src.read_text(encoding="utf-8"))
        tgt.parent.mkdir(parents=True, exist_ok=True)
        tgt.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"Synced: {src.name} -> {tgt.relative_to(ROOT)}")
    except Exception as e:
        print(f"WARN: weather sync failed: {e}")
    return True


def sync_go_nogo_if_exists() -> bool:
    src = ROOT / "files" / "out" / "go_nogo.json"
    tgt = ROOT / "data" / "schedule" / "go_nogo.json"
    if not src.is_file():
        return True
    try:
        data = json.loads(src.read_text(encoding="utf-8"))
        tgt.parent.mkdir(parents=True, exist_ok=True)
        tgt.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"Synced: {src.name} -> {tgt.relative_to(ROOT)}")
    except Exception as e:
        print(f"WARN: go_nogo sync failed: {e}")
    return True


def main() -> None:
    print("=== Agent -> Dashboard Sync ===\n")
    sys.stdout.flush()
    ok = True
    ok = run_sync_schedule() and ok
    ok = run_tide_generation() and ok
    ok = run_sync_tide() and ok
    sync_weather_if_exists()
    sync_go_nogo_if_exists()
    print("\n=== Done ===")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
