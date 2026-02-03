# Layout Audit (TR Dashboard)

**Generated**: 2026-02-03 (tr-dashboard-layout-autopilot)  
**SSOT**: patch.md §2.1, AGENTS.md §5

---

## 1. 레이아웃 트리

```
page (flex min-h-screen flex-col)
├── DashboardHeader
└── main (flex flex-1 flex-col min-h-0)
    └── DashboardLayout (flex flex-1 flex-col min-h-0 space-y-4)
        ├── GlobalControlBar
        └── children
            ├── ApprovalModeBanner / CompareModeBanner
            ├── StoryHeader
            ├── OverviewSection
            ├── SectionNav
            └── div (flex flex-1 flex-col min-h-0 space-y-6)
                ├── KPISection / AlertsSection
                └── TrThreeColumnLayout (grid flex-1 min-h-0 lg:grid-cols-[1fr_2fr] lg:min-h-[480px])
                    ├── [좌] WHERE + DETAIL (flex flex-col gap-4)
                    │   ├── WHERE (Map) min-h-[200px] flex-shrink-0
                    │   └── DETAIL min-h-[200px] flex-1
                    └── [우] WHEN/WHAT (main flex flex-col flex-1 lg:min-h-0)
                        └── timelineSlot (flex flex-1 flex-col min-h-0)
                            ├── ScheduleSection
                            └── GanttSection (section flex flex-1 flex-col min-h-0)
                                └── GanttChart
                                    └── VisTimelineGantt (h-full min-h-[400px]) or legacy
```

---

## 2. 슬롯·비율

| 슬롯 | 컴포넌트 | 비율/크기 |
|------|----------|-----------|
| mapSlot | MapPanelWrapper + VoyagesSection | 좌측 1fr |
| detailSlot | DetailPanel 등 | 좌측 1fr (동일 컬럼) |
| timelineSlot | ScheduleSection + GanttSection | 우측 2fr |
| **Breakpoint** | lg (1024px) | lg 미만: 1열 쌓임 |

---

## 3. Flex 체인 (높이 유동)

- **page**: `min-h-screen flex flex-col` → main이 `flex-1 min-h-0`으로 남는 높이 차지
- **DashboardLayout**: `flex flex-1 flex-col min-h-0` → 하단 영역이 flex-1
- **content wrapper**: `flex flex-1 flex-col min-h-0 space-y-6` → TrThreeColumnLayout이 flex-1
- **TrThreeColumnLayout**: `grid flex-1 min-h-0 lg:min-h-[480px]` → 그리드 최소 높이 480px
- **main (Timeline)**: `flex flex-col flex-1 lg:min-h-0` → Gantt 영역이 flex-1
- **timelineSlot**: `flex flex-1 flex-col min-h-0` → GanttSection이 flex-1
- **GanttSection**: `section flex flex-1 flex-col min-h-0`
- **GanttChart**: section `flex flex-col flex-1 min-h-0`, Gantt 래퍼 `flex min-h-[400px] flex-1 flex-col`
- **VisTimelineGantt**: `h-full min-h-[400px]` → 부모 높이에 맞춤

---

## 4. 선택 컨텍스트 유지

- **selectedActivityId / selectedVoyage / focusedActivityId**: app/page.tsx 상태 → MapPanelWrapper, GanttSection, DetailPanel에 props 전달
- **Map↔Timeline**: onActivitySelect 시 ganttRef.scrollToActivity + ganttSection.scrollIntoView
- **onActivityDeselect**: Gantt 배경 클릭 시 setFocusedActivityId(null)

---

## 5. 결론

- 2열(lg) / 1열(기본) 구조 및 StoryHeader·Map·Timeline·Detail 슬롯이 patch.md §2.1, AGENTS.md §5와 일치함.
- Gantt·디테일 높이는 flex-1/min-h 체인으로 유동화되어 있음.
- 별도 Implement 단계 없이 Verify만 수행 가능.
