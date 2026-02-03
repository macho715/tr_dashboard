/**
 * GANTTPATCH4: Ajv runtime validation (no server-only)
 * Use in scripts (schema:smoke), client lazy import
 * For API boundaries use contract.validate.ts (server-only)
 */
import Ajv2020 from "ajv/dist/2020"
import addFormats from "ajv-formats"
import { GanttContractSchema } from "@/schemas/gantt/contract.v1"
import type {
  GanttContract,
  GanttRendererProps,
  GanttRendererState,
  GanttEvent,
} from "./contract.types"

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  useDefaults: false,
})

addFormats(ajv)

const validateContract = ajv.compile<GanttContract>(GanttContractSchema as never)

function formatAjvErrors(errors: unknown): string {
  return JSON.stringify(errors, null, 2)
}

/** Asserts x is GanttContract (union of Props|State|Event). Throws on failure. */
export function assertGanttContract(x: unknown): asserts x is GanttContract {
  if (!validateContract(x)) {
    throw new Error(
      `[GanttContract] Schema validation failed:\n${formatAjvErrors(validateContract.errors)}`
    )
  }
}

/** Asserts x is GanttRendererProps. Throws on failure. */
export function assertGanttRendererProps(
  x: unknown
): asserts x is GanttRendererProps {
  assertGanttContract(x)
  if ((x as { kind?: string }).kind !== "gantt.props.v1") {
    throw new Error(
      `[GanttRendererProps] kind mismatch: ${(x as { kind?: string }).kind}`
    )
  }
}

/** Asserts x is GanttRendererState. Throws on failure. */
export function assertGanttRendererState(
  x: unknown
): asserts x is GanttRendererState {
  assertGanttContract(x)
  if ((x as { kind?: string }).kind !== "gantt.state.v1") {
    throw new Error(
      `[GanttRendererState] kind mismatch: ${(x as { kind?: string }).kind}`
    )
  }
}

/** Asserts x is GanttEvent. Throws on failure. */
export function assertGanttEvent(x: unknown): asserts x is GanttEvent {
  assertGanttContract(x)
  if ((x as { kind?: string }).kind !== "gantt.event.v1") {
    throw new Error(
      `[GanttEvent] kind mismatch: ${(x as { kind?: string }).kind}`
    )
  }
}
