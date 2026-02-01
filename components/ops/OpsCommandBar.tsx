"use client";

import * as React from "react";
import type { OpsCommand } from "@/lib/ops/agi-schedule/types";
import { parseOpsCommand } from "@/lib/ops/agi-schedule/parse-command";

export function OpsCommandBar(props: {
  onExecute: (cmd: OpsCommand) => void;
  onFocusActivity?: (query: string) => void;
  placeholder?: string;
}) {
  const [value, setValue] = React.useState("");

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;

    try {
      const cmd = parseOpsCommand(value);
      if (cmd.kind === "FOCUS_ACTIVITY") {
        props.onFocusActivity?.(cmd.query);
        setValue("");
        return;
      }
      props.onExecute(cmd);
      setValue("");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="w-full rounded-md border border-accent/20 px-3 py-2">
      <input
        className="w-full bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={
          props.placeholder ??
          "Type /shift, /notice, /weather refresh, /pipeline check, /gonogo ..."
        }
      />
      <div className="mt-2 text-xs text-muted-foreground">
        예) <code>/shift pivot=2026-02-01 delta=+3</code> · <code>/weather refresh</code> ·{" "}
        <code>/pipeline check autoFix=true</code>
      </div>
    </div>
  );
}
