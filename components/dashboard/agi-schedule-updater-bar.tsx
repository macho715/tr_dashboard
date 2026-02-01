"use client";

import * as React from "react";
import { reflowSchedule } from "@/lib/utils/schedule-reflow";
import type { ImpactReport, ScheduleActivity } from "@/lib/ssot/schedule";

type ChangeRow = {
  id: string;
  name: string;
  beforeStart?: string;
  afterStart?: string;
  beforeEnd?: string;
  afterEnd?: string;
};

function getId(a: ScheduleActivity): string {
  return a.activity_id ?? "";
}

function getName(a: ScheduleActivity): string {
  return a.activity_name ?? "";
}

function getStart(a: ScheduleActivity): string {
  return a.planned_start;
}

function getEnd(a: ScheduleActivity): string {
  return a.planned_finish;
}

function isIsoDate(d: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

function buildChanges(before: ScheduleActivity[], after: ScheduleActivity[]): ChangeRow[] {
  const beforeMap = new Map<string, { start: string; end: string; name: string }>();
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
  impactReport: ImpactReport | null;
  raw: unknown;
  anchors: Array<{ activityId: string; newStart: string }>;
};

type Props = {
  activities: ScheduleActivity[];
  onApplyActivities: (next: ScheduleActivity[], impactReport: ImpactReport | null) => void;
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

  const [query, setQuery] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [newStart, setNewStart] = React.useState("");

  const [bulkText, setBulkText] = React.useState("");

  const [isOpen, setIsOpen] = React.useState(false);
  const [isWorking, setIsWorking] = React.useState(false);
  const [preview, setPreview] = React.useState<PreviewState | null>(null);
  const [error, setError] = React.useState<string | null>(null);

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
    return reflowSchedule(base, anchorId, start, {
      respectLocks: true,
      respectConstraints: true,
      checkResourceConflicts: true,
      detectCycles: true,
    });
  }

  function runPreviewSingle() {
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
      const next = result.activities;
      const changes = buildChanges(activities, next);
      setPreview({
        next,
        changes,
        impactReport: result.impact_report ?? null,
        raw: result,
        anchors: [{ activityId: selectedId, newStart }],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsWorking(false);
    }
  }

  function runPreviewBulk() {
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
        nextActivities = result.activities;
        lastRaw = result;
      }

      const changes = buildChanges(activities, nextActivities);
      setPreview({
        next: nextActivities,
        changes,
        impactReport:
          typeof lastRaw === "object" &&
          lastRaw !== null &&
          "impact_report" in lastRaw
            ? (lastRaw as { impact_report: ImpactReport }).impact_report
            : null,
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
    onApplyActivities(preview.next, preview.impactReport);
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
    <div className={`rounded-xl border border-accent/15 bg-glass p-3 ${className ?? ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-foreground/90">
          <span className="font-semibold">AGI Schedule Updater</span>
          <span className="ml-2 text-xs text-muted-foreground">(Ctrl/⌘+K 검색 포커스)</span>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className={`rounded-lg border px-3 py-1.5 text-xs ${
              mode === "single"
                ? "border-cyan-400/30 bg-cyan-500/20 text-cyan-100"
                : "border-accent/20 bg-background/50 text-muted-foreground hover:bg-accent/10"
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
            className={`rounded-lg border px-3 py-1.5 text-xs ${
              mode === "bulk"
                ? "border-cyan-400/30 bg-cyan-500/20 text-cyan-100"
                : "border-accent/20 bg-background/50 text-muted-foreground hover:bg-white/10"
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                className="w-full rounded-lg border border-accent/20 bg-background/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
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
                <div className="absolute z-50 mt-2 max-h-72 w-full overflow-auto rounded-lg border border-accent/20 bg-background/95 shadow-lg backdrop-blur">
                  {suggestions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm text-foreground/90 hover:bg-accent/10"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setSelectedId(s.id);
                        setQuery(s.label);
                        setIsOpen(false);
                        onFocusActivity?.(s.id);

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
                <div className="mt-2 text-xs text-muted-foreground">
                  선택: <span className="text-foreground/90">{getId(selected)}</span>
                  {getName(selected) ? <span className="text-muted-foreground"> — {getName(selected)}</span> : null}
                  {getStart(selected) ? <span className="ml-2">현재 시작: {getStart(selected)}</span> : null}
                  {getEnd(selected) ? <span className="ml-2">현재 종료: {getEnd(selected)}</span> : null}
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <input
                className="w-40 rounded-lg border border-accent/20 bg-background/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                placeholder="YYYY-MM-DD"
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
              />

              <button
                type="button"
                className="rounded-lg border border-cyan-400/30 bg-cyan-500/20 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-500/30 disabled:opacity-50"
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
              className="min-h-[120px] w-full rounded-lg border border-accent/20 bg-background/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
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
                className="rounded-lg border border-cyan-400/30 bg-cyan-500/20 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-500/30 disabled:opacity-50"
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
                className="rounded-lg border border-accent/20 bg-background/50 px-3 py-2 text-sm text-foreground/80 hover:bg-accent/10"
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
          <div className="rounded-lg border border-accent/20 bg-background/10 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm text-foreground/90">
                영향 작업: <span className="font-semibold">{preview.changes.length}</span>개
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-accent/20 bg-background/50 px-3 py-2 text-sm text-foreground/90 hover:bg-accent/10"
                  onClick={exportPatch}
                >
                  Patch JSON
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-accent/20 bg-background/50 px-3 py-2 text-sm text-foreground/90 hover:bg-accent/10"
                  onClick={exportFull}
                >
                  Full JSON
                </button>

                <button
                  type="button"
                  className="rounded-lg border border-emerald-400/30 bg-emerald-500/20 px-3 py-2 text-sm text-emerald-50 hover:bg-emerald-500/30"
                  onClick={applyPreview}
                >
                  적용(Apply)
                </button>

                <button
                  type="button"
                  className="rounded-lg border border-accent/20 bg-background/50 px-3 py-2 text-sm text-foreground/90 hover:bg-accent/10"
                  onClick={() => setPreview(null)}
                >
                  닫기
                </button>
              </div>
            </div>

            <div className="mt-2 max-h-56 overflow-auto">
              <table className="w-full text-xs text-foreground/80">
                <thead className="sticky top-0 bg-background/90">
                  <tr>
                    <th className="py-2 pr-2 text-left">ID</th>
                    <th className="py-2 pr-2 text-left">작업</th>
                    <th className="py-2 pr-2 text-left">시작</th>
                    <th className="py-2 pr-2 text-left">종료</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.changes.slice(0, 200).map((c) => (
                    <tr key={c.id} className="border-t border-accent/5">
                      <td className="py-2 pr-2 font-mono">{c.id}</td>
                      <td className="py-2 pr-2">{c.name}</td>
                      <td className="py-2 pr-2">
                        <span className="text-muted-foreground">{c.beforeStart ?? "-"}</span>{" "}
                        <span className="text-cyan-200">{c.afterStart ?? "-"}</span>
                      </td>
                      <td className="py-2 pr-2">
                        <span className="text-muted-foreground">{c.beforeEnd ?? "-"}</span>{" "}
                        <span className="text-cyan-200">{c.afterEnd ?? "-"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {preview.changes.length > 200 ? (
                <div className="mt-2 text-xs text-muted-foreground">
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
