/**
 * View Mode Permission Rules (patch.md §5.4, AGENTS.md §1.4)
 * Live/History/Approval/Compare mode access control
 */

export type ViewMode = "live" | "history" | "approval" | "compare"

export interface ViewModePermissions {
  canModifyState: boolean
  canApplyReflow: boolean
  canAttachEvidence: boolean
  canExport: boolean
  description: string
}

/**
 * View Mode Permissions Matrix (patch.md §5.4)
 */
export const VIEW_MODE_PERMISSIONS: Record<ViewMode, ViewModePermissions> = {
  live: {
    canModifyState: true, // Role-based (operator, engineer)
    canApplyReflow: true, // With approval for critical changes
    canAttachEvidence: true,
    canExport: true,
    description: "Live operational mode: full access for authorized users",
  },
  history: {
    canModifyState: false,
    canApplyReflow: false,
    canAttachEvidence: false, // View only (read-only)
    canExport: true,
    description: "History/audit mode: read-only, as-of reconstruction",
  },
  approval: {
    canModifyState: false,
    canApplyReflow: false, // CRITICAL: Apply is forbidden in Approval mode
    canAttachEvidence: false, // View only (check required evidence)
    canExport: true, // Sign-off/approval reports
    description: "Approval mode: read-only, approval/sign-off only",
  },
  compare: {
    canModifyState: false,
    canApplyReflow: false,
    canAttachEvidence: false,
    canExport: true,
    description: "Compare mode: overlay delta, SSOT(option_c) is baseline",
  },
}

/**
 * Check if action is permitted in given mode
 */
export function isActionPermitted(
  mode: ViewMode,
  action: keyof Omit<ViewModePermissions, "description">
): boolean {
  return VIEW_MODE_PERMISSIONS[mode][action]
}

/**
 * Validate reflow apply (AGENTS.md: Approval mode forbids Apply)
 */
export function canApplyReflowInMode(mode: ViewMode): boolean {
  if (mode === "approval") {
    throw new Error(
      "[SSOT Violation] Apply is forbidden in Approval mode (read-only)"
    )
  }
  return isActionPermitted(mode, "canApplyReflow")
}
