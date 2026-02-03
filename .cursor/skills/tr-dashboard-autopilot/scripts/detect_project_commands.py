#!/usr/bin/env python3
"""
Detect runnable commands from package.json without guessing.

Outputs JSON to stdout:
{
  "package_managers": ["pnpm","npm","yarn"],
  "workspace_root": "...",
  "scripts": {
     "dev": "pnpm dev",
     "lint": "pnpm lint",
     "typecheck": "pnpm typecheck",
     "test": "pnpm test",
     "build": "pnpm build"
  },
  "notes": [...]
}
"""

import json
import os
import sys
from pathlib import Path

CANDIDATE_SCRIPT_KEYS = {
    "dev": ["dev", "start"],
    "lint": ["lint"],
    "typecheck": ["typecheck", "tsc", "check-types"],
    "test": ["test", "unit", "ci:test"],
    "build": ["build"],
}

LOCKFILES = [
    ("pnpm", "pnpm-lock.yaml"),
    ("npm", "package-lock.json"),
    ("yarn", "yarn.lock"),
]


def find_repo_root(start: Path) -> Path:
    cur = start.resolve()
    for _ in range(10):
        if (cur / ".git").exists() or (cur / "package.json").exists():
            return cur
        if cur.parent == cur:
            break
        cur = cur.parent
    return start.resolve()


def load_package_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def pick_pm(root: Path):
    pm = []
    for name, lf in LOCKFILES:
        if (root / lf).exists():
            pm.append(name)
    if "pnpm" in pm:
        return "pnpm", pm
    if "npm" in pm:
        return "npm", pm
    if "yarn" in pm:
        return "yarn", pm
    return "npm", pm


def detect_scripts(pkg: dict, pm: str):
    scripts = pkg.get("scripts", {}) if isinstance(pkg, dict) else {}
    result = {}
    notes = []

    for logical, keys in CANDIDATE_SCRIPT_KEYS.items():
        found = None
        for k in keys:
            if k in scripts:
                found = k
                break
        if found:
            if pm == "npm":
                result[logical] = f"npm run {found}" if found not in ["start"] else "npm start"
            elif pm == "yarn":
                result[logical] = f"yarn {found}"
            else:
                result[logical] = f"pnpm {found}"
        else:
            notes.append(f"missing_script:{logical}")

    return result, notes


def main():
    cwd = Path(os.getcwd())
    root = find_repo_root(cwd)
    pkg_path = root / "package.json"
    pkg = load_package_json(pkg_path) if pkg_path.exists() else None

    pm, pms = pick_pm(root)
    scripts, notes = detect_scripts(pkg or {}, pm)

    out = {
        "workspace_root": str(root),
        "package_manager": pm,
        "package_managers": pms,
        "package_json": str(pkg_path) if pkg_path.exists() else None,
        "scripts": scripts,
        "notes": notes,
    }
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
