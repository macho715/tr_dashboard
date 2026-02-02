/**
 * GANTTPATCH4: JSON Schema as TS const (SSOT)
 * Source: lib/gantt/contract.schema.json
 * Use with: FromSchema (json-schema-to-ts), Ajv (runtime validation)
 */
export const GanttContractSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://schemas.example.com/tr-dashboard/gantt/contract.v1.json",
  title: "TR Dashboard — Gantt Integration Contract (Props/State/Events) v1",
  description:
    "Schema-first contract between the Gantt orchestrator (dashboard) and a vis-timeline based renderer.",
  oneOf: [
    { $ref: "#/$defs/GanttRendererProps" },
    { $ref: "#/$defs/GanttRendererState" },
    { $ref: "#/$defs/GanttEvent" },
  ],
  $defs: {
    ContractKind: {
      type: "string",
      enum: ["gantt.props.v1", "gantt.state.v1", "gantt.event.v1"],
    },
    TripId: { type: "integer", minimum: 1, maximum: 7 },
    IanaTimeZone: {
      type: "string",
      description: "Best-effort IANA TZ pattern.",
      pattern: "^[A-Za-z_]+/[A-Za-z_]+(?:/[A-Za-z_]+)?$",
    },
    ISODate: {
      type: "string",
      format: "date",
      description: "Date-only in YYYY-MM-DD.",
    },
    ISODateTime: {
      type: "string",
      format: "date-time",
      description: "ISO 8601 date-time with offset or Z.",
    },
    Actor: {
      type: "object",
      additionalProperties: false,
      properties: {
        actor_id: { type: "string", minLength: 1 },
        display_name: { type: "string", minLength: 1 },
      },
    },
    DateCursor: {
      type: "object",
      additionalProperties: false,
      required: ["date", "timezone", "anchor"],
      properties: {
        date: { $ref: "#/$defs/ISODate" },
        timezone: { $ref: "#/$defs/IanaTimeZone" },
        anchor: {
          type: "string",
          enum: ["LOCAL_MIDDAY", "LOCAL_START_OF_DAY", "LOCAL_END_OF_DAY"],
        },
        label: { type: "string" },
      },
    },
    TimelineWindow: {
      type: "object",
      additionalProperties: false,
      required: ["start", "end"],
      properties: {
        start: { $ref: "#/$defs/ISODateTime" },
        end: { $ref: "#/$defs/ISODateTime" },
      },
    },
    RenderMode: {
      type: "string",
      enum: ["CURRENT_PLAN", "COMPARE_PLANS", "READONLY"],
    },
    VisGroup: {
      type: "object",
      additionalProperties: false,
      required: ["id", "content"],
      properties: {
        id: { type: "string", minLength: 1 },
        content: { type: "string", minLength: 1 },
        order: { type: "integer", minimum: 0 },
        className: { type: "string" },
      },
    },
    ItemLayer: { type: "string", enum: ["CURRENT", "BASELINE", "ACTUAL"] },
    DiffTag: {
      type: "string",
      enum: [
        "SHIFTED",
        "ADDED",
        "REMOVED",
        "CHANGED_DEPS",
        "CHANGED_RESOURCE",
        "CHANGED_NAME",
      ],
    },
    VisItemMeta: {
      type: "object",
      additionalProperties: false,
      properties: {
        trip_id: { $ref: "#/$defs/TripId" },
        activity_id: { type: "string", minLength: 1 },
        layer: { $ref: "#/$defs/ItemLayer" },
        deps: { type: "array", items: { type: "string", minLength: 1 } },
        resource: { type: "string" },
        diff_tags: { type: "array", items: { $ref: "#/$defs/DiffTag" } },
      },
    },
    VisItem: {
      type: "object",
      additionalProperties: false,
      required: ["id", "group", "content", "start", "end", "type"],
      properties: {
        id: { type: "string", minLength: 1 },
        group: { type: "string", minLength: 1 },
        content: { type: "string", minLength: 1 },
        start: { $ref: "#/$defs/ISODateTime" },
        end: { $ref: "#/$defs/ISODateTime" },
        type: { type: "string", enum: ["range"] },
        className: { type: "string" },
        title: { type: "string" },
        meta: { $ref: "#/$defs/VisItemMeta" },
      },
    },
    RendererOptions: {
      type: "object",
      additionalProperties: false,
      properties: {
        stack: { type: "boolean", default: false },
        selectable: { type: "boolean", default: true },
        editable: {
          type: "object",
          properties: {
            enable_drag: { type: "boolean", default: false },
            enable_resize: { type: "boolean", default: false },
          },
        },
        show_selected_date_bar: { type: "boolean", default: true },
        show_today_marker: { type: "boolean", default: true },
      },
    },
    TripContext: {
      type: "object",
      additionalProperties: false,
      required: ["trip_id", "tr_id", "status"],
      properties: {
        trip_id: { $ref: "#/$defs/TripId" },
        tr_id: { type: "string", minLength: 1 },
        status: {
          type: "string",
          enum: ["PLANNED", "IN_PROGRESS", "DONE"],
        },
      },
    },
    ComparisonContext: {
      type: "object",
      additionalProperties: false,
      required: ["enabled", "basis"],
      properties: {
        enabled: { type: "boolean" },
        basis: {
          type: "object",
          required: ["type"],
          properties: {
            type: {
              type: "string",
              enum: ["PLAN_BASELINE", "SNAPSHOT_AT", "CUSTOM_DATE"],
            },
            as_of_date: { $ref: "#/$defs/ISODate" },
          },
        },
      },
    },
    GanttRendererProps: {
      type: "object",
      additionalProperties: false,
      required: [
        "kind",
        "contract_version",
        "trip",
        "timeline",
        "render_mode",
        "groups",
        "items",
        "options",
      ],
      properties: {
        kind: { const: "gantt.props.v1" },
        contract_version: { type: "string", const: "1.0.0" },
        trip: { $ref: "#/$defs/TripContext" },
        timeline: {
          type: "object",
          required: ["timezone"],
          properties: {
            timezone: { $ref: "#/$defs/IanaTimeZone" },
            visible_window: { $ref: "#/$defs/TimelineWindow" },
            min_window: { $ref: "#/$defs/TimelineWindow" },
            max_window: { $ref: "#/$defs/TimelineWindow" },
          },
        },
        render_mode: { $ref: "#/$defs/RenderMode" },
        comparison: { $ref: "#/$defs/ComparisonContext" },
        selected_date_cursor: { $ref: "#/$defs/DateCursor" },
        groups: { type: "array", items: { $ref: "#/$defs/VisGroup" } },
        items: { type: "array", items: { $ref: "#/$defs/VisItem" } },
        options: { $ref: "#/$defs/RendererOptions" },
      },
    },
    SelectionState: {
      type: "object",
      additionalProperties: false,
      required: ["kind"],
      properties: {
        kind: { type: "string", enum: ["NONE", "ITEM"] },
        item_id: { type: "string" },
        activity_id: { type: "string" },
        group_id: { type: "string" },
      },
    },
    GanttRendererState: {
      type: "object",
      additionalProperties: false,
      required: ["kind", "contract_version", "trip_id", "timezone", "selection"],
      properties: {
        kind: { const: "gantt.state.v1" },
        contract_version: { type: "string", const: "1.0.0" },
        trip_id: { $ref: "#/$defs/TripId" },
        timezone: { $ref: "#/$defs/IanaTimeZone" },
        selected_date_cursor: { $ref: "#/$defs/DateCursor" },
        selection: { $ref: "#/$defs/SelectionState" },
        viewport: {
          type: "object",
          properties: {
            visible_window: { $ref: "#/$defs/TimelineWindow" },
            zoom_preset: {
              type: "string",
              enum: ["DAY", "WEEK", "MONTH", "QUARTER", "YEAR"],
            },
          },
        },
        compare_as_of_date: { $ref: "#/$defs/ISODate" },
        last_interaction_at: { $ref: "#/$defs/ISODateTime" },
      },
    },
    EventType: {
      type: "string",
      enum: [
        "GANTT_READY",
        "DATE_CURSOR_CHANGED",
        "ITEM_SELECTED",
        "ITEM_ACTIVATED",
        "ITEM_EDIT_REQUESTED",
        "ITEM_TIME_CHANGED",
        "VIEWPORT_CHANGED",
        "COMPARE_AS_OF_CHANGED",
        "ERROR",
      ],
    },
    GanttEvent: {
      type: "object",
      additionalProperties: false,
      required: [
        "kind",
        "event_id",
        "occurred_at",
        "trip_id",
        "event_type",
        "payload",
      ],
      properties: {
        kind: { const: "gantt.event.v1" },
        event_id: { type: "string" },
        occurred_at: { $ref: "#/$defs/ISODateTime" },
        trip_id: { $ref: "#/$defs/TripId" },
        event_type: { $ref: "#/$defs/EventType" },
        actor: { $ref: "#/$defs/Actor" },
        payload: { type: "object" },
      },
    },
  },
} as const
