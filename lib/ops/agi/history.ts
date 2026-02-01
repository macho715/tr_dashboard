// lib/ops/agi/history.ts
import type { ScheduleActivity } from "@/lib/ssot/schedule";

const KEY = "agi_ops_recent_commands_v1";

export type HistoryState = {
  past: ScheduleActivity[][];
  future: ScheduleActivity[][];
};

export function initHistory(): HistoryState {
  return { past: [], future: [] };
}

export function pushPast(h: HistoryState, snapshot: ScheduleActivity[]): HistoryState {
  const nextPast = [...h.past, snapshot].slice(-20); // 20단계
  return { past: nextPast, future: [] };
}

export function undo(h: HistoryState, current: ScheduleActivity[]): { h: HistoryState; next?: ScheduleActivity[] } {
  if (h.past.length === 0) return { h };
  const prev = h.past[h.past.length - 1];
  const nextPast = h.past.slice(0, -1);
  const nextFuture = [current, ...h.future].slice(0, 20);
  return { h: { past: nextPast, future: nextFuture }, next: prev };
}

export function redo(h: HistoryState, current: ScheduleActivity[]): { h: HistoryState; next?: ScheduleActivity[] } {
  if (h.future.length === 0) return { h };
  const next = h.future[0];
  const nextFuture = h.future.slice(1);
  const nextPast = [...h.past, current].slice(-20);
  return { h: { past: nextPast, future: nextFuture }, next };
}

export function saveRecentCommand(cmd: string) {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    const next = [cmd, ...arr.filter((x) => x !== cmd)].slice(0, 10);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function loadRecentCommands(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}
