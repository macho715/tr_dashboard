---
name: agi-schedule-shift
description: Shifts AGI TR schedule (JSON/HTML) by delta days after pivot date. Use when delaying schedule, "일정 시프트", "schedule shift", pivot_date and new_date provided. Part of integrated pipeline step 1.
---

# agi-schedule-shift

## Pipeline Position

- **Step 1** of the integrated pipeline: **1) agi-schedule-shift** → 2) agi-schedule-daily-update → 3) agi-schedule-pipeline-check → 4) weather-go-nogo.
- Run when pivot_date·new_date provided; otherwise confirm "no shift".

## Scope

- All work in `files/` only. JSON and HTML read/write only within `files/`.

## When to Use

- "일정 시프트", "schedule shift", "일정 2일 연기", "AGI schedule delay", "전체 일정 자동 수정"

## Inputs

| Item | Description | Example |
|------|-------------|---------|
| pivot_date | Anchor date (shift only dates ≥ this) | 2026-02-01 |
| new_date | Target date for pivot | 2026-02-03 |
| delta_days | new_date − pivot_date | +2 |

## Procedure

### 1) JSON Shift

- `files/agi tr final schedule.json` → `activities[].planned_start`, `planned_finish`.
- Apply +delta_days only to dates ≥ pivot_date.
- Keep `duration` unchanged.
- Update `summary.date_range` if applicable.

### 2) HTML Shift

- `projectStart`, `projectEnd`, `ganttData` rows, voyage-card `data-start`/`data-end`.
- Apply same delta to dates ≥ pivot_date.
- Format: `YYYY-MM-DD`.

### 3) Script

- **Path**: `files/schedule_shift.py`
- **Run**: From `files/`, `python schedule_shift.py [--dry-run] [--backup]`
- Set `PIVOT`, `DELTA_DAYS` in script before run.

## Validation

- All `planned_start` ≤ `planned_finish`.
- Activity order preserved.

## Safety

- No reads/writes outside `files/`.
- Do not shift dates before pivot_date.
- Shift JSON and HTML together for consistency.

## After Shift

- Run **agi-schedule-pipeline-check** (step 3) so Voyage Cards, tide-table, ganttData stay in sync.

## Output Format

- Follow `agentskillguide/DASHBOARD_OUTPUT_SCHEMA.md`.
