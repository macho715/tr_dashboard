# patch.md Quick Reference

Condensed rules from patch.md for implementation. **patch.md** is SSOT; this file is a lookup aid.

## Section Map (patch.md)

| Section | Content |
|---------|---------|
| §1 | Summary, single-view flow (Where→When/What→Evidence) |
| §2.1 | Layout: Story Header, 3-col (Map \| Timeline \| Detail), History/Evidence |
| §2.2 | View modes: Live, History, Approval, Compare |
| §3 | SSOT model (option_c.json), API response shape |
| §4.1 | Map: TR marker, Route/Segment colors, Nodes, Risk overlay |
| §4.2 | Timeline: Row structure, Dependency, Constraint badges, Collision badges |
| §4.3 | Interaction: Map↔Timeline highlight, Reflow (Preview→Apply) |
| §5.1 | Plan↔Actual display rules |
| §5.2 | History log triggers (append-only) |
| §5.3 | Evidence rules, missing-required warnings |
| §5.4 | View mode permissions |
| §A | Activity state machine (DRAFT→VERIFIED, transitions, gates) |
| §B | Reflow (DAG, Freeze, topological, constraint, resource) |
| §C | Collision taxonomy (kind, severity, suggested_actions) |

## Immutable Rules

- **Story Header**: TR 선택 시 3초 내 WHERE / WHEN/WHAT / EVIDENCE
- **2-click Collision**: 1클릭 배지→요약, 2클릭 Why 패널→Root cause+Evidence
- **Map colors**: Planned=회색, In progress=파랑, Completed=초록, Blocked=빨강, Delayed=주황
- **Constraint badges**: [W] [PTW] [CERT] [LNK] [BRG] [RES]
- **Collision badges**: [COL] [COL-LOC] [COL-DEP]
- **History**: append-only; no delete/modify
- **Freeze**: actual_start/actual_end → timestamps immutable for Reflow

## Do Not

- Layout/UX that conflicts with patch.md
- SoT that bypasses option_c.json
- Collision UX requiring >2 clicks to reach root cause
