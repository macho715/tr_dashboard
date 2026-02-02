#!/usr/bin/env python3
"""
DocOps: 문서 인벤토리/REF/이동계획/검증을 수행한다.
- plan: 변경 계획(JSON) 생성 (기본: apply 하지 않음)
- apply: 승인된 plan만 적용
- verify: 링크/REF/메타 규격 검증 리포트 생성

설계 원칙:
- Plan→Approve→Apply
- 이동/rename은 "계획 + 검증" 없이는 금지
"""

from __future__ import annotations

import json
import os
import re
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Tuple, Optional

REPO_ROOT = Path(__file__).resolve().parents[4]
DOCS_ROOT = REPO_ROOT / "docs"
META_ROOT = DOCS_ROOT / "_meta"
PLAN_PATH = META_ROOT / "plans" / "docops.plan.json"
REPORT_PATH = META_ROOT / "reports" / "docops.report.md"
INVENTORY_PATH = META_ROOT / "inventory" / "docs.inventory.json"

MD_GLOB = ["**/*.md"]

DOC_ID_RE = re.compile(r"^doc_id:\s*(.+?)\s*$", re.MULTILINE)
REFS_RE = re.compile(r"^refs:\s*\[(.*?)\]\s*$", re.MULTILINE)


def ensure_dirs() -> None:
    (DOCS_ROOT / "00_INBOX" / "chat").mkdir(parents=True, exist_ok=True)
    (META_ROOT / "inventory").mkdir(parents=True, exist_ok=True)
    (META_ROOT / "plans").mkdir(parents=True, exist_ok=True)
    (META_ROOT / "reports").mkdir(parents=True, exist_ok=True)


def load_config() -> Dict:
    # 기본값(필요 시 assets 예시를 복사해 docs/_meta/docops.config.json으로 오버라이드)
    cfg_path = DOCS_ROOT / "_meta" / "docops.config.json"
    if cfg_path.exists():
        return json.loads(cfg_path.read_text(encoding="utf-8"))
    return {
        "include_roots": ["docs", ".cursor", "."],
        "exclude_dirs": [".git", "node_modules", ".next", "dist", "build", ".vercel"],
        "canonical_docs_root": "docs",
        "require_frontmatter_doc_id": True,
        "auto_apply": False,
        "ref_policy": {
            "min_refs_for_core_docs": 1,
            "auto_add_refs_section": True,
        },
    }


def iter_markdown_files(cfg: Dict) -> List[Path]:
    files: List[Path] = []
    exclude = set(cfg.get("exclude_dirs", []))
    for root in cfg.get("include_roots", ["docs"]):
        base = (REPO_ROOT / root).resolve()
        if not base.exists():
            continue
        for pat in MD_GLOB:
            for p in base.glob(pat):
                if not p.is_file():
                    continue
                if any(part in exclude for part in p.parts):
                    continue
                files.append(p)
    # 중복 제거
    uniq = sorted(set(files))
    return uniq


def extract_refs(text: str) -> List[str]:
    # markdown 링크 / 파일명 언급 기반의 매우 보수적 탐지
    # (과도한 자동 REF 삽입을 피하기 위해, "명시 링크" + "핵심 SSOT 파일명"만 잡는다)
    refs = set()
    for m in re.findall(r"\]\(([^)]+)\)", text):
        if m.endswith(".md"):
            refs.add(m)
    for name in ["patch.md", "LAYOUT.md", "SYSTEM_ARCHITECTURE.md", "AGENTS.md"]:
        if name in text:
            refs.add(name)
    return sorted(refs)


def inventory(cfg: Dict) -> Dict:
    inv: Dict[str, Dict] = {}
    for p in iter_markdown_files(cfg):
        rel = str(p.relative_to(REPO_ROOT))
        txt = p.read_text(encoding="utf-8", errors="ignore")
        doc_id = None
        if cfg.get("require_frontmatter_doc_id", True):
            m = DOC_ID_RE.search(txt)
            if m:
                doc_id = m.group(1).strip()
        inv[rel] = {
            "path": rel,
            "doc_id": doc_id,
            "size": len(txt),
            "refs_found": extract_refs(txt),
            "has_patch_ref": "patch.md" in txt,
            "has_layout_ref": "LAYOUT.md" in txt,
        }
    return inv


