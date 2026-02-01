"use client"

import type { TideRow } from "@/lib/data/tide-data"

interface TideTableProps {
  voyageNum: number
  rows: TideRow[]
  className?: string
}

export function TideTable({ voyageNum, rows, className }: TideTableProps) {
  if (rows.length === 0) return null

  return (
    <div className={className}>
      <table className="tide-table w-full border-collapse text-[9px] font-mono">
        <thead>
          <tr>
            <th className="rounded-tl-md bg-cyan-500/10 px-2 py-1.5 text-center font-semibold uppercase text-cyan-400">
              TIME
            </th>
            <th className="rounded-tr-md bg-cyan-500/10 px-2 py-1.5 text-center font-semibold uppercase text-cyan-400">
              HEIGHT
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${voyageNum}-${i}`} className="border-b border-accent/5">
              <td className="px-2 py-1.5 text-center text-slate-400">{r.time}</td>
              <td className="px-2 py-1.5 text-center text-slate-400">
                {r.height.toFixed(2)}m
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
