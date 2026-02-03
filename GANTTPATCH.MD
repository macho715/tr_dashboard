According to a document from **2026-02-02**, 이 프로젝트의 **Gantt 통합 “결합 지점(seam)”은 이미 명확**합니다: `components/dashboard/sections/gantt-section.tsx`가 Gantt 섹션을 구성하고, 실제 차트 렌더링은 `components/dashboard/gantt-chart.tsx`가 담당합니다. 그리고 `currentActivities(ScheduleActivity[]) → scheduleActivitiesToGanttRows() → GanttRow[]` 변환 흐름이 SSOT/계산-렌더 분리 원칙으로 정리되어 있습니다.

즉, `vis-timeline-gantt/`(PoC)를 “통합”한다는 건 **새 라우트/새 앱을 붙이는 게 아니라**, 기존 `GanttChart` 자리에 **vis-timeline 기반 렌더러를 끼워 넣는 것**이 가장 안전합니다(상위 상태/리플로우/프리뷰 패널은 그대로 유지).

아래는 **권장 통합 방식(Next.js App Router + Vercel 깨지지 않게)** 기준의 구체적인 절차입니다.

---

## 1) 통합 전략 (추천): “Adapter + Feature Flag”로 무중단 교체

### 왜 이 방식?

* 현재 Gantt는 **클릭 → 날짜 변경 Dialog → reflowSchedule → Preview → Apply**의 상태 흐름이 이미 확립되어 있음.
* 따라서 **렌더링 엔진만 교체**(DOM 기반 커스텀 → vis-timeline)하면, 기존 로직/UX를 최소 변경으로 유지 가능.
* `vis-timeline`은 **DOM 의존**이라 SSR에서 깨지기 쉬움 → “Client-only component + dynamic import”가 안정적.

### 실행 형태

* 새 컴포넌트: `components/gantt/VisTimelineGantt.tsx` (또는 `components/gantt/vis/VisTimelineGantt.tsx`)
* 기존 `components/dashboard/gantt-chart.tsx`는:

  * (A) 그대로 두고 내부에서 `vis` 렌더러로 갈아끼우거나
  * (B) `GanttChart`를 “facade”로 만들고 `LegacyGanttChart` / `VisTimelineGantt` 스위칭
* 환경변수/플래그 예: `NEXT_PUBLIC_GANTT_ENGINE=vis` (기본 legacy)

> LAYOUT.md에 이미 GanttChart가 “스크롤/줌, compareDelta(ghost bar)”까지 책임으로 잡혀 있으니, **외부 인터페이스(Props)는 유지**하는 게 통합 비용이 가장 낮습니다.

---

## 2) 의존성 추가 (vis-timeline)

`vis-timeline`은 빌드 타입이 여러 개 있는데, **Next.js 통합은 Standalone build부터 시작**하는 게 제일 단순합니다.

* `import { Timeline } from "vis-timeline/standalone";`
* Standalone은 “의존성 없음” 대신 “번들 비대 가능성”이 있음(초기 통합은 단순성이 우선). ([GitHub][1])

설치:

```bash
pnpm add vis-timeline
# (필요 시) pnpm add vis-data  # 구현 방식에 따라
```

> `vis-timeline` README 기준으로 Standalone/Peer/ESNext 빌드 차이가 명시되어 있고, Standalone import 경로도 공식적으로 제시되어 있습니다. ([GitHub][1])

---

## 3) CSS 연결 (Next.js App Router 주의)

`vis-timeline`는 기본 CSS가 필요합니다. README에는 CDN 링크도 있지만, 프로젝트 안정성을 위해 **패키지 CSS를 글로벌로 import**하는 방식을 권장합니다. ([GitHub][1])

**옵션 A (권장)**: `app/layout.tsx` 또는 `app/globals.css`에서 글로벌로 포함

