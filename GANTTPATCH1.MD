아래는 **`vis-timeline-gantt`(POC/샘플로 보이는 Gantt 구현)**을 현재 TR Dashboard(Next.js App Router)로 **“중앙 타임라인(Gantt) 렌더러로 통합”**하는 가장 안전한 방법입니다. 핵심은 **기존 SSOT/재계산/Preview/Compare Diff 로직은 그대로 두고**, `Gantt 차트 렌더링`만 **vis-timeline 기반 컴포넌트로 교체**하는 것입니다. (README 기준 현재 구조가 이미 “계산 vs 렌더 분리”로 잡혀 있어 이 방식이 가장 적합합니다. ([GitHub][1]))

---

## 0) 현재 구조에서 “교체 지점” 정리 (통합 포인트)

README에 따르면 현재 흐름은 아래처럼 고정되어 있습니다. ([GitHub][1])

* 데이터: `data/schedule/option_c.json`
* 변환: `scheduleActivitiesToGanttRows()` (ScheduleActivity[] → GanttRow[]) ([GitHub][1])
* 렌더/상태: `components/dashboard/gantt-chart.tsx` (currentActivities 상태, 날짜 변경 UI 포함) ([GitHub][1])
* 재계산: `reflowSchedule()` + Preview 패널 ([GitHub][1])

따라서 통합의 목표는:

> `components/dashboard/gantt-chart.tsx` 안에서 **“막대/축 그리는 부분”만** vis-timeline으로 교체하고,
> 기존의 **currentActivities, reflowSchedule, scheduleActivitiesToGanttRows, Compare Diff 패널**은 그대로 유지.

---

## 1) 통합 옵션 2가지 (권장: A)

### A) 권장: “렌더러만 교체” (단일 Next.js 앱 유지)

* `vis-timeline-gantt`의 핵심 렌더 코드를 **`components/gantt/VisTimelineGantt.tsx` 같은 컴포넌트로 흡수**
* 기존 `gantt-chart.tsx`는 **오케스트레이터(상태/다이얼로그/Preview/Compare)** 역할 유지

➡️ 장점: Vercel 배포/빌드 구조 안 깨짐, SSOT 유지, 회귀 범위 최소

### B) (비권장/Phase2) 별도 앱/패키지로 유지 (iframe/monorepo)

* monorepo(workspaces)로 `vis-timeline-gantt`를 packages로 유지하거나 iframe으로 붙임
* 상태/선택/비교/저장 로직이 분리되기 쉬워 SSOT 목적과 충돌

➡️ “SSOT 운영” 목표라면 B는 피하는 게 좋습니다.

---

## 2) vis-timeline로 붙일 때 필수 기술 포인트

vis-timeline의 Timeline은 DOM 기반 렌더링이며, **items(start/end), groups, DataSet(바인딩)**을 받습니다. ([Vis.js][2])
또한 **Custom time bar(세로 날짜 라인)**를 `addCustomTime`, `setCustomTime`로 제어할 수 있습니다. ([Vis.js][2])

### (1) Next.js(App Router)에서 SSR 회피

* Timeline은 DOM을 쓰므로 **Client Component**로 격리해야 합니다.
* `components/gantt/VisTimelineGantt.tsx` 상단에 `"use client"`.

### (2) CSS 로드

* vis-timeline CSS는 전역으로 1회 로드가 안전합니다.
* 예시로 `react-vis-timeline`은 아래 경로로 CSS를 import 합니다. ([GitHub][3])

  * `"vis-timeline/styles/vis-timeline-graph2d.min.css"`

> Next.js에선 보통 `app/layout.tsx` 또는 `app/globals.css`에서 전역 import로 처리합니다.

### (3) “Selected Date 라인” 구현 (버그 #1 해결 핵심)

* Custom time bar:

  * `timeline.addCustomTime(date, "selected-date")`
  * `timeline.setCustomTime(date, "selected-date")` ([Vis.js][2])
* 이때 `id("selected-date")`가 **CSS class로 붙어서 스타일링 가능**합니다. ([Vis.js][2])

### (4) “Trip/Activity 클릭 → 해당 막대 포커스” (현재 scrollToActivity 대체)

* `Timeline.setSelection(ids, { focus: true })`는 **수평뿐 아니라 수직 스크롤도 유도**합니다. ([Vis.js][4])
* 기존 DOM ref 스크롤보다 안정적입니다.

---

## 3) 구현 설계: 최소 변경으로 붙이는 컴포넌트 분해

### 파일 단위 권장 구조

* `components/gantt/VisTimelineGantt.tsx`

  * vis-timeline 인스턴스 생성/파괴, DataSet 업데이트, 이벤트 브릿지
* `lib/gantt/visTimelineMapper.ts`

  * `GanttRow[]` → `{ groups, items }` 변환 (pure function)
