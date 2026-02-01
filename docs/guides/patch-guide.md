아래는 **hvdc-tr-dashboard-lc(TR Dashboard)** 쪽에 **convert/.cursor의 `agi-schedule-updater` “의도(스케줄 업데이트 자동화)”를 포팅**하면서, **대시보드 UI에 “검색+업데이트” 박스를 추가**해 **동일 기능을 클릭 몇 번으로 실행**되도록 만든 적용안입니다.

> 참고: 이 환경에서 GitHub의 **`.cursor` 하위(디렉토리/파일) 상세 내용을 직접 열람하는 뷰가 정상 로드되지 않아**, convert의 `agi-schedule-updater` 파일을 “그대로 복사”는 못 했습니다. 대신 **HVDC 대시보드가 이미 갖고 있는 `reflowSchedule()` 기반 재계산 엔진/Preview 흐름**을 그대로 활용해서, **동일 목적(스케줄 업데이트 자동화)** 을 **대시보드 런타임 + Cursor 커맨드**로 재구성했습니다.
> 대시보드의 재계산 엔진 시그니처/옵션은 README에 명시돼 있습니다. ([GitHub][1])

---

## 적용 목표

### 1) 런타임(대시보드 UI)

* 상단에 **“Activity 검색 → 새 시작일 입력 → Preview → Apply”** 를 한 박스에서 수행
* `reflowSchedule(scheduleActivities, activityId, newStart, options)`를 그대로 호출해서 재계산 ([GitHub][1])
* **배치 업데이트 모드**(여러 activity를 한 번에 업데이트) 지원
* 결과를 **diff(전/후 날짜 변경 목록)**로 보여주고, **Patch JSON 다운로드**까지 자동화

### 2) 개발 자동화(Cursor)

* hvdc-tr-dashboard-lc에도 `.cursor/rules`, `.cursor/commands` 구조가 이미 있으므로 ([GitHub][1])
  여기에 **`/agi-schedule-updater` 커맨드 + 룰**을 추가해, convert에서 쓰던 “서브 에이전트(업데이트 워크플로)”를 대시보드에서도 동일하게 호출 가능하게 만듦.

---

## 변경/추가 파일 목록

### 신규

* `components/dashboard/agi-schedule-updater-bar.tsx`
* `.cursor/commands/agi-schedule-updater.mdc`
* `.cursor/rules/agi-schedule-updater.mdc`

### 수정

* `app/page.tsx` (Updater Bar 삽입 + 상태 연결)
* `components/dashboard/gantt-chart.tsx` (선택된 activity로 스크롤 포커스 지원 — README에 스크롤 기능 존재 ([GitHub][1]))

---

## 1) 대시보드 UI: 검색/업데이트 박스 추가

### (A) 신규 파일: `components/dashboard/agi-schedule-updater-bar.tsx`