* App Router에서는 “글로벌 CSS”는 루트에서만 import 가능한 제약이 있으니 그 규칙을 지키세요.

예시(개념):

```ts
// app/layout.tsx (또는 app/globals.css)
import "vis-timeline/styles/vis-timeline-graph2d.min.css";
```

> 프로젝트가 Deep Ocean Theme를 운영하고 있으니, vis-timeline 기본 스타일과 충돌하면 `globals.css` 하단에 “override 블록”만 추가하는 방식이 무난합니다(테마 자체는 유지).【171:5†README.md†L42-L50】

---

## 4) 핵심: “데이터 변환”을 순수 함수로 분리해서 vis-timeline에 주입

현재 원칙이 “계산 vs 렌더 분리”입니다. 변data/*`에 두고, 컴포넌트에서는 렌더만 하게 만드세요.【171:1†README.md†L68-L72】

이미 존재:

* `scheduleActivitiesToGanttRows()` : `ScheduleActivity[] → GanttRow[]` 변환14-L31】
* `gantt-chart.tsx`가 이 변환 결과를 기반으로 DOM 렌더링/스크롤을 하고 있음【171:1†README.md†L12-L17】

##지막만 교체”

* 유지: `ScheduleActivity[] → GanttRow[]` (`sche:contentReference[oaicite:14]{index=14}`)
* 추가: `GanttRow[] → vis-timeline {groups, items}`

이렇게 하면 SSOT 구조와 기존 group/row 의미(레벨1/레벨2/leaf 등)도 그대로 살릴 수 있습니다.【171:2†README.md†L18-L29】

---

## 5) Client-only VisTimelineGantt 컴포넌트 스켈레톤

> 아래 코드는 **통합 구조**를 보여주는 스켈레톤입eduleActivity`, `GanttRow` 정의에 맞춰 조정하세요(단, 방향은 동일).

```tsx
"use client";

import { useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";

// Standalone build (공식 문서에 명시)  :contentReference[oaicite:16]{index=16}
import { Timeline } from "vis-timeline/standalone";
// 필요시: import { DataSet } from "vis-data";

import { scheduleActivitiesToGanttRows } from "@/lib/data/schedule-data";
// import { ganttRowsToVisData } from "@/lib/utils/gantt-vis-mapper"; // 새로 만들기

type Props = {
  activities: any[];              // ScheduleActivity[]
  selectedActivityId?: string | null;
  onSelectActivity?: (id: string | null) => void;
  view: "week" | "month" | "quarter"; // 기존 view 모드와 align
};

export function VisTimelineGantt(props: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<any>(null);

  const ganttRows = useMemo(
    () => scheduleActivitiesToGanttRows(props.activities),
    [props.activities]
  );

  const visData = useMemo(() => {
    // TODO: ganttRows -> { groups, items } 변환 (순수 함수로 분리 권장)
    return { groups: [], items: [] };
  }, [ganttRows]);

  useEffect(() => {
    if (!containerRef.current) return;

    // 초기화
    const options = {
      stack: false,
      zoomable: true,
      moveable: true,
      selectable: true,
      // 편집은 1차 통합에서는 OFF 권장 (기존 날짜 변경 Dialog/Preview 흐름 유지)
      editable: false,
    };

    // visData.items/groups를 DataSet으로 감싸거나, 배열로 바로 넣는 방식 중 택1
    timelineRef.current = new Timeline(
      containerRef.current,
      visData.items as any,
      visData.groups as any,
      options as any
    );

    // 선택 이벤트 → 기존 selectedActivityId 상태로 브릿지
    timelineRef.current.on("select", (e: any) => {
      const id = e?.items?.[0] ?? null;
      props.onSelectActivity?.(id);
    });

    return () => {
      timelineRef.current?.destroy?.();
      timelineRef.current = null;
    };
  }, [visData, props]);

  // 외부에서 selection 유지(선택 상태 동기화)
  useEffect(() => {
    if (!timelineRef.current) return;
    if (props.selectedActivityId) {
      timelineRef.current.setSelection([props.selectedActivityId], { focus: false });
    } else {
      timelineRef.current.setSelection([]);
    }
  }, [props.selectedActivityId]);

  return <div ref={containerRef} className="h-[600px] w-full" />;
}
```

### SSR 회피(중요)

* 이 컴포넌트는 `"use client"`이지만, 부모가 Server Component일 수 있으니, 필요하면 **dynamic import + ssr:false**로 한번 더 안전장치:

```tsx
const VisTimelineGantt = dynamic(
  () => import("@/components/gantt/VisTimelineGantt").then(m => m.VisTimelineGantt),
  { ssr: false }
);
```

---

## 6) 실제 “통합 변경”은 어디에 넣나?

문서 기준 파일 구조상, 통합 포인트는 아래 둘 중 하나입니다.

1. **Gantt 섹션에서 교체**

* `components/dashboard/sections/gantt-section.tsx`에서 `<GanttChart />` 대신 `<VisTimelineGantt />`를 렌더【171:0†LAYOUT.md†L67-L78】

2. **기존 GanttChart를 facade로 유지하고 내부 엔진만 교체 (추천)**

* `components/dashboard/gantt-chart.tsx`는 외부 API(Props)를 유지하고
  cy`/`Vis`를 선택
* 이렇게 하면 Gantt를 참조하는 상위 컴포넌트(예: TimelinePanel/3-column layout)가 거의 안 흔들립니다.【171:0†LAYOUT.md†L1-L13】

---

## 7) 기존 기능과의 연결 포인트 (실무에서 깨지는 지점)

### (1) 날짜 파싱/타임존

현재도 “타임존 안전”을 강조하고 `parseDateInput()`을 두고 있습니다.【171:2†READMne은 내부적으로 Date를 쓰는 경우가 많으니:

* `IsoDate(YYYY-MM-DD)` → `Date` 변환 시 UTC 기준 변환(또는 기존 `parseDateInput()` 재사용)을 강Activity / focus
  기존 `gantt-chart.tsx`는 DOM ref 기반 `scrollToActivity()`가 있습니다.【171:1†README.md†L12-L17】
  vis-timeline에서는 “아이템 focus/selection” 방식으로 대체합니다:
* 선택 시 `timeline.focus(id)` 또는 `setSelection([id], { focus: true }s-timeline 문서/타입 확인).

### (3) 기존 “날짜 변경 Dialog → reflow → preview” 유지

Gantt에서 드래그로 바로 날짜를 바꾸기 시작하면, 현재 설계된 “Preview/Apply” 워크플로우와 충돌하기 쉽습니다.【171:9†SYSTEM_ARCHITECTURE.md†L51-L61】
따라서 1차 통합에서는:

* vis-timeline **editable=false**
* 클릭 → 기존 DetailPanel/Dialog에서 날짜 변경 → reflowSchedule →# 8) 검증(빌드/배포 게이트)

문서에 명시된 검증 커맨드 그대로 돌리면 됩니다.【171:1†README.md†L28-L42】

```bash
pnpm run typecheck
pnpm run lint
pnpm run build
```

---

## 요약 (1줄)

`vis-timeline-gantt`는 **새 앱으로 붙이지 말고**, ity → GanttRow`)을 유지한 채 `components/dashboard/gantt-chart.tsx`또는`gantt-section.tsx`에 **Client-only vis-timeline 렌더러를 어댑터로 끼우는 방식**이 가장 빠르고 안전합니다.【171:0†LAYOUT.md†L48-L78】【171:9†SYSTEM_ARCHITECTURE.md†L27-L38】 ([GitHub][1])



[1]: https://github.com/visjs/vis-timeline "GitHub - visjs/vis-timeline:  Create a fully customizable, interactive timelines and 2d-graphs with items and ranges."
