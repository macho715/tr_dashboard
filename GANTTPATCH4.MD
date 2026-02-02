아래는 **“JSON Schema(SSOT) → TypeScript 타입(compile-time) + Ajv 런타임 검증(runtime)”**을 **Next.js(App Router) 레포에 무리 없이 넣는** 추천 구성입니다.

핵심 포인트는 2가지입니다.

1. **`json-schema-to-ts`는 `as const` 리터럴 타입이 필요**하므로, 스키마를 **`.json`이 아니라 `.ts` 상수**로 두는 게 가장 안정적입니다.
2. Ajv는 번들이 커질 수 있으니 **server-only(권장)** 또는 **lazy/dynamic import(대안)**로 넣습니다.

---

## 1) 패키지 설치 (pnpm 기준)

```bash
pnpm add ajv ajv-formats
pnpm add -D json-schema-to-ts
```

* `json-schema-to-ts`는 타입 레벨(compile-time)에서만 쓰이므로 보통 `-D`가 적합합니다.
* Ajv는 런타임 검증에 필요하므로 일반 dependency에 둡니다.

---

## 2) 권장 폴더/파일 구조

```
/schemas/
  /gantt/
    contract.v1.ts          # JSON Schema를 TS const로 저장 (SSOT)
/lib/
  /gantt/
    contract.types.ts       # FromSchema로 타입 추출
    contract.validate.ts    # Ajv validator + type guard (server-only 권장)
```

---

## 3) 스키마 파일을 “TS const”로 저장하기

### `schemas/gantt/contract.v1.ts`

> 이전에 만든 JSON Schema(전체)를 **그대로 객체로 붙여넣고** `as const`만 붙이면 됩니다.

```ts
// schemas/gantt/contract.v1.ts
export const GanttContractSchema = {
  /* 여기에 JSON Schema 전체를 그대로 붙여넣기 */
} as const;
```

왜 TS 파일이어야 하나?

* JSON import(`resolveJsonModule`)로 가져오면 **리터럴 enum/const 정보가 “string”으로 넓어져서** `FromSchema<>` 타입 정확도가 크게 떨어집니다.
* `.ts + as const`가 가장 깔끔합니다.

---

## 4) json-schema-to-ts로 타입 생성(추론)하기

### `lib/gantt/contract.types.ts`

```ts
// lib/gantt/contract.types.ts
import type { FromSchema } from "json-schema-to-ts";
import { GanttContractSchema } from "@/schemas/gantt/contract.v1";

// 1) Root schema가 oneOf(union) 이므로 union 타입이 생성됨
export type GanttContract = FromSchema<typeof GanttContractSchema>;

// 2) kind(discriminator)로 세부 타입을 Extract로 분리 (추천)
export type GanttRendererProps = Extract<GanttContract, { kind: "gantt.props.v1" }>;
export type GanttRendererState = Extract<GanttContract, { kind: "gantt.state.v1" }>;
export type GanttEvent = Extract<GanttContract, { kind: "gantt.event.v1" }>;

// (옵션) 이벤트 타입별로 더 쪼개고 싶으면:
export type GanttEvent_ItemSelected = Extract<GanttEvent, { event_type: "ITEM_SELECTED" }>;
export type GanttEvent_DateCursorChanged = Extract<GanttEvent, { event_type: "DATE_CURSOR_CHANGED" }>;
```

이 패턴의 장점:

* **추가 코드 생성 단계 없이** 타입이 자동으로 따라옵니다.
* 스키마가 SSOT이므로, 스키마 변경 = 타입도 자동 변경.

---

## 5) Ajv 런타임 검증 (권장: server-only)

### 5.1 Server-only validator (Next.js에서 번들 보호)

#### `lib/gantt/contract.validate.ts`

```ts
// lib/gantt/contract.validate.ts
import "server-only";

import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";

import { GanttContractSchema } from "@/schemas/gantt/contract.v1";
import type {
  GanttContract,
  GanttRendererProps,
  GanttRendererState,
  GanttEvent
} from "./contract.types";

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  // defaults를 자동 주입하면 SSOT가 “조용히 변형”될 수 있어 OFF 권장
  useDefaults: false
});

addFormats(ajv);

// 1) root union 스키마로 단일 validator 생성
const validateContract = ajv.compile<GanttContract>(GanttContractSchema);

function formatAjvErrors(errors: unknown) {
  // ajv.errorsText(validate.errors)는 간단하지만,
  // 제품 UX에 맞춰 메시지를 정제하려면 여기서 커스터마이즈
  return JSON.stringify(errors, null, 2);
}

// 2) asserts-style (실패 시 throw) — 경계에서만 사용 권장
export function assertGanttContract(x: unknown): asserts x is GanttContract {
  if (!validateContract(x)) {
    throw new Error(`[GanttContract] Schema validation failed:\n${formatAjvErrors(validateContract.errors)}`);
  }
}

// 3) kind 기반 세부 type guard — 실제 앱 코드에서 쓰기 좋음
export function assertGanttRendererProps(x: unknown): asserts x is GanttRendererProps {
  assertGanttContract(x);
  if ((x as any).kind !== "gantt.props.v1") {
    throw new Error(`[GanttRendererProps] kind mismatch: ${(x as any).kind}`);
  }
}

export function assertGanttRendererState(x: unknown): asserts x is GanttRendererState {
  assertGanttContract(x);
  if ((x as any).kind !== "gantt.state.v1") {
    throw new Error(`[GanttRendererState] kind mismatch: ${(x as any).kind}`);
  }
}

export function assertGanttEvent(x: unknown): asserts x is GanttEvent {
  assertGanttContract(x);
  if ((x as any).kind !== "gantt.event.v1") {
    throw new Error(`[GanttEvent] kind mismatch: ${(x as any).kind}`);
  }
}
```

