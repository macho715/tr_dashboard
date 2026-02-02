/**
 * TypeScript types for TR Dashboard SSOT (Contract v0.8.0)
 * 
 * Source: option_c.json Contract v0.8.0
 * Generated from: patch4.md specification
 */

// ============================================================================
// Core Enums (lowercase per Contract v0.8.0)
// ============================================================================

export type ActivityState =
  | 'draft'
  | 'planned'
  | 'ready'
  | 'in_progress'
  | 'paused'
  | 'blocked'
  | 'completed'
  | 'done'  // patchm1 alias for completed
  | 'canceled'
  | 'cancelled'  // patchm1 spelling
  | 'aborted';

/** patchm1 §3.2: Blocker taxonomy */
export type BlockerCode =
  | 'none'
  | 'PTW_MISSING'
  | 'CERT_MISSING'
  | 'WX_NO_WINDOW'
  | 'LINKSPAN_LIMIT'
  | 'BARGE_LIMIT'
  | 'RESOURCE_CONFLICT'
  | 'MANUAL_HOLD';

export type LockLevel = 
  | 'none'
  | 'soft'
  | 'hard'
  | 'baseline';

export type DependencyType = 
  | 'fs'  // Finish-to-Start
  | 'ss'  // Start-to-Start
  | 'ff'  // Finish-to-Finish
  | 'sf'; // Start-to-Finish

export type ConstraintHardness = 
  | 'hard'
  | 'soft';

export type EvidenceStage = 
  | 'before_ready'
  | 'before_start'
  | 'during'
  | 'after_end';

export type CollisionSeverity = 
  | 'info'
  | 'warning'
  | 'blocking';

export type CollisionStatus = 
  | 'open'
  | 'resolved'
  | 'ignored';

export type ReflowMode = 
  | 'preview'
  | 'apply';

export type DurationMode = 
  | 'work'     // Work hours only (calendar-based)
  | 'elapsed'; // Continuous 24h

export type ViewMode = 
  | 'live'
  | 'history'
  | 'approval'
  | 'compare';

// ============================================================================
// Activity Types (SSOT)
// ============================================================================

export interface Activity {
  // Identity
  activity_id: string;
  type_id: string;
  trip_id: string;
  tr_ids: string[];
  title: string;
  
  // State
  state: ActivityState;
  lock_level: LockLevel;
  blocker_code: string | null;
  blocker_detail?: {
    owner_role?: string;
    eta_to_clear?: string;
    [key: string]: any;
  };
  
  // Evidence
  evidence_required: EvidenceRequired[];
  evidence_ids: string[];
  
  // Reflow
  reflow_pins: ReflowPin[];
  
  // SSOT: Plan/Actual/Calc
  plan: ActivityPlan;
  actual: ActivityActual;
  calc: ActivityCalc;
}

export interface ActivityPlan {
  start_ts: string | null;  // ISO 8601 + TZ
  end_ts: string | null;
  duration_min: number | null;
  duration_mode: DurationMode;
  
  location: ActivityLocation;
  dependencies: Dependency[];
  resources: ResourceRequirement[];
  constraints: Constraint[];
  notes: string;
}

export interface ActivityLocation {
  from_location_id: string;
  to_location_id: string;
  route_id: string | null;
  geo_fence_ids: string[];
}

export interface Dependency {
  pred_activity_id: string;
  type: DependencyType;
  lag_min: number;
}

export interface ResourceRequirement {
  resource_kind: string;
  pool_id?: string;
  resource_id?: string;
  qty: number;
}

export interface Constraint {
  kind: string;
  hardness: ConstraintHardness;
  rule_ref: string;
  params: Record<string, any>;
}

export interface ActivityActual {
  start_ts: string | null;
  end_ts: string | null;
  progress_pct: number;
  location_override: ActivityLocation | null;
  resource_assignments: ResourceAssignment[];
  notes: string;
}

