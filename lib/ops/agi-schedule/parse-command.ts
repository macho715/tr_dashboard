// lib/ops/agi-schedule/parse-command.ts
import type { IsoDate, OpsCommand } from "./types";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function asIsoDate(v: string): IsoDate {
  if (!ISO_DATE_RE.test(v)) throw new Error(`Invalid date: ${v}`);
  return v as IsoDate;
}

function parseKeyValueArgs(tokens: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const t of tokens) {
    const idx = t.indexOf("=");
    if (idx <= 0) continue;
    const k = t.slice(0, idx).trim();
    const v = t.slice(idx + 1).trim();
    out[k] = v.replace(/^"|"$/g, "");
  }
  return out;
}

export function parseOpsCommand(inputRaw: string): OpsCommand {
  const input = inputRaw.trim();
  if (!input) return { kind: "FOCUS_ACTIVITY", query: "" };

  if (input.startsWith("/")) {
    const [cmd, ...rest] = input.slice(1).split(/\s+/);
    const args = parseKeyValueArgs(rest);

    switch (cmd.toLowerCase()) {
      case "shift": {
        const pivot = args.pivot ?? args.pivotDate;
        const delta = args.delta ?? args.deltaDays;
        const newDate = args.new ?? args.newDate;

        if (!pivot) throw new Error("shift requires pivot=YYYY-MM-DD");
        const pivotDate = asIsoDate(pivot);

        const includeLocked =
          args.includeLocked === undefined ? false : args.includeLocked === "true";
        const previewOnly =
          args.previewOnly === undefined ? false : args.previewOnly === "true";

        return {
          kind: "SHIFT",
          pivotDate,
          newDate: newDate ? asIsoDate(newDate) : undefined,
          deltaDays: delta ? Number(delta) : undefined,
          includeLocked,
          previewOnly,
        };
      }

      case "notice": {
        const dateRaw = args.date ?? "today";
        const date =
          dateRaw === "today"
            ? (new Date().toISOString().slice(0, 10) as IsoDate)
            : asIsoDate(dateRaw);

        const clear = args.clear === "true";
        const text = args.text ?? "";
        return { kind: "NOTICE", date, text, clear };
      }

      case "weather":
        if ((rest[0] ?? "").toLowerCase() === "refresh" || args.refresh === "true") {
          return {
            kind: "WEATHER_REFRESH",
            mode: (args.mode as "AUTO" | "MANUAL" | undefined) ?? "AUTO",
            offshoreText: args.offshore,
          };
        }
        return { kind: "WEATHER_REFRESH", mode: "AUTO" };

      case "pipeline":
        return {
          kind: "PIPELINE_CHECK",
          autoFix: args.autoFix === "true",
        };

      case "gonogo":
      case "go-nogo":
      case "weather-go-nogo": {
        const waveFt = Number(args.wave_ft ?? args.waveFt);
        const windKt = Number(args.wind_kt ?? args.windKt);
        if (!Number.isFinite(waveFt) || !Number.isFinite(windKt)) {
          throw new Error("gonogo requires wave_ft and wind_kt");
        }
        const hsLimitM = args.hs_limit_m ? Number(args.hs_limit_m) : undefined;
        const windLimitKt = args.wind_limit_kt ? Number(args.wind_limit_kt) : undefined;
        const sailingTimeHr = args.sailingTime_hr ? Number(args.sailingTime_hr) : undefined;

        return {
          kind: "GO_NO_GO",
          waveFt,
          windKt,
          hsLimitM,
          windLimitKt,
          sailingTimeHr,
        };
      }

      case "undo":
        return { kind: "UNDO" };
      case "redo":
        return { kind: "REDO" };
      case "export":
        return { kind: "EXPORT" };
      default:
        return { kind: "FOCUS_ACTIVITY", query: input };
    }
  }

  return { kind: "FOCUS_ACTIVITY", query: input };
}