```tsx
"use client";

import * as React from "react";
import { reflowSchedule } from "@/lib/utils/schedule-reflow";
import type { ScheduleActivity } from "@/lib/ssot/schedule";

type ChangeRow = {
  id: string;
  name: string;
  beforeStart?: string;
  afterStart?: string;
  beforeEnd?: string;
  afterEnd?: string;
};

function toStr(v: unknown): string | undefined {
  if (typeof v === "string") return v;
  if (v == null) return undefined;
  return String(v);
}

function getId(a: ScheduleActivity): string {
  const x = a as any;
  return (
    toStr(x.id) ??
    toStr(x.activityId) ??
    toStr(x.activity_id) ??
    toStr(x.code) ??
    ""
  );
}

function getName(a: ScheduleActivity): string {
  const x = a as any;
  return (
    toStr(x.name) ??
    toStr(x.title) ??
    toStr(x.activityName) ??
    toStr(x.activity_name) ??
    ""
  );
}

function getStart(a: ScheduleActivity): string | undefined {
  const x = a as any;
  return toStr(x.start_date) ?? toStr(x.startDate) ?? toStr(x.start);
}

function getEnd(a: ScheduleActivity): string | undefined {
  const x = a as any;
  return (
    toStr(x.end_date) ??
    toStr(x.endDate) ??
    toStr(x.finish) ??
    toStr(x.end)
  );
}

function isIsoDate(d: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

function buildChanges(before: ScheduleActivity[], after: ScheduleActivity[]): ChangeRow[] {
  const beforeMap = new Map<string, { start?: string; end?: string; name: string }>();
  for (const a of before) {
    const id = getId(a);
    if (!id) continue;
    beforeMap.set(id, { start: getStart(a), end: getEnd(a), name: getName(a) });
  }

  const changes: ChangeRow[] = [];
  for (const a of after) {
    const id = getId(a);
    if (!id) continue;

    const b = beforeMap.get(id);
    if (!b) continue;

    const afterStart = getStart(a);
    const afterEnd = getEnd(a);

    if (b.start !== afterStart || b.end !== afterEnd) {
      changes.push({
        id,
        name: getName(a) || b.name,
        beforeStart: b.start,
        afterStart,
        beforeEnd: b.end,
        afterEnd,
      });
    }
  }

  // “많이 바뀐 것”을 위로 보여주고 싶으면 여기서 정렬 규칙 추가 가능
  return changes;
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type PreviewState = {
  next: ScheduleActivity[];
  changes: ChangeRow[];
  raw: unknown;
  anchors: Array<{ activityId: string; newStart: string }>;
};

type Props = {
  activities: ScheduleActivity[];
  onApplyActivities: (next: ScheduleActivity[]) => void;

  /**
   * 선택된 Activity를 Gantt로 “포커스(스크롤)”시키고 싶으면 사용.
   * (아래 gantt-chart.tsx에 focusActivityId prop 추가하는 방식)
   */
  onFocusActivity?: (activityId: string) => void;

  className?: string;
};

export function AgiScheduleUpdaterBar({
  activities,
  onApplyActivities,
  onFocusActivity,
  className,
}: Props) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const [mode, setMode] = React.useState<"single" | "bulk">("single");

  // single mode
  const [query, setQuery] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [newStart, setNewStart] = React.useState("");

  // bulk mode
  const [bulkText, setBulkText] = React.useState("");

  const [isOpen, setIsOpen] = React.useState(false);
  const [isWorking, setIsWorking] = React.useState(false);
  const [preview, setPreview] = React.useState<PreviewState | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Ctrl/⌘+K → 검색 input 포커스 (커맨드 팔레트 UX의 “최소 버전”)
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const selected = React.useMemo(() => {
    if (!selectedId) return null;
    return activities.find((a) => getId(a) === selectedId) ?? null;
  }, [activities, selectedId]);

  const suggestions = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out: Array<{ id: string; label: string }> = [];

    for (const a of activities) {
      const id = getId(a);
      if (!id) continue;

      const name = getName(a);
      const label = name ? `${id}: ${name}` : id;
      const hay = `${id} ${name}`.toLowerCase();

      if (hay.includes(q)) out.push({ id, label });
      if (out.length >= 30) break;
    }
    return out;
  }, [activities, query]);

  function resetPreview() {
    setPreview(null);
    setError(null);
  }

  function parseBulk(text: string): Array<{ activityId: string; newStart: string }> {
    // 허용 포맷 예시:
    // ACT-001 2026-02-15
    // ACT-002=2026-02-18
    // # comment
    const lines = text.split(/\r?\n/);
    const out: Array<{ activityId: string; newStart: string }> = [];

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i].trim();
      if (!raw || raw.startsWith("#")) continue;

      const normalized = raw.replace("=", " ");
      const parts = normalized.split(/\s+/).filter(Boolean);
      if (parts.length < 2) {
        throw new Error(`Bulk 입력 ${i + 1}행 파싱 실패: "${raw}"`);
      }

      const activityId = parts[0];
      const newStart = parts[1];
      if (!isIsoDate(newStart)) {
        throw new Error(`Bulk 입력 ${i + 1}행 날짜 형식 오류(YYYY-MM-DD): "${newStart}"`);
      }

      out.push({ activityId, newStart });
    }

    return out;
  }

  function runReflow(base: ScheduleActivity[], anchorId: string, start: string) {
    // README에서 제시된 옵션 세트를 기본값으로 사용 :contentReference[oaicite:4]{index=4}
    return reflowSchedule(base, anchorId, start, {
      respectLocks: true,
      respectConstraints: true,
      checkResourceConflicts: true,
      detectCycles: true,
    } as any);
  }

  async function runPreviewSingle() {
    setError(null);
    setPreview(null);

    if (!selectedId) {
      setError("활동(Activity)을 먼저 선택하세요.");
      return;
    }
    if (!newStart || !isIsoDate(newStart)) {
      setError("새 시작일은 YYYY-MM-DD 형식이어야 합니다.");
      return;
    }

    setIsWorking(true);
    try {
      const result = runReflow(activities, selectedId, newStart);
      const next = (result as any).activities as ScheduleActivity[];
      if (!Array.isArray(next)) throw new Error("reflowSchedule 결과.activities가 배열이 아닙니다.");

      const changes = buildChanges(activities, next);
      setPreview({
        next,
        changes,
        raw: result,
        anchors: [{ activityId: selectedId, newStart }],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsWorking(false);
    }
  }

  async function runPreviewBulk() {
    setError(null);
    setPreview(null);

    setIsWorking(true);
    try {
      const anchors = parseBulk(bulkText);
      if (anchors.length === 0) {
        setError("Bulk 입력이 비어 있습니다.");
        return;
      }

      let nextActivities = activities;
      let lastRaw: unknown = null;

      for (const a of anchors) {
        const result = runReflow(nextActivities, a.activityId, a.newStart);
        const next = (result as any).activities as ScheduleActivity[];
        if (!Array.isArray(next)) {
          throw new Error(`reflowSchedule 결과.activities가 배열이 아닙니다 (anchor=${a.activityId})`);
        }
        nextActivities = next;
        lastRaw = result;
      }

      const changes = buildChanges(activities, nextActivities);
      setPreview({
        next: nextActivities,
        changes,
        raw: lastRaw,
        anchors,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsWorking(false);
    }
  }

  function applyPreview() {
    if (!preview) return;
    onApplyActivities(preview.next);
  }

  function exportPatch() {
    if (!preview) return;

    const patch = {
      generatedAt: new Date().toISOString(),
      anchors: preview.anchors,
      changes: preview.changes.map((c) => ({
        id: c.id,
        name: c.name,
        start: c.afterStart,
        end: c.afterEnd,
      })),
    };

    const suffix =
      preview.anchors.length === 1
        ? `${preview.anchors[0].activityId}_${preview.anchors[0].newStart}`
        : `bulk_${preview.anchors.length}anchors`;

    downloadJson(`schedule_patch_${suffix}.json`, patch);
  }

  function exportFull() {
    if (!preview) return;
    downloadJson("schedule_full_updated.json", preview.next);
  }

  return (
    <div className={`bg-glass border border-white/10 rounded-xl p-3 ${className ?? ""}`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-white/90">
          <span className="font-semibold">AGI Schedule Updater</span>
          <span className="ml-2 text-xs text-white/50">(Ctrl/⌘+K 검색 포커스)</span>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className={`rounded-lg px-3 py-1.5 text-xs border ${
              mode === "single"
                ? "bg-cyan-500/20 border-cyan-400/30 text-cyan-100"
                : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
            }`}
            onClick={() => {
              setMode("single");
              resetPreview();
            }}
          >
            Single
          </button>

          <button
            type="button"
            className={`rounded-lg px-3 py-1.5 text-xs border ${
              mode === "bulk"
                ? "bg-cyan-500/20 border-cyan-400/30 text-cyan-100"
                : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
            }`}
            onClick={() => {
              setMode("bulk");
              resetPreview();
            }}
          >
            Bulk
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {mode === "single" ? (
          <div className="flex flex-col sm:flex-row gap-2 sm:items-start">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                className="w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                placeholder="Activity 검색 (ID 또는 이름)…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                onBlur={() => window.setTimeout(() => setIsOpen(false), 150)}
              />

              {isOpen && suggestions.length > 0 ? (
                <div className="absolute z-50 mt-2 w-full rounded-lg bg-[#071018]/90 backdrop-blur border border-white/10 shadow-lg max-h-72 overflow-auto">
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm text-white/90 hover:bg-white/5"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setSelectedId(s.id);
                        setQuery(s.label);
                        setIsOpen(false);
                        onFocusActivity?.(s.id);

                        // 선택 직후 기본값으로 현재 start date를 채우고 싶으면:
                        const found = activities.find((a) => getId(a) === s.id);
                        const start = found ? getStart(found) : undefined;
                        if (start && isIsoDate(start)) setNewStart(start);
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              ) : null}

              {selected ? (
                <div className="mt-2 text-xs text-white/60">
                  선택: <span className="text-white/90">{getId(selected)}</span>
                  {getName(selected) ? <span className="text-white/60"> — {getName(selected)}</span> : null}
                  {getStart(selected) ? <span className="ml-2">현재 시작: {getStart(selected)}</span> : null}
                  {getEnd(selected) ? <span className="ml-2">현재 종료: {getEnd(selected)}</span> : null}
                </div>
              ) : null}
            </div>

            <div className="flex gap-2 items-center">
              <input
                className="w-40 rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                placeholder="YYYY-MM-DD"
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
              />

              <button
                type="button"
                className="rounded-lg bg-cyan-500/20 border border-cyan-400/30 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-500/30 disabled:opacity-50"
                disabled={isWorking}
                onClick={() => {
                  resetPreview();
                  runPreviewSingle();
                }}
              >
                {isWorking ? "계산중…" : "Preview"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <textarea
              className="w-full min-h-[120px] rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
              placeholder={`예시)
