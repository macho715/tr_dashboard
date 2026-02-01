---
name: agi-schedule-daily-update
description: Updates AGI TR Schedule HTML notice block and Weather & Marine Risk block daily. Use when refreshing schedule notices, Mina Zayed weather, or parsing weather PDFs from files/weather/. Part of integrated pipeline step 2.
---

# agi-schedule-daily-update

## Pipeline Position

- **Step 2** of the integrated pipeline: 1) agi-schedule-shift → **2) agi-schedule-daily-update** → 3) agi-schedule-pipeline-check → 4) weather-go-nogo.
- Always invoked for schedule update requests.

## Scope

- All work in `files/` (or `agentskillguide/files/`) only.

## Target Files

- **Source**: Latest `AGI TR SCHEDULE_*.html` by filename date (YYYYMMDD).
- **Output**: `files/AGI TR SCHEDULE_YYYYMMDD.html` (new file, never overwrite).

## When to Use

- "AGI schedule 공지", "날씨 블록 업데이트", "Mina Zayed weather", "weather 폴더 PDF 파싱"

## Inputs

| Item | Format | Example |
|------|--------|---------|
| Notice date | YYYY-MM-DD | 2026-01-28 |
| Notice text | User-provided | Action: Request Material entry pass |
| Weather | Web search (Mina Zayed) or `files/weather/YYYYMMDD/` PDF/JPG | - |

## Procedure

### 1) Notice Block

- Find `<!-- Operational Notice -->` → `div.weather-alert`.
- Replace date + body with user-provided content. If no body: date only, clear existing content.
- Keep markup: `<strong style="color: var(--accent-amber);">YYYY-MM-DD</strong><br>` + text.

### 2) Weather & Marine Risk

- **Format**: "Weather & Marine Risk Update (Mina Zayed Port)", "Last Updated: DD Mon YYYY | Update Frequency: Weekly".
- **4-day forecast**: D, D+1, D+2, D+3 (e.g., 28 Jan, 29 Jan, 30 Jan, 31 Jan).
- **2a) Mina Zayed**: Web search → summarize into 4-day paragraphs.
- **2b) Marine**: Parse `files/weather/` latest YYYYMMDD folder (PDF/JPG) → Marine paragraph. Fallback: open PDF → screenshot → OCR.
- **2c) Heatmap pipeline**: Parse → `weather_for_weather_py.json` → `WEATHER_DASHBOARD.py` → `embed_heatmap_base64.py`.

### 3) Save

- Save as `files/AGI TR SCHEDULE_YYYYMMDD.html` (YYYYMMDD = update date).

## Safety

- Do not modify HTML outside notice/weather blocks. KPI Grid is handled by agi-schedule-pipeline-check (step F).
- No reads/writes outside `files/`.

## Output Format

- Follow `agentskillguide/DASHBOARD_OUTPUT_SCHEMA.md` for dashboard consistency.
