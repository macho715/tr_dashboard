# Mobile Responsive Patterns (권장)

## 기본 목표
- Mobile에서는 "동시 노출"이 아니라 "빠른 전환"이 핵심.
- 정보 손실 없이, 우선순위만 재배치.

## 권장 레이아웃 (Mobile < 768px)
1) 상단: Header + StoryHeader(요약)
2) 그 아래: Primary Tabs
   - Tab A: Timeline/Gantt(요약/핵심)
   - Tab B: Map(Where)
3) Detail: BottomSheet 또는 RightDrawer → Activity/History/Evidence/Compare를 내부 탭으로 제공

## 터치/가독성 규칙
- 탭/버튼 최소 높이 44px
- Sticky 요소는 2개 이하(과도한 sticky는 콘텐츠 높이를 깎음)
- 긴 표/간트는:
  - 가로 스크롤 안내(시각 힌트)
  - "선택된 Activity로 점프" CTA 제공

## 상태 유지 규칙
- 탭 전환해도 selectedActivityId 유지
- Detail 열고 닫아도 scroll position 복원(가능하면)