# activityId newStart(YYYY-MM-DD)
ACT-001 2026-02-15
ACT-023=2026-02-18`}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
            />

            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-lg bg-cyan-500/20 border border-cyan-400/30 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-500/30 disabled:opacity-50"
                disabled={isWorking}
                onClick={() => {
                  resetPreview();
                  runPreviewBulk();
                }}
              >
                {isWorking ? "계산중…" : "Bulk Preview"}
              </button>

              <button
                type="button"
                className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/10"
                onClick={() => {
                  setBulkText("");
                  resetPreview();
                }}
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {error ? <div className="text-sm text-red-300">{error}</div> : null}

        {preview ? (
          <div className="rounded-lg border border-white/10 bg-black/10 p-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="text-sm text-white/90">
                영향 작업: <span className="font-semibold">{preview.changes.length}</span>개
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white/90 hover:bg-white/10"
                  onClick={exportPatch}
                >
                  Patch JSON
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white/90 hover:bg-white/10"
                  onClick={exportFull}
                >
                  Full JSON
                </button>

                <button
                  type="button"
                  className="rounded-lg bg-emerald-500/20 border border-emerald-400/30 px-3 py-2 text-sm text-emerald-50 hover:bg-emerald-500/30"
                  onClick={applyPreview}
                >
                  적용(Apply)
                </button>

                <button
                  type="button"
                  className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white/90 hover:bg-white/10"
                  onClick={() => setPreview(null)}
                >
                  닫기
                </button>
              </div>
            </div>

            <div className="mt-2 max-h-56 overflow-auto">
              <table className="w-full text-xs text-white/80">
                <thead className="sticky top-0 bg-[#071018]/90">
                  <tr>
                    <th className="text-left py-2 pr-2">ID</th>
                    <th className="text-left py-2 pr-2">작업</th>
                    <th className="text-left py-2 pr-2">시작</th>
                    <th className="text-left py-2 pr-2">종료</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.changes.slice(0, 200).map((c) => (
                    <tr key={c.id} className="border-t border-white/5">
                      <td className="py-2 pr-2 font-mono">{c.id}</td>
                      <td className="py-2 pr-2">{c.name}</td>
                      <td className="py-2 pr-2">
                        <span className="text-white/40">{c.beforeStart ?? "-"}</span>{" "}
                        <span className="text-cyan-200">{c.afterStart ?? "-"}</span>
                      </td>
                      <td className="py-2 pr-2">
                        <span className="text-white/40">{c.beforeEnd ?? "-"}</span>{" "}
                        <span className="text-cyan-200">{c.afterEnd ?? "-"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {preview.changes.length > 200 ? (
                <div className="mt-2 text-xs text-white/50">
                  표시는 200개까지만 (전체 {preview.changes.length}개)
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
```

