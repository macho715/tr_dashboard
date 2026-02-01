"use client";

import * as React from "react";
import type { PreviewResult } from "@/lib/ops/agi/types";
import { AgiDiffTable } from "./AgiDiffTable";
import { AgiConflictsPanel } from "./AgiConflictsPanel";

export function AgiPreviewDrawer(props: {
  open: boolean;
  onClose: () => void;
  preview: PreviewResult | null;
  onApply: () => void;
  onExportPatch: () => void;
  onExportFull: () => void;
}) {
  const { open, preview } = props;
  if (!open || !preview) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40">
      <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] rounded-t-xl bg-background p-4 shadow-lg">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold">
            Preview — changes {preview.changes.length}, conflicts {preview.conflicts.length}
          </div>
          <button className="rounded-md border px-3 py-1 text-sm" onClick={props.onClose}>
            Close
          </button>
        </div>

        <div className="mt-3 space-y-3">
          <AgiConflictsPanel conflicts={preview.conflicts} />
          <AgiDiffTable changes={preview.changes} />

          <div className="flex flex-wrap gap-2">
            <button className="rounded-md border px-3 py-2 text-sm" onClick={props.onExportPatch}>
              Export Patch
            </button>
            <button className="rounded-md border px-3 py-2 text-sm" onClick={props.onExportFull}>
              Export Full
            </button>
            <button className="rounded-md bg-emerald-600 px-3 py-2 text-sm text-white" onClick={props.onApply}>
              Apply
            </button>
          </div>

          <div className="text-xs opacity-60">
            기본 정책: Preview → Apply 분리. locked는 includeLocked=true일 때만 적용.
          </div>
        </div>
      </div>
    </div>
  );
}