export interface ResourceAssignment {
  resource_id: string;
  qty: number;
}

export interface ActivityCalc {
  // Critical Path Method (CPM)
  es_ts: string | null;  // Earliest Start
  ef_ts: string | null;  // Earliest Finish
  ls_ts: string | null;  // Latest Start
  lf_ts: string | null;  // Latest Finish
  slack_min: number | null;
  critical_path: boolean;
  
  // Collisions
  collision_ids: string[];
  collision_severity_max: CollisionSeverity | null;
  
  // Risk
  risk_score: number;
  predicted_end_ts: string | null;
  
  // Reflow tracking
  reflow: {
    last_preview_run_id: string | null;
    last_apply_run_id: string | null;
  };
}

export interface EvidenceRequired {
  evidence_type: string;
  stage: EvidenceStage;
  min_count: number;
  required: boolean;
  validity_min: number | null;  // null = no expiry
  tags: string[];
}

export interface ReflowPin {
  path: string;  // e.g. "plan.start_ts"
  pin_kind: 'fixed' | 'soft';
  value: string | number | boolean | object;
  hardness: 'hard' | 'soft';
  reason_code: string;
}

// ============================================================================
// Trip (Reference only, no SSOT)
// ============================================================================

export interface TripMilestones {
  loadout_activity_id?: string;
  sailaway_activity_id?: string;
  loadin_activity_id?: string;
  turning_activity_id?: string;
  jackdown_activity_id?: string;
}

export interface TripCloseoutRef {
  status: 'not_started' | 'required' | 'in_progress' | 'finalized';
  closeout_id: string | null;
}

export interface Trip {
  trip_id: string;
  name: string;
  tr_ids: string[];
  activity_ids: string[];
  /** patchm1 §3.3: Baseline at trip start */
  baseline_id_at_start?: string | null;
  /** patchm1 §3.3: Milestone activity refs */
  milestones?: TripMilestones;
  /** patchm1 §3.3: Closeout status */
  closeout?: TripCloseoutRef;
  /** patchm1 §3.3: Trip status */
  status?: 'planned' | 'active' | 'done';
  /** DERIVED ONLY (no state/location/progress) */
  calc?: {
    collision_ids: string[];
    risk_score: number;
    planned_start_ts?: string | null;
    planned_end_ts?: string | null;
    actual_start_ts?: string | null;
    actual_end_ts?: string | null;
    delay_minutes?: number;
    delay_reason_codes?: string[];
    [key: string]: any;
  };
}

// ============================================================================
// TR (Reference only, no SSOT)
// ============================================================================

export interface TR {
  tr_id: string;
  name: string;
  
  spec: {
    weight_t: number;
    cog_mm: { x: number; y: number; z: number };
    dimensions_mm: { l: number; w: number; h: number };
  };
  
  // DERIVED ONLY (no state/location/progress)
  calc?: {
    current_activity_id: string | null;
    current_location_id: string | null;
    risk_score: number;
    [key: string]: any;
  };
}

// ============================================================================
// Collision
// ============================================================================

export interface Collision {
  collision_id: string;
  kind: string;
  severity: CollisionSeverity;
  status: CollisionStatus;
  trip_id: string;
  activity_ids: string[];
  resource_ids: string[];
  rule_refs: string[];
  message: string;
  details: Record<string, any>;
  suggested_actions: SuggestedAction[];
}

export interface SuggestedAction {
  action_id: string;
  kind: string;
  label: string;
  params: Record<string, any>;
}

// ============================================================================
// Reflow
// ============================================================================

export interface ReflowRun {
  run_id: string;
  mode: ReflowMode;
  requested_at: string;
  requested_by: string;
  baseline_id?: string | null;
  seed: ReflowSeed;
  proposed_changes: ReflowChange[];
  applied_changes: ReflowChange[];
  collision_summary: {
    blocking: number;
    warning: number;
    info: number;
  };
}

