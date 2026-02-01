// lib/ops/agi/parseCommand.ts
import type { AgiCommand, IsoDate } from "./types";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function asIsoDate(v: string): IsoDate {
  if (!ISO_DATE_RE.test(v)) throw new Error(`날짜 형식 오류: ${v} (YYYY-MM-DD)`);
  return v as IsoDate;
}

function parseKV(tokens: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const t of tokens) {
    const idx = t.indexOf("=");
    if (idx <= 0) continue;
    const k = t.slice(0, idx).trim();
    const v = t.slice(idx + 1).trim().replace(/^"|"$/g, "");
    out[k] = v;
  }
  return out;
}

function parseBool(v: string | undefined, defaultValue: boolean): boolean {
  if (v === undefined) return defaultValue;
  return v === "true";
}

function parseNum(v: string | undefined): number | undefined {
  if (v === undefined) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

function parseBulkAnchors(text: string): Array<{ activityId: string; newStart: IsoDate }> {
  // format:
  // ACT-001 2026-02-15
  // ACT-002=2026-02-18
  // # comment
  const lines = text.split(/\r?\n/);
  const anchors: Array<{ activityId: string; newStart: IsoDate }> = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw || raw.startsWith("#")) continue;

    const normalized = raw.replace("=", " ");
    const parts = normalized.split(/\s+/).filter(Boolean);
    if (parts.length < 2) throw new Error(`BULK 파싱 실패 (${i + 1}행): ${raw}`);

    anchors.push({ activityId: parts[0], newStart: asIsoDate(parts[1]) });
  }
  return anchors;
}

export function parseAgiCommand(input: string): AgiCommand {
  const v = input.trim();
  if (!v) return { kind: "FOCUS", query: "" };

  // 기본 검색
  if (!v.startsWith("/")) return { kind: "FOCUS", query: v };

  const [cmd, ...rest] = v.slice(1).split(/\s+/);
  const lower = cmd.toLowerCase();
  const args = parseKV(rest);

  if (lower === "shift") {
    const pivot = args.pivot ?? args.pivotDate;
    if (!pivot) throw new Error("shift requires pivot=YYYY-MM-DD");

    const delta = args.delta ?? args.deltaDays;
    const newDate = args.new ?? args.newDate;

    return {
      kind: "SHIFT",
      pivot: asIsoDate(pivot),
      deltaDays: parseNum(delta),
      newDate: newDate ? asIsoDate(newDate) : undefined,
      includeLocked: parseBool(args.includeLocked, false),
      previewOnly: parseBool(args.previewOnly, false),
    };
  }

  if (lower === "bulk") {
    // 사용: /bulk includeLocked=true previewOnly=true <enter>
    // 이후 UI에서 textarea로 입력받는 방식도 지원 (AgiOpsDock에서)
    const includeLocked = parseBool(args.includeLocked, false);
    const previewOnly = parseBool(args.previewOnly, false);
    const rawText = args.text ?? ""; // optional
    const anchors = rawText ? parseBulkAnchors(rawText) : [];
    return { kind: "BULK", anchors, includeLocked, previewOnly };
  }

  if (lower === "conflicts") return { kind: "CONFLICTS" };

  if (lower === "export") {
    const mode = (args.mode ?? "patch") as "patch" | "full";
    if (mode !== "patch" && mode !== "full") throw new Error("export mode must be patch|full");
    return { kind: "EXPORT", mode };
  }

  if (lower === "undo") return { kind: "UNDO" };
  if (lower === "redo") return { kind: "REDO" };
  if (lower === "reset") return { kind: "RESET" };

  // fallback: 검색
  return { kind: "FOCUS", query: v };
}

export function parseBulkText(text: string): Array<{ activityId: string; newStart: IsoDate }> {
  return parseBulkAnchors(text);
}
