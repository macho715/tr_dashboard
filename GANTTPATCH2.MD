아래는 **Gantt(Vis-Timeline) 렌더러 통합용 `props / state / events` 계약**을 **JSON Schema (draft 2020-12)**로 정리한 **단일 스키마 파일**입니다.
이 파일 1개를 저장해두고, 필요할 때 `#/ $defs/GanttRendererProps` / `#/ $defs/GanttRendererState` / `#/ $defs/GanttEvent`로 각각 검증하면 됩니다.

> 핵심: **함수 콜백(props)** 대신 **Event 스트림**으로 상위(오케스트레이터)와 통신하도록 계약을 고정했습니다. (JSON Schema가 함수 타입을 표현할 수 없기 때문)

---

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://schemas.example.com/tr-dashboard/gantt/contract.v1.json",
  "title": "TR Dashboard — Gantt Integration Contract (Props/State/Events) v1",
  "description": "Schema-first contract between the Gantt orchestrator (dashboard) and a vis-timeline based renderer. Use $defs refs to validate props/state/events.",
  "oneOf": [
    { "$ref": "#/$defs/GanttRendererProps" },
    { "$ref": "#/$defs/GanttRendererState" },
    { "$ref": "#/$defs/GanttEvent" }
  ],
  "$defs": {
    "ContractKind": {
      "type": "string",
      "enum": ["gantt.props.v1", "gantt.state.v1", "gantt.event.v1"]
    },

    "TripId": { "type": "integer", "minimum": 1, "maximum": 7 },

    "IanaTimeZone": {
      "type": "string",
      "description": "Best-effort IANA TZ pattern. Validator should treat as a string and optionally validate with a TZ database at runtime.",
      "pattern": "^[A-Za-z_]+\\/[A-Za-z_]+(?:\\/[A-Za-z_]+)?$"
    },

    "ISODate": {
      "type": "string",
      "format": "date",
      "description": "Date-only in YYYY-MM-DD. Must be interpreted in timeline.timezone (NOT JS Date('YYYY-MM-DD'))."
    },

    "ISODateTime": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 date-time with offset or Z. Example: 2026-02-07T12:00:00Z"
    },

    "Actor": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "actor_id": { "type": "string", "minLength": 1 },
        "display_name": { "type": "string", "minLength": 1 }
      }
    },

    "DateCursor": {
      "type": "object",
      "additionalProperties": false,
      "required": ["date", "timezone", "anchor"],
      "properties": {
        "date": { "$ref": "#/$defs/ISODate" },
        "timezone": { "$ref": "#/$defs/IanaTimeZone" },
        "anchor": {
          "type": "string",
          "enum": ["LOCAL_MIDDAY", "LOCAL_START_OF_DAY", "LOCAL_END_OF_DAY"],
          "description": "To avoid off-by-one-day bugs, use LOCAL_MIDDAY as default anchor (e.g., 12:00 local)."
        },
        "label": {
          "type": "string",
          "description": "Optional human-readable label shown in UI for the cursor."
        }
      }
    },

    "TimelineWindow": {
      "type": "object",
      "additionalProperties": false,
      "required": ["start", "end"],
      "properties": {
        "start": { "$ref": "#/$defs/ISODateTime" },
        "end": { "$ref": "#/$defs/ISODateTime" }
      }
    },

    "RenderMode": {
      "type": "string",
      "enum": ["CURRENT_PLAN", "COMPARE_PLANS", "READONLY"],
      "description": "CURRENT_PLAN: render current items only. COMPARE_PLANS: render baseline+current overlays. READONLY: no edit interactions."
    },

    "VisGroup": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "content"],
      "properties": {
        "id": { "type": "string", "minLength": 1 },
        "content": { "type": "string", "minLength": 1 },
        "order": { "type": "integer", "minimum": 0 },
        "className": { "type": "string" }
      }
    },

    "ItemLayer": {
      "type": "string",
      "enum": ["CURRENT", "BASELINE", "ACTUAL"],
      "description": "Layer is used for styling/overlay (e.g., baseline ghost bars)."
    },

    "DiffTag": {
      "type": "string",
      "enum": ["SHIFTED", "ADDED", "REMOVED", "CHANGED_DEPS", "CHANGED_RESOURCE", "CHANGED_NAME"]
    },

    "VisItemMeta": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "trip_id": { "$ref": "#/$defs/TripId" },
        "activity_id": { "type": "string", "minLength": 1 },
        "layer": { "$ref": "#/$defs/ItemLayer" },
        "deps": {
          "type": "array",
          "items": { "type": "string", "minLength": 1 },
          "default": []
        },
        "resource": { "type": "string" },
        "diff_tags": {
          "type": "array",
          "items": { "$ref": "#/$defs/DiffTag" },
          "default": []
        }
      }
    },

    "VisItem": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "group", "content", "start", "end", "type"],
      "properties": {
        "id": { "type": "string", "minLength": 1 },
        "group": { "type": "string", "minLength": 1 },
        "content": { "type": "string", "minLength": 1 },
        "start": { "$ref": "#/$defs/ISODateTime" },
        "end": { "$ref": "#/$defs/ISODateTime" },
        "type": { "type": "string", "enum": ["range"] },
        "className": { "type": "string" },
        "title": { "type": "string" },
        "meta": { "$ref": "#/$defs/VisItemMeta" }
      }
    },

    "RendererOptions": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "stack": { "type": "boolean", "default": false },
        "selectable": { "type": "boolean", "default": true },
        "editable": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "enable_drag": { "type": "boolean", "default": false },
            "enable_resize": { "type": "boolean", "default": false }
          }
        },
        "show_selected_date_bar": { "type": "boolean", "default": true },
        "show_today_marker": { "type": "boolean", "default": true }
      }
    },

    "TripContext": {
      "type": "object",
      "additionalProperties": false,
      "required": ["trip_id", "tr_id", "status"],
      "properties": {
        "trip_id": { "$ref": "#/$defs/TripId" },
        "tr_id": { "type": "string", "minLength": 1 },
        "status": { "type": "string", "enum": ["PLANNED", "IN_PROGRESS", "DONE"] }
      }
    },

    "ComparisonContext": {
      "type": "object",
      "additionalProperties": false,
      "required": ["enabled", "basis"],
      "properties": {
        "enabled": { "type": "boolean" },
        "basis": {
          "type": "object",
          "additionalProperties": false,
          "required": ["type"],
          "properties": {
            "type": {
              "type": "string",
              "enum": ["PLAN_BASELINE", "SNAPSHOT_AT", "CUSTOM_DATE"],
              "description": "PLAN_BASELINE: immutable baseline. SNAPSHOT_AT: historic snapshot. CUSTOM_DATE: user-selected as-of date."
            },
            "as_of_date": {
              "$ref": "#/$defs/ISODate",
              "description": "Optional compare-as-of date. Required when basis.type is SNAPSHOT_AT or CUSTOM_DATE."
            }
          }
        }
      },
      "allOf": [
        {
          "if": {
            "properties": { "basis": { "properties": { "type": { "enum": ["SNAPSHOT_AT", "CUSTOM_DATE"] } }, "required": ["type"] } },
            "required": ["basis"]
          },
          "then": {
            "properties": { "basis": { "required": ["as_of_date"] } }
          }
        }
      ]
    },

    "GanttRendererProps": {
      "type": "object",
      "additionalProperties": false,
      "required": ["kind", "contract_version", "trip", "timeline", "render_mode", "groups", "items", "options"],
      "properties": {
        "kind": { "$ref": "#/$defs/ContractKind", "const": "gantt.props.v1" },
        "contract_version": { "type": "string", "const": "1.0.0" },

        "trip": { "$ref": "#/$defs/TripContext" },

        "timeline": {
          "type": "object",
          "additionalProperties": false,
          "required": ["timezone"],
          "properties": {
            "timezone": { "$ref": "#/$defs/IanaTimeZone" },
            "visible_window": { "$ref": "#/$defs/TimelineWindow" },
            "min_window": { "$ref": "#/$defs/TimelineWindow" },
            "max_window": { "$ref": "#/$defs/TimelineWindow" }
          }
        },

        "render_mode": { "$ref": "#/$defs/RenderMode" },

        "comparison": {
          "$ref": "#/$defs/ComparisonContext",
          "description": "Required when render_mode=COMPARE_PLANS; ignored otherwise."
        },

        "selected_date_cursor": {
          "$ref": "#/$defs/DateCursor",
          "description": "Controls the vertical 'Selected Date' bar. Must align with item date parsing to avoid mismatch bugs."
        },

        "groups": {
          "type": "array",
          "items": { "$ref": "#/$defs/VisGroup" },
          "minItems": 0
        },

        "items": {
          "type": "array",
          "items": { "$ref": "#/$defs/VisItem" },
          "minItems": 0
        },

        "options": { "$ref": "#/$defs/RendererOptions" },

        "debug": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "component_id": { "type": "string" },
            "route": { "type": "string" }
          }
        }
      },
      "allOf": [
        {
          "if": {
            "properties": { "render_mode": { "const": "COMPARE_PLANS" } },
            "required": ["render_mode"]
          },
          "then": { "required": ["comparison"] }
        }
      ]
    },

    "SelectionState": {
      "type": "object",
      "additionalProperties": false,
      "required": ["kind"],
      "properties": {
        "kind": { "type": "string", "enum": ["NONE", "ITEM"] },
        "item_id": { "type": "string" },
        "activity_id": { "type": "string" },
        "group_id": { "type": "string" }
      },
      "allOf": [
        {
          "if": { "properties": { "kind": { "const": "ITEM" } }, "required": ["kind"] },
          "then": { "required": ["item_id"] }
        }
      ]
    },

    "GanttRendererState": {
      "type": "object",
      "additionalProperties": false,
      "required": ["kind", "contract_version", "trip_id", "timezone", "selection"],
      "properties": {
        "kind": { "$ref": "#/$defs/ContractKind", "const": "gantt.state.v1" },
        "contract_version": { "type": "string", "const": "1.0.0" },

        "trip_id": { "$ref": "#/$defs/TripId" },
        "timezone": { "$ref": "#/$defs/IanaTimeZone" },

        "selected_date_cursor": { "$ref": "#/$defs/DateCursor" },

        "selection": { "$ref": "#/$defs/SelectionState" },

        "viewport": {
          "type": "object",
          "additionalProperties": false,
          "properties": {
            "visible_window": { "$ref": "#/$defs/TimelineWindow" },
            "zoom_preset": {
              "type": "string",
              "enum": ["DAY", "WEEK", "MONTH", "QUARTER", "YEAR"]
            }
          }
        },

        "compare_as_of_date": {
          "$ref": "#/$defs/ISODate",
          "description": "If compare mode is on, stores the as-of date used for diff/overlay."
        },

        "last_interaction_at": { "$ref": "#/$defs/ISODateTime" }
      }
    },

    "EventType": {
      "type": "string",
      "enum": [
        "GANTT_READY",
        "DATE_CURSOR_CHANGED",
        "ITEM_SELECTED",
        "ITEM_ACTIVATED",
        "ITEM_EDIT_REQUESTED",
        "ITEM_TIME_CHANGED",
        "VIEWPORT_CHANGED",
        "COMPARE_AS_OF_CHANGED",
        "ERROR"
      ]
    },

    "EventBase": {
      "type": "object",
      "additionalProperties": false,
      "required": ["kind", "event_id", "occurred_at", "trip_id", "event_type", "payload"],
      "properties": {
        "kind": { "$ref": "#/$defs/ContractKind", "const": "gantt.event.v1" },
        "event_id": {
          "type": "string",
          "description": "UUID recommended (crypto.randomUUID)."
        },
        "occurred_at": { "$ref": "#/$defs/ISODateTime" },
        "trip_id": { "$ref": "#/$defs/TripId" },
        "event_type": { "$ref": "#/$defs/EventType" },
        "actor": { "$ref": "#/$defs/Actor" },
        "payload": { "type": "object" }
      }
    },

    "Payload_GANTT_READY": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "component_id": { "type": "string" },
        "timeline_library": { "type": "string", "const": "vis-timeline" }
      }
    },

    "Payload_DATE_CURSOR_CHANGED": {
      "type": "object",
      "additionalProperties": false,
      "required": ["cursor"],
      "properties": {
        "cursor": { "$ref": "#/$defs/DateCursor" },
        "source": {
          "type": "string",
          "enum": ["DATE_INPUT", "AXIS_CLICK", "KEYBOARD_SHORTCUT", "PROGRAMMATIC"]
        }
      }
    },

    "Payload_ITEM_SELECTED": {
      "type": "object",
      "additionalProperties": false,
      "required": ["item_id"],
      "properties": {
        "item_id": { "type": "string", "minLength": 1 },
        "activity_id": { "type": "string" },
        "group_id": { "type": "string" }
      }
    },

    "Payload_ITEM_ACTIVATED": {
      "type": "object",
      "additionalProperties": false,
      "required": ["item_id"],
      "properties": {
        "item_id": { "type": "string", "minLength": 1 },
        "activation": { "type": "string", "enum": ["DOUBLE_CLICK", "ENTER_KEY"] }
      }
    },

    "Payload_ITEM_EDIT_REQUESTED": {
      "type": "object",
      "additionalProperties": false,
      "required": ["item_id", "reason"],
      "properties": {
        "item_id": { "type": "string", "minLength": 1 },
        "reason": {
          "type": "string",
          "enum": ["OPEN_DATE_DIALOG", "OPEN_DETAILS", "CONTEXT_MENU"]
        }
      }
    },

    "Payload_ITEM_TIME_CHANGED": {
      "type": "object",
      "additionalProperties": false,
      "required": ["item_id", "proposed_start", "proposed_end", "method"],
      "properties": {
        "item_id": { "type": "string", "minLength": 1 },
        "proposed_start": { "$ref": "#/$defs/ISODateTime" },
        "proposed_end": { "$ref": "#/$defs/ISODateTime" },
        "method": { "type": "string", "enum": ["DRAG", "RESIZE", "DIALOG_APPLY"] }
      }
    },

    "Payload_VIEWPORT_CHANGED": {
      "type": "object",
      "additionalProperties": false,
      "required": ["visible_window"],
      "properties": {
        "visible_window": { "$ref": "#/$defs/TimelineWindow" },
        "trigger": { "type": "string", "enum": ["PAN", "ZOOM", "FIT", "PROGRAMMATIC"] }
      }
    },

    "Payload_COMPARE_AS_OF_CHANGED": {
      "type": "object",
      "additionalProperties": false,
      "required": ["as_of_date"],
      "properties": {
        "as_of_date": { "$ref": "#/$defs/ISODate" },
        "source": { "type": "string", "enum": ["DATE_INPUT", "PRESET_BUTTON", "PROGRAMMATIC"] }
      }
    },

    "Payload_ERROR": {
      "type": "object",
      "additionalProperties": false,
      "required": ["message"],
      "properties": {
        "message": { "type": "string" },
        "code": { "type": "string" },
        "stack": { "type": "string" }
      }
    },

    "GanttEvent": {
      "allOf": [
        { "$ref": "#/$defs/EventBase" },
        {
          "oneOf": [
            {
              "properties": {
                "event_type": { "const": "GANTT_READY" },
                "payload": { "$ref": "#/$defs/Payload_GANTT_READY" }
              }
            },
            {
              "properties": {
                "event_type": { "const": "DATE_CURSOR_CHANGED" },
                "payload": { "$ref": "#/$defs/Payload_DATE_CURSOR_CHANGED" }
              }
            },
            {
              "properties": {
                "event_type": { "const": "ITEM_SELECTED" },
                "payload": { "$ref": "#/$defs/Payload_ITEM_SELECTED" }
              }
            },
            {
              "properties": {
                "event_type": { "const": "ITEM_ACTIVATED" },
                "payload": { "$ref": "#/$defs/Payload_ITEM_ACTIVATED" }
              }
            },
            {
              "properties": {
                "event_type": { "const": "ITEM_EDIT_REQUESTED" },
                "payload": { "$ref": "#/$defs/Payload_ITEM_EDIT_REQUESTED" }
              }
            },
            {
              "properties": {
                "event_type": { "const": "ITEM_TIME_CHANGED" },
                "payload": { "$ref": "#/$defs/Payload_ITEM_TIME_CHANGED" }
              }
            },
            {
              "properties": {
                "event_type": { "const": "VIEWPORT_CHANGED" },
                "payload": { "$ref": "#/$defs/Payload_VIEWPORT_CHANGED" }
              }
            },
            {
              "properties": {
                "event_type": { "const": "COMPARE_AS_OF_CHANGED" },
                "payload": { "$ref": "#/$defs/Payload_COMPARE_AS_OF_CHANGED" }
              }
            },
            {
              "properties": {
                "event_type": { "const": "ERROR" },
                "payload": { "$ref": "#/$defs/Payload_ERROR" }
              }
            }
          ]
        }
      ]
    }
  }
}
```

---

## 적용 가이드 (짧게)

### 1) Props를 “렌더러 입력”으로 고정

* 오케스트레이터(`gantt-chart.tsx`)는 **계산/SSOT/저장/compare 기준**을 처리하고
* 렌더러(`VisTimelineGantt`)는 **`GanttRendererProps`만 받아서 그린다**.

### 2) State는 “복원 가능한 것만” 저장

* `selected_date_cursor`, `compare_as_of_date`, `viewport.visible_window` 등
* hover 같은 휘발 상태는 저장하지 않는 게 일반적으로 안전합니다.

### 3) 이벤트는 “항상 객체”로 내보내기

* `ITEM_SELECTED` → 오른쪽 패널(상세/증빙/노트) 동기화
* `DATE_CURSOR_CHANGED` → “선택한 날짜 의미”를 UI에 표시(버그 #1 방지)
* `COMPARE_AS_OF_CHANGED` → compare 기준 날짜 입력 UX의 근거 이벤트

원하면, 위 스키마를 기준으로 **TypeScript 타입 생성용(ajv + json-schema-to-ts) 추천 구성**까지 함께 제시할 수 있습니다.
