"use client";

import * as React from "react";
import type { ScheduleConflict } from "@/lib/ssot/schedule";

export function AgiConflictsPanel(props: { conflicts: ScheduleConflict[] }) {
  const { conflicts } = props;

  if (conflicts.length === 0) {
    return <div className="text-sm opacity-70">conflict: 0</div>;
  }

  return (
    <div className="rounded-md border p-3">
      <div className="text-sm font-medium">Resource Conflicts: {conflicts.length}</div>
      <div className="mt-2 max-h-48 overflow-auto text-xs">
        <pre className="whitespace-pre-wrap">{JSON.stringify(conflicts.slice(0, 50), null, 2)}</pre>
      </div>
      {conflicts.length > 50 ? <div className="mt-2 text-xs opacity-60">표시는 50개까지만</div> : null}
    </div>
  );
}
