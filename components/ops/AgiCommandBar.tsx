"use client";

import * as React from "react";
import { loadRecentCommands, saveRecentCommand } from "@/lib/ops/agi/history";
import type { AgiCommand } from "@/lib/ops/agi/types";
import { parseAgiCommand } from "@/lib/ops/agi/parseCommand";

export function AgiCommandBar(props: {
  onExecute: (cmd: AgiCommand, raw: string) => void;
  onFocusQuery: (q: string) => void; // 검색 모드(기본 입력)
}) {
  const [value, setValue] = React.useState("");
  const [recent, setRecent] = React.useState<string[]>([]);
  const ref = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setRecent(loadRecentCommands());
  }, []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submit = (raw: string) => {
    const cmd = parseAgiCommand(raw);
    if (cmd.kind === "FOCUS") {
      props.onFocusQuery(cmd.query);
      return;
    }
    saveRecentCommand(raw);
    setRecent(loadRecentCommands());
    props.onExecute(cmd, raw);
  };

  return (
    <div className="rounded-md border p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          ref={ref}
          className="w-full rounded-md border px-3 py-2 text-sm"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder='검색 또는 명령. 예) "loadout" /shift pivot=2026-02-01 delta=+3 /conflicts'
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit(value.trim());
              setValue("");
            }
          }}
        />
        <button
          className="rounded-md border px-3 py-2 text-sm"
          onClick={() => {
            submit(value.trim());
            setValue("");
          }}
        >
          Run
        </button>
      </div>

      <div className="mt-2 text-xs opacity-60">
        Ctrl/⌘+K 포커스 · /shift /bulk /conflicts /export mode=patch|full /undo /redo /reset
      </div>

      {recent.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {recent.map((r) => (
            <button
              key={r}
              className="rounded-md border px-2 py-1 text-xs"
              onClick={() => submit(r)}
              title="최근 명령 재실행"
            >
              {r}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
