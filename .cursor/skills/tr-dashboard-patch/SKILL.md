---
name: tr-dashboard-patch
description: Implements TR 이동 대시보드 UI/UX from patch.md spec. Use when building or modifying Story Header, Map/Timeline/Detail layout, 2-click collision UX, View modes (Live/History/Approval/Compare), constraint badges, or any patch.md-defined visual/interaction rules. Enforces SSOT(option_c.json) and single-view flow (Where→When/What→Evidence).
metadata:
  ssot: patch.md
  data_ssot: option_c.json
  related:
    - tr-dashboard-ssot-guard
    - tr-dashboard-pipeline
---

# TR Dashboard Patch

Implements TR 이동 대시보드 UI/UX from **patch.md** (SSOT). Goal: "TR 하나 = 하나의 이동 스토리" in one screen.

## SSOT

- **Layout/UX/Visual rules**: `patch.md` (absolute priority)
- **Data schema**: `option_c.json` (Activity SSOT)
- **Project rules**: `AGENTS.md`

---

## Quick Checklist (patch.md §2, §4)

| Area | Rule | patch.md |
|------|------|----------|
| **Story Header** | TR 선택 시 3초 내: WHERE / WHEN/WHAT / EVIDENCE | §2.1 |
| **2-click Collision** | 1클릭: 배지→요약 / 2클릭: Why 패널→Root cause+Evidence | §4.2 |
| **Map colors** | Planned=회색, In progress=파랑, Completed=초록, Blocked=빨강, Delayed=주황 | §4.1 |
| **Constraint badges** | [W] [PTW] [CERT] [LNK] [BRG] [RES] | §4.2 |
| **Collision badges** | [COL] [COL-LOC] [COL-DEP] | §4.2 |
| **View Mode** | Live/History/Approval/Compare + 권한 표 | §2.2 |

---

## Layout (patch.md §2.1)

```
Story Header → Map | Timeline | Detail
                Map↔Timeline highlight | History/Evidence
```

**Read order**: Story Header → Map (Where) → Gantt (When/What) → Detail + History/Evidence (Evidence)

---

## 2-Click Collision UX (Required)

1. **1-click**: Timeline collision badge → Collision summary popover
2. **2-click**: Detail "Why" panel → Root cause chain + Evidence/log jump

Collision object must include: `root_cause_code`, related resources/activities, `suggested_actions[]`.

---

## Plan ↔ Actual Display (patch.md §5.1)

| Condition | Display |
|-----------|---------|
| No `actual.start` | Plan bar solid |
| `actual.start` exists, no `actual.finish` | Plan + Actual overlay (in progress) |
| `actual.finish` exists | Actual complete + Plan deviation (±) |
| History mode | Actual primary, Plan dashed overlay |

---

## View Mode Permissions (patch.md §2.2, §5.4)

| Mode | Edit | Reflow Apply | Evidence | Export |
|------|------|--------------|----------|--------|
| Live | Role-based | Limited (approval) | Yes | Yes |
| History | No | No | No (read) | Yes |
| Approval | No | No | View only | Yes |
| Compare | No (overlay only) | No | View only | Yes |

---

## Reflow (patch.md §3.3, §B)

- **Preview** → topological + constraint + resource adjustment
- **Apply** (permission required) → `option_c.json` Plan update + History log
- **Freeze**: `actual_start`/`actual_end` exists → timestamps immutable

---

## Do Not

- Introduce layout/UX that conflicts with patch.md
- Add SoT that bypasses option_c.json
- Collision UX that requires >2 clicks to reach root cause
- Delete or modify History (append-only)

---

## References

- **Full spec**: [patch.md](../../../patch.md) (repo root)
- **Quick rules**: [references/patch-rules.md](references/patch-rules.md)
- **SSOT validation**: `tr-dashboard-ssot-guard` skill