export interface ReflowSeed {
  reason: string;
  cursor_ts?: string;
  focus_trip_id?: string;
  [key: string]: any;
}

export interface ReflowChange {
  activity_id: string;
  path: string;
  from: any;
  to: any;
  reason_code: string;
}

// ============================================================================
// Baseline (Approval)
// ============================================================================

export interface Baselines {
  current_baseline_id: string | null;
  items: Record<string, Baseline>;
}

export interface Baseline {
  baseline_id: string;
  name: string;
  status: 'draft' | 'active' | 'superseded';
  created_at: string;
  created_by: string;
  scope: {
    trip_ids: string[];
  };
  freeze_policy: FreezePolicy;
  snapshot: BaselineSnapshot;
}

export interface FreezePolicy {
  lock_level_on_apply: LockLevel;
  frozen_fields: string[];  // Path patterns e.g. "entities.activities.*.plan.start_ts"
  allow_actual_updates: boolean;
  allow_evidence_add: boolean;
  allow_notes_add: boolean;
  override_roles: string[];
}

export interface BaselineSnapshot {
  captured_at: string;
  entities: {
    activities_plan: Record<string, { start_ts: string; end_ts: string }>;
    trs_spec: Record<string, any>;
  };
  hash: {
    algo: string;
    value: string;
  };
}

// ============================================================================
// History
// ============================================================================

export interface HistoryEvent {
  event_id: string;
  ts: string;
  actor: string;
  event_type: string;
  entity_ref: {
    entity_type: string;
    entity_id: string;
  };
  /** patchm2: target for compatibility */
  target?: { type: string; id: string };
  details: Record<string, any>;
  payload?: Record<string, any>;
}

// ============================================================================
// Evidence
// ============================================================================

export type EvidenceKind = 'PHOTO' | 'PDF' | 'EMAIL' | 'WHATSAPP' | 'LINK' | 'OTHER';

export interface EvidenceItem {
  evidence_id: string;
  evidence_type: string;
  title: string;
  /** patchm2: URL/path only, no file upload */
  uri: string;
  captured_at: string;
  captured_by: string;
  tags: string[];
  /** patchm1 §3.5 */
  uploaded_at?: string;
  uploaded_by?: string;
  linked_to?: {
    trip_id?: string;
    tr_id?: string;
    activity_id?: string;
  };
}

// ============================================================================
// Resources
// ============================================================================

export interface Resource {
  resource_id: string;
  kind: string;
  name: string;
  attributes: Record<string, any>;
  calendar: ResourceCalendar;
}

export interface ResourceCalendar {
  timezone: string;
  work_shifts: WorkShift[];
  blackouts: Blackout[];
}

export interface WorkShift {
  days: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[];
  start_hhmm: string;  // e.g. "07:00"
  end_hhmm: string;    // e.g. "19:00"
}

export interface Blackout {
  start_ts: string;
  end_ts: string;
  reason: string;
}

export interface ResourcePool {
  pool_id: string;
  kind: string;
  members: string[];
  capacity_rule: {
    mode: 'one_of' | 'many';
    qty_limit: number;
  };
}

// ============================================================================
// Location
// ============================================================================

export interface Location {
  location_id: string;
  name: string;
  lat: number;
  lon: number;
}

// ============================================================================
// Activity Types (Templates)
// ============================================================================

export interface ActivityType {
  type_id: string;
  display_name: string;
  category: string;
  default_duration_min: number;
  default_resources: ResourceRequirement[];
  default_constraints: Constraint[];
  default_evidence_required: EvidenceRequired[];
}

// ============================================================================
// Constraint Rules
// ============================================================================

