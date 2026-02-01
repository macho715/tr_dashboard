---
name: water-tide-voyage
description: Maps WATER TIDE.csv top 3 tide windows (6:00–17:00) to Voyage Overview tide-table. Use when updating tide table, "물때 상위 3시간 Voyage", or as pipeline-check step N. Part of integrated pipeline.
---

# water-tide-voyage

## Purpose

- Use `files/WATER TIDE.csv` **6:00–17:00** only.
- Compute **top 3 tide windows** per voyage.
- Write to each voyage-card `table.tide-table` tbody.

## Scope

- Input: `files/WATER TIDE.csv`
- Output: `files/AGI TR SCHEDULE_*.html` voyage-card `table.tide-table` tbody

## When to Use

- "WATER TIDE Voyage Overview 연동", "물때 상위 3시간 Voyage", "tide table 갱신", "Voyages Overview 물때"
- Pipeline-check step **N** — always run.

## I/O

| Item | Content |
|------|---------|
| Input | `files/WATER TIDE.csv` — columns: date, 0:00–23:00 (m) |
| Time filter | 6:00, 7:00, …, 17:00 only |
| Voyage range | voyage-card `data-start`, `data-end` (YYYY-MM-DD) |
| Output | 3 rows: `<tr><td>HH:00</td><td>X.XXm</td></tr>` |

Example:

```
TIME    HEIGHT
9:00    2.03m
10:00   1.99m
8:00    1.97m
```

## Procedure

1. Parse `files/WATER TIDE.csv` (UTF-8), use 6:00–17:00 columns.
2. Get voyage ranges from `.voyage-card[data-start][data-end]`.
3. Per voyage: filter CSV rows in [data-start, data-end], max height per hour, sort descending, take top 3.
4. Replace `table.tide-table tbody` with 3 rows.

## Script

- **Path**: `files/tide_to_voyage_overview.py`
- **Run**: From `files/`, `python tide_to_voyage_overview.py` (option: `--dry-run`)

## Safety

- No reads/writes outside `files/`.
- Do not modify HTML outside tide-table.

## Integration

- **agi-schedule-pipeline-check** step N: always run `tide_to_voyage_overview.py` after schedule shift.

## Output Format

- Follow `agentskillguide/DASHBOARD_OUTPUT_SCHEMA.md`.
