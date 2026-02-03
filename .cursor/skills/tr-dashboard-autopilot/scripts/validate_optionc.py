#!/usr/bin/env python3
"""
option_c.json validator aligned to Contract v0.8.0.

Modes:
- VALIDATION_MODE=CONTRACT (default): strict contract checks (schema/policy/catalog/entities...).
- VALIDATION_MODE=TOLERANT: accept older shapes (activities[] list, state/status variants).

Env:
- OPTION_C_PATH: path to option_c.json (default: auto-detect data/schedule/option_c.json)
"""

import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, Tuple, Optional, List

CONTRACT_ACTIVITY_STATES = {"draft","planned","ready","in_progress","paused","blocked","done","verified","cancelled"}
CONTRACT_LOCK_LEVELS = {"none","soft","hard","baseline"}
CONTRACT_DEP_TYPES = {"FS","SS","FF","SF"}
CONTRACT_EVID_STAGES = {"before_start","before_complete","after_complete"}
CONTRACT_COL_SEV = {"minor","major","blocking"}
CONTRACT_COL_KIND = {
    "dependency_cycle","dependency_violation","constraint_window_violation",
    "resource_overallocated","resource_unavailable","spatial_conflict",
    "baseline_conflict","data_incomplete","risk_hold"
}
CONTRACT_ACTIONS = {"wait","resource_swap","split_activity","dependency_change","relax_constraint","baseline_update"}


def _find_repo_root(start: Path) -> Path:
    cur = start.resolve()
    for _ in range(10):
        if (cur / ".git").exists() or (cur / "package.json").exists():
            return cur
        if cur.parent == cur:
            break
        cur = cur.parent
    return start.resolve()


def _find_optionc_path() -> Optional[Path]:
    env_path = os.environ.get("OPTION_C_PATH")
    if env_path:
        p = Path(env_path)
        if p.is_absolute():
            return p if p.exists() else None
        cwd = Path(os.getcwd())
        candidate = (cwd / env_path).resolve()
        return candidate if candidate.exists() else None
    cwd = Path(os.getcwd())
    root = _find_repo_root(cwd)
    candidates = [
        root / "data" / "schedule" / "option_c.json",
        root / "option_c.json",
        cwd / "option_c.json",
    ]
    for p in candidates:
        if p.exists():
            return p
    return None


def _fail(msg: str) -> bool:
    print(f"[FAIL] {msg}")
    return False


def _warn(msg: str):
    print(f"[WARN] {msg}")


def _get(d: Dict[str, Any], path: List[str]) -> Any:
    cur: Any = d
    for k in path:
        if not isinstance(cur, dict) or k not in cur:
            return None
        cur = cur[k]
    return cur


def _load_json(path: Path) -> Dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _collect_activities(data: Dict[str, Any]) -> Tuple[str, Dict[str, Any], List[Dict[str, Any]]]:
    """
    Returns (shape, activities_map, activities_list_fallback)
    shape:
      - "entities_map" if entities.activities is dict
      - "list" if activities is list
      - "none" otherwise
    """
    ent_acts = _get(data, ["entities","activities"])
    if isinstance(ent_acts, dict):
        return "entities_map", ent_acts, []
    acts = data.get("activities")
    if isinstance(acts, list):
        m = {}
        for a in acts:
            if isinstance(a, dict):
                aid = a.get("activity_id") or a.get("id")
                if aid:
                    m[aid] = a
        return "list", m, acts
    return "none", {}, []


def _norm_state_tol(v: Any) -> Optional[str]:
    if v is None:
        return None
    if not isinstance(v, str):
        return None
    s = v.strip()
    if not s:
        return None
    s = s.replace("-", "_").lower()
    alias = {
        "inprogress": "in_progress",
        "in_progress": "in_progress",
        "active": "in_progress",
        "done": "done",
        "completed": "done",
        "verified": "verified",
        "cancelled": "cancelled",
        "canceled": "cancelled",
    }
    return alias.get(s, s)