---

### (B) `app/page.tsx`에 Updater Bar 삽입

README 기준으로 `app/page.tsx`가 섹션 조립자이며(그리고 `currentActivities` 같은 상태를 사용) ([GitHub][1])
다음처럼 **Header 아래(또는 Gantt 위)**에 삽입하면 됩니다.

> 아래는 “삽입 스니펫”입니다. 실제 `page.tsx`의 기존 state/props 이름에 맞춰 최소 조정만 하세요.

```tsx
// app/page.tsx (상단 import에 추가)
import { AgiScheduleUpdaterBar } from "@/components/dashboard/agi-schedule-updater-bar";
import type { ScheduleActivity } from "@/lib/ssot/schedule";

// ... 기존 코드 ...

export default function Page() {
  // 이미 있을 가능성이 높은 state:
  // const [currentActivities, setCurrentActivities] = useState<ScheduleActivity[]>(scheduleActivities);

  const [focusActivityId, setFocusActivityId] = React.useState<string | null>(null);

  return (
    <>
      {/* 기존 Header */}
      {/* <Header /> */}

      <section className="mx-auto max-w-7xl px-4 mt-4">
        <AgiScheduleUpdaterBar
          activities={currentActivities as ScheduleActivity[]}
          onApplyActivities={(next) => setCurrentActivities(next)}
          onFocusActivity={(id) => {
            setFocusActivityId(id);
            // 스크롤 트리거 후 초기화(선택): 필요 없으면 제거
            window.setTimeout(() => setFocusActivityId(null), 600);
          }}
        />
      </section>

      {/* 기존 GanttChart 호출부에 focusActivityId prop만 추가 */}
      {/* <GanttChart currentActivities={currentActivities} ... /> */}
      <GanttChart
        currentActivities={currentActivities}
        focusActivityId={focusActivityId}
        // ... 기존 props 유지 ...
      />
    </>
  );
}
```

