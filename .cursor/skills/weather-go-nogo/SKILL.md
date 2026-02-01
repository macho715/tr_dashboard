---
name: weather-go-nogo
description: SEA TRANSIT Go/No-Go decision from wave(ft), wind(kt), and limits. Use when evaluating marine weather, "weather window", Hs/Hmax, squall buffer. Part of integrated pipeline step 4.
---

# Weather Go/No-Go (SEA TRANSIT)

## Pipeline Position

- **Step 4** of the integrated pipeline: 1) agi-schedule-shift → 2) agi-schedule-daily-update → 3) agi-schedule-pipeline-check → **4) weather-go-nogo**.
- Run when wave_ft, wind_kt (and optionally limits) are provided; otherwise advise "input required".

## When to Use

- "weather window", "Hs/Hmax", "squall buffer", "marine weather decision", Go/No-Go for sea transit
- Input from `files/out/weather_parsed/YYYYMMDD/weather_for_weather_py.json` when available

## I/O

| Item | Content |
|------|---------|
| Input | Wave Height (ft, combined sea+swell), Wind Speed (kt). Optional: Wave Period (s) |
| Assumption | Chart "combined sea+swell(ft)" ≈ Hs (significant wave height) |
| Output | `Decision: GO | NO-GO | CONDITIONAL`, `ReasonCodes[]` |

## Parameters

- `Hs_limit_m`: Max allowed Hs (m)
- `Wind_limit_kt`: Max allowed wind (kt)
- `SailingTime_hr`, `Reserve_hr`: Voyage + reserve for continuous window
- (Optional) `ΔHs_squall_m`, `ΔGust_kt`: Squall buffer

If not provided: ask user for Hs_limit_m (or Hmax_allow_m), Wind_limit_kt, SailingTime_hr+Reserve_hr.

## 3-Gate Logic

### Gate-A: Basic Threshold

- `Hs_m(t) = wave_ft(t) × 0.3048`
- **GO(t)** iff `Hs_m ≤ Hs_limit_m` AND `Wind_kt ≤ Wind_limit_kt`, else **NO-GO(t)**

### Gate-B: Squall/Peak Wave (optional)

- If "squall 미반영": `Hs_eff = Hs_m + ΔHs_squall_m`, `Wind_eff = Wind_kt + ΔGust_kt` → evaluate with eff values.
- Peak wave: `Hmax_est = 1.86 × Hs_eff` → **NO-GO(t)** if `Hmax_est > Hmax_allow_m`

### Gate-C: Continuous Window

- `NeedWindow_hr = SailingTime_hr + Reserve_hr`
- All buckets in [t0, t0+NeedWindow] must be GO → **Final GO**
- Any NO-GO → **Final NO-GO**, record ReasonCode

## Options

| Option | Logic |
|--------|-------|
| A | Gate-A + Gate-C |
| B (recommended) | Gate-A + Gate-B + Gate-C |
| C | B + Hmax_est Gate |

## SSOT

- Prefer 2-day (hourly) data as SSOT.
- If only 7-day (daily): use for candidate windows, then confirm with latest short-term forecast.

## QA

- Do not confuse Hs (1/3 highest average) with Hmax (≈1.86×Hs). Fix operational basis first.

## Reference

- Full logic and sources: [reference.md](reference.md)

## Output Format

- Follow `agentskillguide/DASHBOARD_OUTPUT_SCHEMA.md`.
- Output: `Decision: GO | NO-GO | CONDITIONAL`, `ReasonCodes: [WX_WAVE, WX_WIND, ...]`
