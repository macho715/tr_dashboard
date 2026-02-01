// lib/ops/agi-schedule/types.ts

export type IsoDate = `${number}-${number}-${number}`;

export type OpsCommand =
  | {
      kind: "SHIFT";
      pivotDate: IsoDate;
      newDate?: IsoDate;
      deltaDays?: number;
      includeLocked?: boolean;
      previewOnly?: boolean;
    }
  | { kind: "NOTICE"; date: IsoDate; text?: string; clear?: boolean }
  | {
      kind: "WEATHER_REFRESH";
      mode?: "AUTO" | "MANUAL";
      offshoreText?: string;
    }
  | { kind: "PIPELINE_CHECK"; autoFix?: boolean }
  | {
      kind: "GO_NO_GO";
      waveFt: number;
      windKt: number;
      hsLimitM?: number;
      windLimitKt?: number;
      sailingTimeHr?: number;
    }
  | { kind: "FOCUS_ACTIVITY"; query: string }
  | { kind: "UNDO" }
  | { kind: "REDO" }
  | { kind: "EXPORT" }
  | { kind: "IMPORT"; json: string };

export type GoNoGoGate = "GO" | "NO-GO" | "CONDITIONAL";

export interface GoNoGoResult {
  gate: GoNoGoGate;
  inputs: {
    waveFt: number;
    windKt: number;
    hsM: number;
    hsLimitM: number;
    windLimitKt: number;
    sailingTimeHr?: number;
  };
  reasons: string[];
}

export interface OpsNotice {
  date: IsoDate;
  text: string;
}

export interface WeatherDay {
  date: IsoDate;
  summary: string;
  tempMaxC?: number;
  tempMinC?: number;
  windMaxKt?: number;
  waveMaxFt?: number;
}

export interface WeatherMarineRisk {
  lastUpdated: string;
  locationLabel: string;
  days: WeatherDay[];
  offshoreSummary?: string;
}

export interface PipelineCheckItem {
  id: string;
  title: string;
  status: "PASS" | "WARN" | "FAIL";
  detail?: string;
}

export interface OpsState {
  notice: OpsNotice;
  weather: WeatherMarineRisk;
  goNoGo?: GoNoGoResult;
  pipeline: PipelineCheckItem[];
}

export interface OpsAuditEntry {
  ts: string;
  command: string;
  summary: string;
}
