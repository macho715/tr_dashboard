# Layout Size Balance Verification

**Date:** 2026-02-03  
**Scope:** TR Dashboard 2-column layout (WHERE+DETAIL | WHEN/WHAT Gantt)  
**Ref:** tr-dashboard-layout-optimizer, AGENTS.md §5

---

## 1. Current Size Summary

| 영역 | 컴포넌트 | min-height / height | 비고 |
|------|----------|---------------------|------|
| **페이지 루트** | page.tsx wrapper | max-w-[1920px], py-6 | 중앙 정렬 |
| **좌측 컬럼** | TrThreeColumnLayout 좌 | flex, min-h-[200px] | WHERE + DETAIL 묶음 |
| **WHERE (Map)** | aside | min-h-[200px], flex-shrink-0 | 고정 최소 200px |
| **DETAIL** | aside | min-h-[200px], flex-1 | 남는 높이 차지 |
| **우측 컬럼** | main (Timeline) | min-h-[300px] | Gantt 래퍼 |
| **Gantt (vis)** | VisTimelineGantt | min-h-[600px] h-[600px] | 고정 600px |
| **Gantt (레거시)** | gantt-chart.tsx | chartWidth px, 가로 스크롤 | 높이 유동 |

---

## 2. 균형 분석

### 2.1 가로 비율 (OK)
- 그리드: `lg:grid-cols-[1fr_2fr]` → 좌 1/3, 우 2/3.
- Gantt가 더 넓은 영역 사용 (의도된 설계).

### 2.2 세로 균형 (보완)
- **좌측**: 컨테이너 `min-h-[200px]`만 있어, 내용이 짧을 때 전체 높이가 200px+α에 그침.
- **우측**: Gantt만 600px 고정 → 우측이 시각적으로 훨씬 큼.
- 그리드 특성상 셀은 더 긴 쪽(우측)에 맞춰 늘어나므로, 좌측 셀도 결국 600px+ 로 늘어남.  
  단, **최소 높이**가 좌 200px vs 우 600px 이라 초기/콘텐츠 적을 때 좌측이 짧아 보일 수 있음.

---

## 3. 적용한 보완 (크기 균형)

- **좌측 컬럼 래퍼**에 Gantt와 비슷한 최소 높이 부여 → 좌/우 최소 높이를 맞춤.
- `TrThreeColumnLayout` 좌측 flex 컨테이너: `min-h-[200px]` → `min-h-[560px]` (Gantt 600px와 유사).
- WHERE/DETAIL은 기존대로 각각 min-h-[200px], flex-1 유지.

---

## 4. 검증 체크리스트

- [x] 가로 비율 1:2 유지
- [x] 좌측 최소 높이 상향으로 시각적 균형 개선
- [x] 모바일(lg 미만)은 1열 쌓임, 동작 변경 없음
- [x] patch.md §2.1, AGENTS.md 3열→2열 설계 유지

---

## 5. 결과

- **PASS**: 크기 균형 검증 완료. 좌측 min-height 상향 적용으로 Gantt(600px)와 균형 맞춤.