def _validate_top_level_contract(data: Dict[str, Any]) -> bool:
    ok = True
    schema = data.get("schema")
    if not isinstance(schema, dict):
        ok = _fail("schema missing or not object") and ok
    else:
        for k in ["name","version","scenario_id","timezone"]:
            if k not in schema:
                ok = _fail(f"schema.{k} missing") and ok
    policy = data.get("policy")
    if not isinstance(policy, dict):
        ok = _fail("policy missing or not object") and ok
    else:
        vm = policy.get("view_modes")
        if not isinstance(vm, list) or not vm:
            ok = _fail("policy.view_modes missing/empty") and ok
        rf = policy.get("reflow")
        if not isinstance(rf, dict):
            ok = _fail("policy.reflow missing/not object") and ok
        else:
            if rf.get("snap_direction") not in {"forward","backward"}:
                ok = _fail("policy.reflow.snap_direction must be forward/backward") and ok
            tb = rf.get("tie_break")
            if not isinstance(tb, list) or not tb:
                ok = _fail("policy.reflow.tie_break missing/empty") and ok
    catalog = data.get("catalog")
    if not isinstance(catalog, dict):
        ok = _fail("catalog missing or not object") and ok
    else:
        enums = catalog.get("enums")
        if not isinstance(enums, dict):
            ok = _fail("catalog.enums missing/not object") and ok
        else:
            for k in ["activity_state","lock_level","dependency_type","evidence_stage","collision_severity","collision_kind"]:
                if k not in enums:
                    ok = _fail(f"catalog.enums.{k} missing") and ok
    entities = data.get("entities")
    if not isinstance(entities, dict):
        ok = _fail("entities missing or not object") and ok
    else:
        for k in ["trips","trs","activities"]:
            if k not in entities:
                ok = _fail(f"entities.{k} missing") and ok
    if "collisions" not in data or not isinstance(data.get("collisions"), dict):
        ok = _fail("collisions missing or not object") and ok
    if "reflow_runs" not in data or not isinstance(data.get("reflow_runs"), list):
        ok = _fail("reflow_runs missing or not list") and ok
    if "baselines" not in data or not isinstance(data.get("baselines"), dict):
        ok = _fail("baselines missing or not object") and ok
    if "history_events" not in data or not isinstance(data.get("history_events"), list):
        ok = _fail("history_events missing or not list") and ok
    return ok