* `components/dashboard/gantt-chart.tsx`

  * 기존대로 `scheduleActivitiesToGanttRows()` 호출 후,
  * `<VisTimelineGantt groups={...} items={...} selectedDate={...} onItemClick={...} />`로 렌더 위임

README 기준, `gantt-chart.tsx`가 이미 “변환/인터랙션/Preview 연결” 중심이므로 여기에 “렌더러 슬롯”만 교체하면 됩니다. ([GitHub][1])

---

## 4) 샘플 코드 스켈레톤 (통합에 필요한 핵심만)

아래는 “개념이 아니라 바로 붙일 수 있는 형태”로 최소 스켈레톤을 제시합니다.
(프로젝트 타입/경로는 README 구조를 따르는 가정입니다. ([GitHub][1]))

### 4.1 `components/gantt/VisTimelineGantt.tsx` (Client only)

```tsx
"use client";

import { useEffect, useMemo, useRef } from "react";
import { DataSet } from "vis-data";
import { Timeline } from "vis-timeline/standalone";
import type { DataGroup, DataItem, TimelineOptions } from "vis-timeline";

// 전역 CSS는 app/layout.tsx 또는 app/globals.css에서 1회 import 권장
// import "vis-timeline/styles/vis-timeline-graph2d.min.css";

type Props = {
  groups: DataGroup[];
  items: DataItem[];
  selectedDate?: Date;          // "선택된 날짜" 세로 라인용
  onItemClick?: (itemId: string) => void; // 기존 날짜변경 Dialog 연결
};

export function VisTimelineGantt({ groups, items, selectedDate, onItemClick }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<Timeline | null>(null);

  // DataSet은 "인스턴스 유지"가 핵심 (전체 재생성/리렌더 비용 최소화)
  const groupsDS = useMemo(() => new DataSet<DataGroup>([]), []);
  const itemsDS = useMemo(() => new DataSet<DataItem>([]), []);

  useEffect(() => {
    if (!containerRef.current) return;

    // 초기 데이터 주입
    groupsDS.clear();
    groupsDS.add(groups);
    itemsDS.clear();
    itemsDS.add(items);

    const options: TimelineOptions = {
      stack: false,
      multiselect: false,
      selectable: true,
      // 필요시: zoomMin/zoomMax, timeAxis.scale 등은 여기서 통제
    };

    const timeline = new Timeline(containerRef.current, itemsDS, groupsDS, options);
    timelineRef.current = timeline;

    // item 선택 이벤트 → 기존 gantt-chart.tsx의 날짜변경 UI에 브릿지
    timeline.on("select", (props) => {
      const id = props.items?.[0];
      if (id != null) onItemClick?.(String(id));
    });

    // selected date bar 초기 생성
    if (selectedDate) {
      timeline.addCustomTime(selectedDate, "selected-date");
      timeline.setCustomTimeTitle("Selected Date", "selected-date");
    }

    return () => {
      timeline.destroy(); // 메모리/리스너 정리 :contentReference[oaicite:13]{index=13}
      timelineRef.current = null;
    };
  }, [groupsDS, itemsDS]); // DS는 1회 생성되므로 deps는 DS만

  // props.items 변경 시 DataSet 업데이트
  useEffect(() => {
    itemsDS.clear();
    itemsDS.add(items);
  }, [itemsDS, items]);

  // props.groups 변경 시 DataSet 업데이트
  useEffect(() => {
    groupsDS.clear();
    groupsDS.add(groups);
  }, [groupsDS, groups]);

  // selectedDate 변경 시 custom time 이동
  useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline || !selectedDate) return;

    // 이미 addCustomTime 했다면 setCustomTime만 호출하면 됨 :contentReference[oaicite:14]{index=14}
    try {
      timeline.setCustomTime(selectedDate, "selected-date");
    } catch {
      timeline.addCustomTime(selectedDate, "selected-date");
    }
  }, [selectedDate]);

  return <div ref={containerRef} className="h-[520px] w-full" />;
}
```

### 4.2 `lib/gantt/visTimelineMapper.ts` (GanttRow → groups/items)

vis-timeline은 **group(id/content)**, **item(id/group/start/end/className/title)** 구조를 요구합니다. ([Vis.js][2])

```ts
import type { DataGroup, DataItem } from "vis-timeline";

// (가정) 프로젝트 내부 GanttRow/GanttActivity 타입을 그대로 사용
export function ganttRowsToVisData(rows: Array<{
  rowId: string;
  label: string;
  activities: Array<{
    id: string;
    label: string;
    start: Date;
    end: Date;
    className?: string;
    title?: string;
  }>;
}>): { groups: DataGroup[]; items: DataItem[] } {
  const groups: DataGroup[] = rows.map((r, idx) => ({
    id: r.rowId,
    content: r.label,
    order: idx,
  }));

  const items: DataItem[] = rows.flatMap((r) =>
    r.activities.map((a) => ({
      id: a.id,
      group: r.rowId,
      content: a.label,
      start: a.start,
      end: a.end,
      type: "range",       // start+end → range :contentReference[oaicite:16]{index=16}
      className: a.className,
      title: a.title,
    }))
  );

  return { groups, items };
}
```

