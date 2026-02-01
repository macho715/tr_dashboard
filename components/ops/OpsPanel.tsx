"use client";

import * as React from "react";
import type { OpsState } from "@/lib/ops/agi-schedule/types";

export function OpsPanel(props: { ops: OpsState }) {
  const { ops } = props;

  return (
    <div className="space-y-4">
      <section className="rounded-md border border-accent/20 p-3">
        <div className="font-medium">Operational Notice</div>
        <div className="text-sm text-muted-foreground">Date: {ops.notice.date}</div>
        <pre className="mt-2 whitespace-pre-wrap text-sm">{ops.notice.text || "(empty)"}</pre>
      </section>

      <section className="rounded-md border border-accent/20 p-3">
        <div className="font-medium">Weather &amp; Marine Risk</div>
        <div className="text-sm text-muted-foreground">
          Last Updated: {ops.weather.lastUpdated} · Location: {ops.weather.locationLabel}
        </div>

        <div className="mt-2 overflow-auto">
          <table className="min-w-[520px] text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-1 text-left">Date</th>
                <th className="py-1 text-left">Summary</th>
                <th className="py-1 text-left">Wind (kt)</th>
                <th className="py-1 text-left">Wave (ft)</th>
              </tr>
            </thead>
            <tbody>
              {ops.weather.days.map((d) => (
                <tr key={d.date} className="border-b">
                  <td className="py-1 pr-3">{d.date}</td>
                  <td className="py-1 pr-3">{d.summary}</td>
                  <td className="py-1 pr-3">{d.windMaxKt ?? "-"}</td>
                  <td className="py-1 pr-3">{d.waveMaxFt ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {ops.weather.offshoreSummary ? (
          <div className="mt-2 text-sm">
            <div className="font-medium">Offshore</div>
            <pre className="whitespace-pre-wrap">{ops.weather.offshoreSummary}</pre>
          </div>
        ) : null}
      </section>

      {ops.goNoGo ? (
        <section className="rounded-md border border-accent/20 p-3">
          <div className="font-medium">Weather Go / No-Go</div>
          <div className="text-sm">
            Gate: <b>{ops.goNoGo.gate}</b>
          </div>
          <ul className="mt-2 list-disc pl-5 text-sm">
            {ops.goNoGo.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-md border border-accent/20 p-3">
        <div className="font-medium">Pipeline Check</div>
        <div className="mt-2 space-y-2">
          {ops.pipeline.map((it) => (
            <div key={it.id} className="rounded border border-accent/20 p-2 text-sm">
              <div className="flex items-center justify-between">
                <div className="font-medium">{it.title}</div>
                <div>{it.status}</div>
              </div>
              {it.detail ? <div className="text-muted-foreground">{it.detail}</div> : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