---

### (C) `components/dashboard/gantt-chart.tsx`에 “포커스 스크롤” prop 추가

README에 `scrollToActivity(activityId)`와 `activityRefs Map` 기반의 스크롤 기능이 이미 있다고 되어 있으므로 ([GitHub][1])
그 흐름에 최소 변경으로 붙입니다.

```tsx
// components/dashboard/gantt-chart.tsx

type Props = {
  // ... 기존 props ...
  focusActivityId?: string | null;
};

export default function GanttChart(props: Props) {
  const { focusActivityId } = props;

  // 기존에 이미 존재하는 함수/로직이 있다고 가정:
  // const scrollToActivity = React.useCallback((activityId: string) => { ... }, [...])

  React.useEffect(() => {
    if (!focusActivityId) return;
    scrollToActivity(focusActivityId);
  }, [focusActivityId /*, scrollToActivity */]);

  // ... 기존 렌더 ...
}
```

---

## 2) Cursor 서브 에이전트(스킬) 포팅: `.cursor`에 커맨드/룰 추가

대시보드 repo는 이미 `.cursor/rules`, `.cursor/commands`, `.cursor/config` 구조를 갖고 있고 ([GitHub][1])
`/validate` 등 커스텀 명령어도 문서화돼 있습니다. ([GitHub][1])
따라서 **동일 패턴으로** `agi-schedule-updater`를 추가합니다.

### (A) 신규: `.cursor/commands/agi-schedule-updater.mdc`

```md
---
name: agi-schedule-updater
description: AGI TR schedule update workflow (preview→apply, export patch) for hvdc-tr-dashboard-lc
---

You are the "agi-schedule-updater" sub-agent for this repository.

## Goal
Implement or update schedule changes safely using the existing schedule reflow engine, and expose a simple UI path in the dashboard.

## Hard Rules (SSOT / Architecture)
- Use the existing SSOT types in `lib/ssot/schedule.ts`. Do not duplicate enums/constants.
- Use `reflowSchedule()` from `lib/utils/schedule-reflow.ts` as the only schedule recalculation mechanism.
- Keep calculations pure in `lib/utils/*`; UI goes to `components/*`.
- Always provide a "Preview → Apply" path. Never apply silently.

## Default Reflow Options
- respectLocks: true
- respectConstraints: true
- checkResourceConflicts: true
- detectCycles: true

## Tasks
1) If user provides a single activity + date:
   - Update the dashboard UI so user can search that activity and run reflow quickly.
2) If user provides multiple anchors:
   - Support bulk updates from a textarea/paste format.
3) Export artifacts:
   - Provide Patch JSON export (changes only)
   - Provide Full JSON export (entire updated activities array)
4) Validation
   - Run `pnpm run typecheck`, `pnpm run lint`, `pnpm run build` (only if scripts exist)

## Output
- Summarize what changed (files + behavior).
- Show a sample Patch JSON structure.
```

### (B) 신규: `.cursor/rules/agi-schedule-updater.mdc`

```md
---
description: Guardrails for AGI schedule updates (hvdc-tr-dashboard-lc)
globs:
  - "app/**/*.tsx"
  - "components/**/*.tsx"
  - "lib/**/*.ts"
  - "data/schedule/option_c.json"