---

## 5) “날짜가 어긋나는 문제(#1)”를 통합 단계에서 같이 잡는 법

사용자 증상: “selected date는 움직이는데, 2/7을 넣으면 2/7 라인이 아니다.”

이건 거의 항상 **날짜 파싱이 UTC/로컬이 섞여서** 발생합니다. README에도 `parseDateInput()`으로 타임존 안전 파싱을 한다고 되어 있으니 ([GitHub][1]), 아래 원칙을 강제하세요:

### 원칙

* **items(start/end)**를 만드는 파서와
* **selectedDate custom time bar**에 쓰는 파서를
* **완전히 동일**하게 쓴다.

### 실전 규칙(추천)

* `new Date("2026-02-07")` 금지(브라우저에 따라 UTC로 해석되어 하루 밀릴 수 있음)
* date-only는 항상:

  * `new Date(y, m-1, d, 12, 0, 0)` (로컬 정오 고정)
    또는
  * 프로젝트의 `parseDateInput()`/SSOT 유틸을 단일 경로로 사용

vis-timeline은 item의 start/end를 Date로 받고, 축/렌더도 그 Date를 기준으로 합니다. ([Vis.js][2])
따라서 “입력 파서 통일”이 버그 #1의 1순위 해법입니다.

---

## 6) 통합 후 기존 기능을 어떻게 연결할지 (체크리스트)

### (1) “Activity 클릭 → 날짜 변경 Dialog” 유지

* `timeline.on("select", ...)`에서 itemId를 받아
* 기존 `gantt-chart.tsx`의 Dialog open 핸들러에 연결

(문서에 따르면 기존 gantt-chart는 클릭/툴팁/다이얼로그 흐름이 이미 존재합니다. ([GitHub][1]))

### (2) “Trip 카드 클릭 → 차트 스크롤/포커스”

기존 scrollToActivity가 DOM ref 기반이라면,

* `timeline.setSelection([activityId], { focus: true })`로 대체 가능
* focus는 수직 스크롤도 유도합니다. ([Vis.js][4])

### (3) “Compare Mode(ghost baseline bars)”는 className으로 처리

vis-timeline item은 `className`으로 개별 스타일 적용이 가능합니다. ([Vis.js][2])
따라서 baseline items를 별도 id(prefix)로 추가하고 `className: "baseline-ghost"`로 렌더하면 됩니다.

---

## 7) PR 단위로 안전하게 통합하는 방법(권장)

1. **PR-A (Structural)**

   * vis-timeline 의존성 추가 + CSS 전역 로드
   * `components/gantt/VisTimelineGantt.tsx` 추가
   * 기존 UI는 그대로(아직 교체 X)

2. **PR-B (Behavioral)**

   * `gantt-chart.tsx`에서 렌더러만 `<VisTimelineGantt>`로 교체
   * selectedDate 라인 연결(버그 #1 동시 해결)

3. **PR-C (Cleanup)**

   * 기존 렌더러 코드 제거
   * `vis-timeline-gantt` 폴더가 POC라면 docs로 이동 또는 삭제

검증 커맨드는 README에 정의된 게이트 그대로 쓰면 됩니다. ([GitHub][1])

* `pnpm run typecheck`
* `pnpm run lint`
* `pnpm test -- --run`
* `pnpm run build`

---

## (가정) `vis-timeline-gantt` 폴더가 “별도 POC”일 때, 코드 흡수 기준

`vis-timeline-gantt`가 별도 엔트리(예: vite/CRA/순수HTML)라면 다음만 추려서 흡수하면 됩니다.

* Timeline 생성 로직 + options
* items/groups 생성(매핑) 로직
* 선택/클릭 이벤트 처리
* custom time bar(선택 날짜 라인)
* CSS/스타일 오버라이드

그리고 **데이터 소스(SSOT)와 저장/비교/리포트는 기존 Next.js 쪽만 사용**하세요. (이게 “통합”의 핵심입니다.)

---

원하면, 지금 질문을 더 좁혀서 **“기존 `gantt-chart.tsx`를 vis-timeline로 완전히 교체할 때 필요한 props/상태/이벤트 계약(스키마)”**를 표준 JSON 스키마 형태로 정리해줄 수도 있습니다.

[1]: https://github.com/macho715/tr_dashboard.git "GitHub - macho715/tr_dashboard"
[2]: https://visjs.github.io/vis-timeline/docs/timeline/ "
      timeline - vis.js - A dynamic, browser based visualization library.
    "
[3]: https://github.com/razbensimon/react-vis-timeline/blob/master/src/timeline.tsx?utm_source=chatgpt.com "react-vis-timeline/src/timeline.tsx at master"
[4]: https://visjs.github.io/vis-timeline/examples/timeline/interaction/setSelection.html "Timeline | interaction | Select items"
