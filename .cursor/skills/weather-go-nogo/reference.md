# Weather Go/No-Go — Detailed Logic (SEA TRANSIT)

Source: `AGI TR 1-6 Transportation Master Gantt Chart/weathergonnologic.md`

---

## Exec Summary

- Input: **Wave Height (combined sea+swell, ft)**, **Wind Speed (kt)**, optionally **Wave Period (s)**. Wave treated as **Hs (Significant Wave Height)** — upper 1/3 average. ([ndbc.noaa.gov])
- Go/No-Go: **(1) Threshold Gate + (2) Squall/Peak buffer Gate + (3) Continuous weather window Gate**
- Hmax ≈ 1.86×Hs ([infoplaza.com])

---

## Logic Table

| No | Item | Value | Risk |
|----|------|-------|------|
| 1 | Wave | `Hs_m = wave_ft × 0.3048` | Medium |
| 2 | Wind | `Wind_kt = chart_wind_kt` | Low |
| 3 | Peak | `Hmax_m ≈ 1.86 × Hs_m` | Medium |
| 4 | Squall buffer | "squall 미반영" → `Hs_eff=Hs_m+ΔHs`, `Wind_eff=Wind_kt+ΔGust` | High |
| 5 | Continuous window | `연속 GO 시간 ≥ (SailingTime + Reserve)` | High |

---

## Gate-A: Basic Threshold

- `Hs_m(t) = wave_ft(t)*0.3048`
- **GO(t)** if `Hs_m ≤ Hs_limit_m` AND `Wind_kt ≤ Wind_limit_kt`, else **NO-GO(t)**

## Gate-B: Squall/Peak

- If "squall 미반영": `Hs_eff = Hs_m + ΔHs_squall_m`, `Wind_eff = Wind_kt + ΔGust_kt`
- Peak: `Hmax_est = 1.86 × Hs_eff` → **NO-GO(t)** if `Hmax_est > Hmax_allow_m`

## Gate-C: Continuous Window

- `NeedWindow_hr = SailingTime_hr + Reserve_hr`
- All buckets in [t0, t0+NeedWindow] GO → **Final GO**
- Any NO-GO → **Final NO-GO**

---

## Output

- `Decision: GO | NO-GO | CONDITIONAL`
- `ReasonCodes[]`: `WX_WAVE`, `WX_WIND`, `WX_SQUALL_BUFFER`, `WX_PEAK_WAVE`, `WX_WINDOW_GAP`

---

## References

- [1] NDBC Measurement Descriptions: https://www.ndbc.noaa.gov/faq/measdes.shtml
- [2] Hs vs Hmax: https://www.infoplaza.com/en/blog/labeling-waves-the-nuances-of-hs-and-hmax
- [3] NDBC Wave Calc: https://www.ndbc.noaa.gov/faq/wavecalc.shtml
- [4] MBM Marine Transport Guidelines
