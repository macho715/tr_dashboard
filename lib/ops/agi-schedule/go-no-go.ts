// lib/ops/agi-schedule/go-no-go.ts
import type { GoNoGoResult } from "./types";

const FT_TO_M = 0.3048;

export function evaluateGoNoGo(input: {
  waveFt: number;
  windKt: number;
  hsLimitM?: number;
  windLimitKt?: number;
  sailingTimeHr?: number;
}): GoNoGoResult {
  const hsM = input.waveFt * FT_TO_M;

  const hsLimitM = input.hsLimitM ?? 1.5;
  const windLimitKt = input.windLimitKt ?? 20;

  const reasons: string[] = [];

  const hsRatio = hsM / hsLimitM;
  const windRatio = input.windKt / windLimitKt;

  const nearLimit = hsRatio >= 0.85 || windRatio >= 0.85;
  const overLimit = hsRatio > 1 || windRatio > 1;

  if (overLimit) {
    if (hsRatio > 1) reasons.push(`Wave too high: Hs=${hsM.toFixed(2)}m > ${hsLimitM}m`);
    if (windRatio > 1) reasons.push(`Wind too high: ${input.windKt}kt > ${windLimitKt}kt`);
    return {
      gate: "NO-GO",
      inputs: {
        waveFt: input.waveFt,
        windKt: input.windKt,
        hsM,
        hsLimitM,
        windLimitKt,
        sailingTimeHr: input.sailingTimeHr,
      },
      reasons,
    };
  }

  if (nearLimit) {
    reasons.push("Close to limit — proceed with additional controls / reduced window.");
    return {
      gate: "CONDITIONAL",
      inputs: {
        waveFt: input.waveFt,
        windKt: input.windKt,
        hsM,
        hsLimitM,
        windLimitKt,
        sailingTimeHr: input.sailingTimeHr,
      },
      reasons,
    };
  }

  reasons.push("Within limits.");
  return {
    gate: "GO",
    inputs: {
      waveFt: input.waveFt,
      windKt: input.windKt,
      hsM,
      hsLimitM,
      windLimitKt,
      sailingTimeHr: input.sailingTimeHr,
    },
    reasons,
  };
}