def _validate_activity_contract(a: Dict[str, Any], aid: str, data: Dict[str, Any]) -> Tuple[bool,int,int]:
    ok = True
    warn_count = 0
    fail_count = 0

    required = ["activity_id","trip_id","tr_id","type","title","state","lock_level","reflow_pins",
                "blocker_code","blockers","location","plan","actual","dependencies","constraints",
                "resources","evidence_required","evidence","calc"]
    for k in required:
        if k not in a:
            ok = _fail(f"{aid}: missing key '{k}'") and ok
            fail_count += 1

    st = a.get("state")
    if st not in CONTRACT_ACTIVITY_STATES:
        ok = _fail(f"{aid}: state invalid '{st}' (must be lowercase enum)") and ok
        fail_count += 1

    ll = a.get("lock_level")
    if ll not in CONTRACT_LOCK_LEVELS:
        ok = _fail(f"{aid}: lock_level invalid '{ll}'") and ok
        fail_count += 1

    bc = a.get("blocker_code")
    blocker_codes = _get(data, ["catalog","blocker_codes"])
    if isinstance(blocker_codes, dict):
        if bc not in blocker_codes:
            _warn(f"{aid}: blocker_code '{bc}' not found in catalog.blocker_codes")
            warn_count += 1

    blockers = a.get("blockers")
    if not isinstance(blockers, list):
        ok = _fail(f"{aid}: blockers must be list") and ok
        fail_count += 1
    else:
        if bc not in (None, "NONE") and len(blockers) == 0:
            _warn(f"{aid}: blocker_code='{bc}' but blockers[] empty")
            warn_count += 1
        if (bc == "NONE" or bc is None) and len(blockers) > 0:
            _warn(f"{aid}: blockers[] exists but blocker_code is NONE/null")
            warn_count += 1

    plan = a.get("plan")
    if not isinstance(plan, dict):
        ok = _fail(f"{aid}: plan must be object") and ok
        fail_count += 1
    else:
        for k in ["start_ts","duration_min","end_ts","priority"]:
            if k not in plan:
                ok = _fail(f"{aid}: plan.{k} missing") and ok
                fail_count += 1
        if plan.get("duration_min") is not None and not isinstance(plan.get("duration_min"), int):
            _warn(f"{aid}: plan.duration_min should be int minutes")
            warn_count += 1

    actual = a.get("actual")
    if not isinstance(actual, dict):
        ok = _fail(f"{aid}: actual must be object") and ok
        fail_count += 1
    else:
        for k in ["start_ts","end_ts","progress_pct"]:
            if k not in actual:
                ok = _fail(f"{aid}: actual.{k} missing") and ok
                fail_count += 1

    act_s = actual.get("start_ts") if isinstance(actual, dict) else None
    act_e = actual.get("end_ts") if isinstance(actual, dict) else None
    if act_s is not None and st in {"draft","planned","ready"}:
        _warn(f"{aid}: actual.start_ts exists but state='{st}' (expected in_progress/paused/blocked/done/verified)")
        warn_count += 1
    if act_e is not None and st not in {"done","verified","cancelled"}:
        _warn(f"{aid}: actual.end_ts exists but state='{st}' (expected done/verified)")
        warn_count += 1

    deps = a.get("dependencies")
    if not isinstance(deps, list):
        ok = _fail(f"{aid}: dependencies must be list") and ok
        fail_count += 1
    else:
        for j, d in enumerate(deps[:500]):
            if not isinstance(d, dict):
                ok = _fail(f"{aid}: dependencies[{j}] not object") and ok
                fail_count += 1
                continue
            dt = d.get("type")
            fa = d.get("from_activity_id")
            if dt not in CONTRACT_DEP_TYPES:
                _warn(f"{aid}: dependencies[{j}].type invalid '{dt}'")
                warn_count += 1
            if not isinstance(fa, str) or not fa:
                _warn(f"{aid}: dependencies[{j}].from_activity_id missing/invalid")
                warn_count += 1

    res = a.get("resources")
    if not isinstance(res, dict):
        ok = _fail(f"{aid}: resources must be object") and ok
        fail_count += 1
    else:
        rq = res.get("required")
        asg = res.get("assigned")
        if not isinstance(rq, list):
            ok = _fail(f"{aid}: resources.required must be list") and ok
            fail_count += 1
        if not isinstance(asg, list):
            ok = _fail(f"{aid}: resources.assigned must be list") and ok
            fail_count += 1

    er = a.get("evidence_required")
    if not isinstance(er, list):
        ok = _fail(f"{aid}: evidence_required must be list") and ok
        fail_count += 1
    else:
        for j, e in enumerate(er[:200]):
            if not isinstance(e, dict):
                ok = _fail(f"{aid}: evidence_required[{j}] not object") and ok
                fail_count += 1
                continue
            if e.get("stage") not in CONTRACT_EVID_STAGES:
                _warn(f"{aid}: evidence_required[{j}].stage invalid '{e.get('stage')}'")
                warn_count += 1
            if not isinstance(e.get("min_count"), int):
                _warn(f"{aid}: evidence_required[{j}].min_count should be int")
                warn_count += 1

    calc = a.get("calc")
    if not isinstance(calc, dict):
        ok = _fail(f"{aid}: calc must be object") and ok
        fail_count += 1
    else:
        for k in ["es_ts","ef_ts","ls_ts","lf_ts","total_float_min","free_float_min",
                  "is_critical_path","reflow_shift_min","collision_ids","collision_count","slack_bucket"]:
            if k not in calc:
                ok = _fail(f"{aid}: calc.{k} missing") and ok
                fail_count += 1

    return ok, warn_count, fail_count


