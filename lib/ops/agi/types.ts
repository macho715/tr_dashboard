// lib/ops/agi/types.ts
import type { ScheduleActivity } from "@/lib/ssot/schedule";
import type { ScheduleConflict } from "@/lib/ssot/schedule";

export type IsoDate = `${number}-${number}-${number}`;

export type CommandKind =
  | "SHIFT"
  | "BULK"
  | "CONFLICTS"
  | "EXPORT"
  | "UNDO"
  | "REDO"
  | "RESET"
  | "FOCUS";

export type ExportMode = "patch" | "full";

export type AgiCommand =
  | {
      kind: "SHIFT";
      pivot: IsoDate;
      deltaDays?: number; // delta=+N/-N
      newDate?: IsoDate; // new=YYYY-MM-DD -> deltaDays 자동 산출
      includeLocked?: boolean;
      previewOnly?: boolean;
    }
  | {
      kind: "BULK";
      includeLocked?: boolean;
      previewOnly?: boolean;
      // anchors: [{activityId, newStart}]
      anchors: Array<{ activityId: string; newStart: IsoDate }>;
    }
  | { kind: "CONFLICTS" }
  | { kind: "EXPORT"; mode: ExportMode }
  | { kind: "UNDO" }
  | { kind: "REDO" }
  | { kind: "RESET" }
  | { kind: "FOCUS"; query: string };

export type ChangeRow = {
  activityId: string;
  name: string;
  beforeStart: string;
  afterStart: string;
  beforeFinish: string;
  afterFinish: string;
  voyageId?: string;
  milestoneId?: string;
  isLocked?: boolean;
};

export type PreviewResult = {
  nextActivities: ScheduleActivity[];
  changes: ChangeRow[];
  conflicts: ScheduleConflict[];
  meta: {
    mode: "shift" | "bulk";
    anchors: Array<{ activityId?: string; pivot?: IsoDate; newStart?: IsoDate; deltaDays?: number }>;
  };
};
