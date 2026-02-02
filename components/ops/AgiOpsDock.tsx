"use client";

import * as React from "react";
import type { ScheduleActivity } from "@/lib/ssot/schedule";
import { useViewModeOptional } from "@/src/lib/stores/view-mode-store";
import { detectResourceConflicts } from "@/lib/utils/detect-resource-conflicts";

import type { AgiCommand, PreviewResult } from "@/lib/ops/agi/types";
import { buildChanges } from "@/lib/ops/agi/adapters";
import { applyBulkAnchors, computeDeltaByNewDate, shiftAfterPivot } from "@/lib/ops/agi/applyShift";
import { makeFullJSON, makePatchJSON, downloadJSON } from "@/lib/ops/agi/exporters";
import { initHistory, pushPast, undo, redo, type HistoryState } from "@/lib/ops/agi/history";
import { parseBulkText } from "@/lib/ops/agi/parseCommand";

import { AgiCommandBar } from "./AgiCommandBar";
import { AgiPreviewDrawer } from "./AgiPreviewDrawer";

function byIdMap(list: ScheduleActivity[]) {
  const m = new Map<string, ScheduleActivity>();
  for (const a of list) m.set(a.activity_id ?? "", a);
  return m;
}

export function AgiOpsDock(props: {
  activities: ScheduleActivity[];
  setActivities: (next: ScheduleActivity[]) => void;
  projectEndDate?: string;
  onFocusQuery?: (query: string) => void;
}) {
  const viewMode = useViewModeOptional();
  const canApplyReflow = viewMode?.canApplyReflow ?? true;
  const [preview, setPreview] = React.useState<PreviewResult | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [bulkText, setBulkText] = React.useState(""); // /bulk 입력용
  const [history, setHistory] = React.useState<HistoryState>(() => initHistory());
  const [lastFocusQuery, setLastFocusQuery] = React.useState("");

  const onFocusQuery = (q: string) => {
    setLastFocusQuery(q);
    props.onFocusQuery?.(q);
  };

  const buildPreview = (before: ScheduleActivity[], next: ScheduleActivity[], meta: PreviewResult["meta"]): PreviewResult => {
    const changes = buildChanges(before, next);
    const conflicts = detectResourceConflicts(next);
    return { nextActivities: next, changes, conflicts, meta };
  };

  const openPreview = (p: PreviewResult) => {
    setPreview(p);
    setDrawerOpen(true);
  };

  const execute = (cmd: AgiCommand, raw: string) => {
    if (cmd.kind === "CONFLICTS") {
      const conflicts = detectResourceConflicts(props.activities);
      const p = buildPreview(props.activities, props.activities, {
        mode: "shift",
        anchors: [{ pivot: props.activities[0]?.planned_start as any }],
      });
      openPreview({ ...p, conflicts });
      return;
    }

    if (cmd.kind === "RESET") {
      setPreview(null);
      setDrawerOpen(false);
      setHistory(initHistory());
      return;
    }

    if (cmd.kind === "UNDO") {
      const r = undo(history, props.activities);
      setHistory(r.h);
      if (r.next) props.setActivities(r.next);
      return;
    }

    if (cmd.kind === "REDO") {
      const r = redo(history, props.activities);
      setHistory(r.h);
      if (r.next) props.setActivities(r.next);
      return;
    }

    if (cmd.kind === "EXPORT") {
      if (!preview) return;
      const afterMap = byIdMap(preview.nextActivities);
      if (cmd.mode === "patch") {
        downloadJSON("schedule_patch.json", makePatchJSON({ changes: preview.changes, afterById: afterMap }));
      } else {
        downloadJSON("schedule_full.json", makeFullJSON(preview.nextActivities));
      }
      return;
    }

    if (cmd.kind === "SHIFT") {
      const includeLocked = cmd.includeLocked ?? false;
      const deltaDays =
        cmd.deltaDays ??
        (cmd.newDate ? computeDeltaByNewDate(cmd.pivot, cmd.newDate) : 0);

      const next = shiftAfterPivot({
        activities: props.activities,
        pivot: cmd.pivot,
        deltaDays,
        includeLocked,
      });

      const p = buildPreview(props.activities, next, {
        mode: "shift",
        anchors: [{ pivot: cmd.pivot, deltaDays }],
      });

      openPreview(p);

      if (cmd.previewOnly) return;
      return;
    }

    if (cmd.kind === "BULK") {
      const anchors =
        cmd.anchors.length > 0 ? cmd.anchors : parseBulkText(bulkText);

      const includeLocked = cmd.includeLocked ?? false;

      const next = applyBulkAnchors({
        activities: props.activities,
        anchors,
        includeLocked,
      });

      const p = buildPreview(props.activities, next, {
        mode: "bulk",
        anchors: anchors.map((a) => ({ activityId: a.activityId, newStart: a.newStart })),
      });

      openPreview(p);

      if (cmd.previewOnly) return;
      return;
    }
  };

  const applyPreview = () => {
    if (!preview) return;

    setHistory((h) => pushPast(h, props.activities));
    props.setActivities(preview.nextActivities);

    setDrawerOpen(false);
  };

  const exportPatch = () => {
    if (!preview) return;
    const afterMap = byIdMap(preview.nextActivities);
    downloadJSON("schedule_patch.json", makePatchJSON({ changes: preview.changes, afterById: afterMap }));
  };

  const exportFull = () => {
    if (!preview) return;
    downloadJSON("schedule_full.json", makeFullJSON(preview.nextActivities));
  };

  return (
    <div className="space-y-3">
      <AgiCommandBar
        onExecute={(cmd, raw) => execute(cmd, raw)}
        onFocusQuery={onFocusQuery}
      />

      {/* Bulk 텍스트 입력(간단조작용) */}
      <div className="rounded-md border p-3">
        <div className="text-sm font-medium">Bulk Anchors (for /bulk)</div>
        <div className="mt-1 text-xs opacity-60">
          형식: <code>ACTIVITY_ID YYYY-MM-DD</code> 또는 <code>ACTIVITY_ID=YYYY-MM-DD</code>
        </div>
        <textarea
          className="mt-2 w-full rounded-md border p-2 text-sm"
          rows={4}
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          placeholder={`예)
ACT-001 2026-02-15
ACT-023=2026-02-18`}
        />
        <div className="mt-2 flex gap-2">
          <button
            className="rounded-md border px-3 py-2 text-sm"
            onClick={() => execute({ kind: "BULK", anchors: [], previewOnly: true }, "/bulk")}
          >
            Bulk Preview
          </button>
          <button
            className="rounded-md border px-3 py-2 text-sm"
            onClick={() => execute({ kind: "BULK", anchors: [], previewOnly: false }, "/bulk")}
          >
            Bulk (preview + apply via drawer)
          </button>
        </div>
      </div>

      {/* Preview Drawer */}
      <AgiPreviewDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        preview={preview}
        onApply={applyPreview}
        onExportPatch={exportPatch}
        onExportFull={exportFull}
        canApply={canApplyReflow}
      />

      {lastFocusQuery ? (
        <div className="text-xs opacity-60">
          search query: <span className="font-mono">{lastFocusQuery}</span>
        </div>
      ) : null}
    </div>
  );
}