export interface ConstraintRules {
  wx: {
    profiles: Record<string, WXProfile>;
    data_sources: {
      primary: string;
      fallback: string;
    };
  };
  linkspan: {
    assets: Record<string, LinkspanAsset>;
  };
  barge: {
    assets: Record<string, BargeAsset>;
  };
  ptw: {
    permit_types: Record<string, PTWPermit>;
    certificate_types: Record<string, PTWCertificate>;
  };
}

export interface WXProfile {
  wind_sustained_max_mps: number;
  wind_gust_max_mps: number;
  visibility_min_m: number;
  precip_max_mmph: number;
  lightning_exclusion_km: number;
  wave_height_max_m: number;
  temperature_min_c: number;
  temperature_max_c: number;
  window_min_duration_min: number;
}

export interface LinkspanAsset {
  max_gross_load_t: number;
  max_axle_line_load_t: number;
  max_slope_deg: number;
  min_deck_width_m: number;
  slot_granularity_min: number;
  requires_slot_booking: boolean;
}

export interface BargeAsset {
  max_payload_t: number;
  max_deck_point_load_t_per_m2: number;
  draft_max_m: number;
  trim_max_deg: number;
  heel_max_deg: number;
  requires_stability_calc: boolean;
  requires_mooring_plan: boolean;
}

export interface PTWPermit {
  validity_min: number;
  lead_time_min: number;
}

export interface PTWCertificate {
  validity_min: number;
}

// ============================================================================
// Trip Closeout & Reports (patchm1 §3.6, §3.7)
// ============================================================================

export interface TripCloseout {
  closeout_id: string;
  trip_id: string;
  tr_id: string;
  status: 'draft' | 'finalized';
  entered_at: string;
  entered_by: string;
  summary_md?: string;
  delay_reason_codes?: string[];
  delay_details?: Array<{
    code: string;
    minutes: number;
    notes_md?: string;
  }>;
  evidence_ids?: string[];
  snapshot_refs?: {
    baseline_id_at_start?: string;
    baseline_id_original?: string;
  };
}

export interface TripReportMilestone {
  name: string;
  planned_ts: string;
  actual_ts: string | null;
  delta_minutes: number;
}

export interface TripReport {
  report_id: string;
  trip_id: string;
  tr_id: string;
  generated_at: string;
  baseline_id?: string;
  milestones: TripReportMilestone[];
  delay_minutes: number;
  delay_reason_codes?: string[];
  evidence_completeness?: {
    required_total: number;
    provided_total: number;
    missing?: Array<{
      activity_id: string;
      evidence_type: string;
      stage: string;
      min_count: number;
    }>;
  };
  narrative_closeout_id?: string;
}

export interface ProjectReport {
  report_id: string;
  generated_at: string;
  trip_report_ids: string[];
}

// ============================================================================
// Top-level SSOT Structure
// ============================================================================

export interface OptionC {
  contract: {
    name: string;
    version: string;
    timezone: string;
    generated_at: string;
    ssot: {
      activity_is_source_of_truth: boolean;
      derived_fields_read_only: boolean;
    };
  };
  
  constraint_rules: ConstraintRules;
  activity_types: Record<string, ActivityType>;
  
  entities: {
    locations: Record<string, Location>;
    resource_pools: Record<string, ResourcePool>;
    resources: Record<string, Resource>;
    trs: Record<string, TR>;
    trips: Record<string, Trip>;
    evidence_items: Record<string, EvidenceItem>;
    activities: Record<string, Activity>;  // CRITICAL: dict, not array
  };
  
  collisions: Record<string, Collision>;
  reflow_runs: ReflowRun[];
  baselines: Baselines;
  history_events: HistoryEvent[];
  /** patchm1 §3.6 */
  trip_closeouts?: { items: Record<string, TripCloseout> };
  /** patchm1 §3.7 */
  reports?: {
    trip_reports?: Record<string, TripReport>;
    project_reports?: Record<string, ProjectReport>;
  };

  ui_defaults?: {
    view_mode: ViewMode;
    risk_overlay: string;
    [key: string]: any;
  };
}
