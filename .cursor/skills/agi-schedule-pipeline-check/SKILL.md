---
name: agi-schedule-pipeline-check
description: Full pipeline verification after AGI Schedule updates. Use when checking A~N checklist, KPI (Total Days, SPMT Set=1), voyage cards, tide-table, heatmap. Part of integrated pipeline step 3.
---

# agi-schedule-pipeline-check

## Pipeline Position

- **Step 3** of the integrated pipeline: 1) agi-schedule-shift → 2) agi-schedule-daily-update → **3) agi-schedule-pipeline-check** → 4) weather-go-nogo.
- Always invoked after steps 1–2.

## When to Use

- "파이프라인 점검", "전체 점검", "post-check", "마무리 점검", after notice/weather/KPI/shift updates.

## Scope

- `files/` (or `agentskillguide/files/`) — all pipeline artifacts.
- Source HTML: latest `AGI TR SCHEDULE_*.html` by filename date.

## Checklist (A~N)

| Step | Target | Check |
|------|--------|-------|
| **A** | `files/agi tr final schedule.json` | planned_start/finish, summary.date_range |
| **B** | schedule_shift | JSON·HTML sync |
| **C** | HTML | projectStart/End, ganttData |
| **D** | Notice block | Date = update date (YYYY-MM-DD) |
| **E** | Weather block | Last Updated, 4-day forecast, Mina Zayed·Marine |
| **F** | KPI Grid | **Total Days** (recalc), **SPMT Set = 1** |
| **G** | Voyage Cards | data-start/end, Load-out/Sail/Load-in/Jack-down |
| **H** | ganttData·Schedule table | V1~V7 dates match JSON |
| **I** | Weather parse | `files/out/weather_parsed/YYYYMMDD/` JSON exists |
| **J** | WEATHER_DASHBOARD.py | rotation=0, ha="center", height_ratios |
| **K** | Heatmap PNG | `files/out/weather_4day_heatmap.png` |
| **L** | Image ref | HTML img src (file or Base64) |
| **M** | weather-go-nogo | Parsed JSON → Go/No-Go evaluation available |
| **N** | **Tide table** | **Always** run `python tide_to_voyage_overview.py` |

## Execution Order

1. Source: latest `AGI TR SCHEDULE_*.html`
2. A–C: JSON·HTML consistency
3. D: Notice date
4. E: Weather block
5. F: KPI (Total Days, SPMT Set = 1)
6. G–H: Voyage cards, ganttData
7. I–L: Weather parse, heatmap, image ref
8. M: weather-go-nogo availability
9. **N**: `python tide_to_voyage_overview.py` (always)

## Safety

- No edits outside `files/`.
- KPI updates (F) are done only in this step, not in agi-schedule-daily-update.

## Output Format

- Follow `agentskillguide/DASHBOARD_OUTPUT_SCHEMA.md`.