### 어디서 쓰나?

* **서버 API 경계**(예: `/api/*`), **Report export**, **Snapshot import/export**, **(Phase2) DB write** 같이 “외부/저장 경계”에서만 검증하는 게 비용 대비 효율이 좋습니다.
* Client 컴포넌트에서 Ajv를 직접 import하면 번들 비용이 커질 수 있으니(특히 Gantt 화면) 기본은 server-only를 권장합니다.

---

## 6) (대안) 클라이언트에서도 검증해야 할 때: lazy import

로컬스토리지/IndexedDB에서 불러오는 데이터가 깨질 수 있고, 그걸 막고 싶다면 **Ajv를 lazy import**로 분리합니다.

### `lib/gantt/contract.validate.client.ts` (Client-safe)

```ts
// lib/gantt/contract.validate.client.ts
import type { GanttContract } from "./contract.types";

let _assert: ((x: unknown) => asserts x is GanttContract) | null = null;

export async function assertGanttContractClient(x: unknown): Promise<GanttContract> {
  if (!_assert) {
    // Ajv 코드는 여기서 동적 로드 → 별도 청크로 분리됨
    const mod = await import("./contract.validate.runtime");
    _assert = mod.assertGanttContract;
  }
  _assert(x);
  return x;
}
```

### `lib/gantt/contract.validate.runtime.ts` (Ajv 포함, client에서도 import 가능)

* 위의 `contract.validate.ts`에서 `server-only`만 제거한 버전으로 별도 파일을 둡니다.
* 이렇게 하면 기본 번들에서는 빠지고, “필요할 때만” 로드됩니다.

---

## 7) 실제 사용 예시 (오케스트레이터/렌더러 경계)

### 7.1 props 생성 시 (compile-time 보장)

```ts
import type { GanttRendererProps } from "@/lib/gantt/contract.types";

const props: GanttRendererProps = {
  kind: "gantt.props.v1",
  contract_version: "1.0.0",
  trip: { trip_id: 1, tr_id: "TR-001", status: "IN_PROGRESS" },
  timeline: { timezone: "Asia/Dubai" },
  render_mode: "CURRENT_PLAN",
  groups: [],
  items: [],
  options: { stack: false, selectable: true, editable: { enable_drag: false, enable_resize: false } }
};
```

### 7.2 unknown 입력(스토리지/외부) 검증 후 사용

```ts
import { assertGanttRendererState } from "@/lib/gantt/contract.validate"; // server-only
import type { GanttRendererState } from "@/lib/gantt/contract.types";

export function loadStateFromDb(raw: unknown): GanttRendererState {
  assertGanttRendererState(raw);
  return raw; // 여기부터는 타입 안전
}
```

---

## 8) 최소 “검증 스크립트” (선택)

CI/로컬에서 “스키마가 깨지지 않았는지” 확인하려면, 테스트 러너 없이도 node 스크립트 하나로 충분합니다.

### `scripts/schema-smoke.ts`

```ts
import { assertGanttContract } from "@/lib/gantt/contract.validate";

const sample = {
  kind: "gantt.event.v1",
  event_id: "00000000-0000-0000-0000-000000000000",
  occurred_at: "2026-02-07T12:00:00Z",
  trip_id: 1,
  event_type: "GANTT_READY",
  payload: { timeline_library: "vis-timeline" }
};

assertGanttContract(sample);
console.log("OK");
```

`package.json`에:

```json
{
  "scripts": {
    "schema:smoke": "node --loader ts-node/esm scripts/schema-smoke.ts"
  }
}
```

(레포에 이미 ts 실행 방식이 있으면 그 방식에 맞춰 변경)

---

## 추천 결론

* **SSOT 스키마는 TS const로 관리** (`schemas/gantt/contract.v1.ts`)
* **타입은 `FromSchema` + `Extract`로 자동 생성**
* **Ajv는 server-only로 경계 검증**(기본 권장)
* 클라이언트 검증이 필요하면 **lazy import로 분리**

원하시면, 지금 레포(Next.js) 기준으로 **“어떤 경계에서 Ajv 검증을 걸어야 버그(Selected Date mismatch / View route 없음 / Trip/TR 매핑 오류)가 줄어드는지”**를 이벤트 계약에 맞춰 **구체적인 적용 위치(파일 후보)까지** 정리해드릴 수 있습니다.