---

# AGI Schedule Updater Rules

## Use the existing schedule engine
- Do not implement schedule logic in UI files.
- Use `reflowSchedule()` and treat it as the source of truth.

## UI/UX
- Always show a diff preview (before/after dates).
- Provide explicit Apply and a way to export the result (patch/full json).

## Data safety
- Never mutate the input activities array in-place (keep immutability).
- Prefer generating patch outputs over manual edits to data/schedule/option_c.json.

## Quality gates
- Maintain build/typecheck cleanliness.
- Avoid introducing new dependencies unless necessary.
```

---

## 사용 방법(사용자 관점)

1. 대시보드 상단의 **AGI Schedule Updater** 박스에서:

   * 검색(활동 ID/이름)
   * 새 시작일 `YYYY-MM-DD` 입력
   * **Preview** → 변경 목록 확인 → **Apply**
   * 필요 시 **Patch JSON / Full JSON 다운로드**로 산출물 확보

2. 배치 업데이트가 필요하면:

   * **Bulk 탭**
   * 아래처럼 붙여넣고 **Bulk Preview → Apply**

   ```text
   ACT-001 2026-02-15
   ACT-023=2026-02-18
   ```

3. 키보드:

   * **Ctrl/⌘ + K** → 검색창으로 바로 포커스

---

## 2× GitHub 교차검증(적용 근거)

| 레포             | 확인 내용                                                                          | 우리 적용/차이                                                                                 |
| -------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `dip/cmdk`     | React용 “command menu/combobox” 컴포넌트로 ⌘K 기반 검색/선택 UX 제공 ([GitHub][2])           | 이번 구현은 **의존성 추가 없이** Ctrl/⌘+K 포커스 + 간단 suggest dropdown으로 **경량 구현**. 필요 시 cmdk로 업그레이드 가능 |
| `shadcn-ui/ui` | `Command/Combobox` 패턴을 문서/소스 형태로 제공(Next.js+TS+Tailwind에서 흔히 사용) ([GitHub][3]) | hvdc 대시보드는 Radix 기반이므로, 향후 **shadcn Command로 교체**해도 구조적으로 호환 가능. 현재는 최소 변경 우선            |

---

## 마무리: 이 적용안이 “convert의 agi-schedule-updater”를 대시보드로 옮기는 방식

* convert는 “업무 자동화 모듈 집합(AGI 포함)” 성격이고 ([GitHub][4])
  hvdc-tr-dashboard-lc는 이미 **스케줄 재계산 엔진 + Preview + 자원충돌 탐지 흐름**을 갖고 있습니다. ([GitHub][1])
* 따라서 convert의 `agi-schedule-updater`가 하던 핵심(= **스케줄 업데이트를 안전하게 자동화**)을,

  * **Cursor 커맨드/룰**로 개발 자동화 포팅
  * **대시보드 검색/업데이트 박스**로 운영 자동화(사용자 조작 최소화)
    로 분리해서 대시보드에 “적용”한 형태입니다.

원하면, 다음 단계로는:

* **Patch JSON을 다시 업로드/적용(import)** 하는 UI까지 추가(팀 협업 시 유용)
* “항차(Voyage) 단위 앵커(Load-out/Sail-away 등) 선택” 같은 **도메인 프리셋 버튼** 추가
  까지 확장하면, 운영자가 사실상 “버튼 몇 개”로 일정 시나리오를 돌릴 수 있습니다.

[1]: https://github.com/macho715/hvdc-tr-dashboard-lc "GitHub - macho715/hvdc-tr-dashboard-lc"
[2]: https://github.com/dip/cmdk?utm_source=chatgpt.com "dip/cmdk: Fast, unstyled command menu React component."
[3]: https://github.com/shadcn-ui/ui/blob/main/apps/v4/content/docs/components/radix/combobox.mdx?utm_source=chatgpt.com "ui/apps/v4/content/docs/components/radix/combobox.mdx ..."
[4]: https://github.com/macho715/convert "GitHub - macho715/convert"