def _validate_collisions_registry_contract(data: Dict[str, Any]) -> Tuple[bool,int,int]:
    ok = True
    warn_count = 0
    fail_count = 0
    col = data.get("collisions")
    if not isinstance(col, dict):
        return _fail("collisions must be dict"), 0, 1
    for cid, c in list(col.items())[:2000]:
        if not isinstance(c, dict):
            ok = _fail(f"collision {cid} not object") and ok
            fail_count += 1
            continue
        if c.get("kind") not in CONTRACT_COL_KIND:
            _warn(f"collision {cid}: kind invalid '{c.get('kind')}'")
            warn_count += 1
        if c.get("severity") not in CONTRACT_COL_SEV:
            _warn(f"collision {cid}: severity invalid '{c.get('severity')}'")
            warn_count += 1
        sa = c.get("suggested_actions", [])
        if isinstance(sa, list):
            for j, a in enumerate(sa[:50]):
                if isinstance(a, dict) and a.get("action") not in CONTRACT_ACTIONS:
                    _warn(f"collision {cid}: suggested_actions[{j}].action invalid '{a.get('action')}'")
                    warn_count += 1
        else:
            _warn(f"collision {cid}: suggested_actions should be list")
            warn_count += 1
    return ok, warn_count, fail_count


def main():
    mode = os.environ.get("VALIDATION_MODE", "CONTRACT").strip().upper()
    path = _find_optionc_path()
    if path is None:
        path = Path(os.environ.get("OPTION_C_PATH", "option_c.json"))
    if not path.exists():
        print(f"[FAIL] option_c.json not found: {path}")
        sys.exit(2)

    try:
        data = _load_json(path)
    except Exception as e:
        print(f"[FAIL] cannot parse JSON: {e}")
        sys.exit(2)

    ok = True
    total_warn = 0
    total_fail = 0

    shape, acts_map, acts_list = _collect_activities(data)
    if mode == "CONTRACT":
        ok = _validate_top_level_contract(data) and ok
        if shape != "entities_map":
            ok = _fail("CONTRACT mode requires entities.activities as dict") and ok
            total_fail += 1
    else:
        if shape == "none":
            ok = _fail("no activities found (entities.activities or activities[])") and ok
            total_fail += 1

    for aid, a in list(acts_map.items()):
        if not isinstance(a, dict):
            ok = _fail(f"{aid}: activity is not object") and ok
            total_fail += 1
            continue

        if mode == "CONTRACT":
            ok_i, w, f = _validate_activity_contract(a, aid, data)
            ok = ok_i and ok
            total_warn += w
            total_fail += f
        else:
            st = _norm_state_tol(a.get("state", a.get("status")))
            if st is None:
                _warn(f"{aid}: state/status missing")
                total_warn += 1
            plan = a.get("plan") or a.get("planned") or {}
            if not isinstance(plan, dict):
                _warn(f"{aid}: plan missing/not object")
                total_warn += 1

    if mode == "CONTRACT":
        ok_c, w, f = _validate_collisions_registry_contract(data)
        ok = ok_c and ok
        total_warn += w
        total_fail += f

    print("\n[SUMMARY]")
    print(f"- mode: {mode}")
    print(f"- activities_shape: {shape}")
    print(f"- activities_count: {len(acts_map)}")
    print(f"- warnings: {total_warn}")
    print(f"- fails: {total_fail}")

    if ok and total_fail == 0:
        print("\n[PASS] option_c.json checks passed.")
        sys.exit(0)

    print("\n[FAIL] option_c.json checks failed.")
    sys.exit(2)


if __name__ == "__main__":
    main()
