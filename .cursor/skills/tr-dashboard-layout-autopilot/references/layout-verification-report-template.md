# Layout Verification Report (TR Dashboard Layout Autopilot)

**Generated**: YYYY-MM-DD  
**Skill**: tr-dashboard-layout-autopilot  
**SSOT**: patch.md §2.1, AGENTS.md §5

---

## Executive Summary

| Gate | Status | Notes |
|------|--------|-------|
| Lint | PASS / FAIL | |
| Typecheck | PASS / FAIL | |
| Test | PASS / FAIL | |
| SSOT | PASS / FAIL | validate_optionc.py |
| Layout checklist | PASS / FAIL | 아래 항목 |

**Overall**: PASS / FAIL

---

## Layout Checklist

- [ ] 2열(lg) / 1열(기본) 전환 정상
- [ ] Gantt·디테일 높이 유동(flex-1/min-h) 정상
- [ ] StoryHeader·Map↔Timeline·Detail 슬롯 유지
- [ ] 선택 컨텍스트(TR/Trip/Activity) 유지
- [ ] patch.md §2.1, AGENTS.md §5 위반 없음

---

## Next Steps (if FAIL)

- FAIL 항목별 수정 → 재검증
