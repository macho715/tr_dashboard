"use client";

import * as React from "react";
import type { ChangeRow } from "@/lib/ops/agi/types";

export function AgiDiffTable(props: { changes: ChangeRow[] }) {
  const { changes } = props;

  return (
    <div className="max-h-64 overflow-auto rounded-md border">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-background">
          <tr className="border-b">
            <th className="p-2 text-left">activity_id</th>
            <th className="p-2 text-left">name</th>
            <th className="p-2 text-left">start</th>
            <th className="p-2 text-left">finish</th>
            <th className="p-2 text-left">locked</th>
          </tr>
        </thead>
        <tbody>
          {changes.slice(0, 300).map((c) => (
            <tr key={c.activityId} className="border-b">
              <td className="p-2 font-mono">{c.activityId}</td>
              <td className="p-2">{c.name}</td>
              <td className="p-2">
                <span className="opacity-60">{c.beforeStart}</span> → <span className="font-medium">{c.afterStart}</span>
              </td>
              <td className="p-2">
                <span className="opacity-60">{c.beforeFinish}</span> →{" "}
                <span className="font-medium">{c.afterFinish}</span>
              </td>
              <td className="p-2">{c.isLocked ? "true" : "false"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {changes.length > 300 ? (
        <div className="p-2 text-xs opacity-60">표시는 300개까지만 (전체 {changes.length})</div>
      ) : null}
    </div>
  );
}