def build_plan(cfg: Dict, inv: Dict) -> Dict:
    # 이동/rename은 "규칙 위반(예: docs 밖에 있는 문서)"만 아주 보수적으로 계획에 포함
    ops: List[Dict] = []
    canonical = cfg.get("canonical_docs_root", "docs")

    for rel, meta in inv.items():
        # 예: 루트에 흩어진 WORK_LOG_*.md를 docs/10_WORK로 이동하고 싶으면 여기 룰을 추가
        # 기본은 '계획 제안'만 하고 실제 이동은 사용자 승인 필요
        pass

    return {
        "version": "1.0",
        "auto_apply": bool(cfg.get("auto_apply", False)),
        "operations": ops,
        "notes": [
            "기본 정책: 이동/rename 계획은 최소화. 필요한 경우 rules에 추가.",
            "REF 자동 삽입은 보수적으로 수행(명시 링크 + 핵심 SSOT 파일명만).",
        ],
    }


def write_json(path: Path, data: Dict) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def verify_inventory(cfg: Dict, inv: Dict) -> Tuple[bool, List[str]]:
    issues: List[str] = []
    # doc_id 누락(선택적)
    if cfg.get("require_frontmatter_doc_id", True):
        for rel, meta in inv.items():
            if rel.endswith("README.md"):
                continue
            if meta.get("doc_id") is None and rel.startswith("docs/"):
                issues.append(f"- doc_id 누락: {rel}")
    ok = len(issues) == 0
    return ok, issues


def write_report(ok: bool, issues: List[str], inv: Dict) -> None:
    lines = []
    lines.append("# DocOps Report")
    lines.append("")
    lines.append(f"- Result: {'PASS' if ok else 'FAIL'}")
    lines.append(f"- Docs scanned: {len(inv)}")
    lines.append("")
    if issues:
        lines.append("## Issues")
        lines.extend(issues)
        lines.append("")
    REPORT_PATH.write_text("\n".join(lines), encoding="utf-8")


def cmd_plan() -> None:
    ensure_dirs()
    cfg = load_config()
    inv = inventory(cfg)
    write_json(INVENTORY_PATH, inv)
    plan = build_plan(cfg, inv)
    write_json(PLAN_PATH, plan)
    ok, issues = verify_inventory(cfg, inv)
    write_report(ok, issues, inv)
    print(f"Wrote inventory: {INVENTORY_PATH}")
    print(f"Wrote plan: {PLAN_PATH}")
    print(f"Wrote report: {REPORT_PATH}")


def cmd_apply(plan_path: str) -> None:
    ensure_dirs()
    cfg = load_config()
    plan = json.loads(Path(plan_path).read_text(encoding="utf-8"))
    if not plan.get("auto_apply", False) and not cfg.get("auto_apply", False):
        # 승인 게이트: auto_apply가 아니면 실행 중단
        raise SystemExit(
            "Apply blocked: auto_apply=false. 승인 후 docs/_meta/docops.config.json에서 auto_apply=true 설정 또는 plan에 auto_apply=true 필요."
        )
    for op in plan.get("operations", []):
        t = op.get("type")
        if t == "move":
            src = REPO_ROOT / op["from"]
            dst = REPO_ROOT / op["to"]
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(src), str(dst))
        else:
            raise SystemExit(f"Unknown op type: {t}")
    print("Apply done.")


def cmd_verify() -> None:
    ensure_dirs()
    cfg = load_config()
    inv = inventory(cfg)
    write_json(INVENTORY_PATH, inv)
    ok, issues = verify_inventory(cfg, inv)
    write_report(ok, issues, inv)
    print(f"Wrote report: {REPORT_PATH}")
    raise SystemExit(0 if ok else 2)


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        raise SystemExit("Usage: docops.py plan|apply <plan.json>|verify")
    cmd = sys.argv[1]
    if cmd == "plan":
        cmd_plan()
    elif cmd == "apply":
        if len(sys.argv) < 3:
            raise SystemExit("Usage: docops.py apply <plan.json>")
        cmd_apply(sys.argv[2])
    elif cmd == "verify":
        cmd_verify()
    else:
        raise SystemExit(f"Unknown command: {cmd}")
