/**
 * Phase 7 T7.8: Why panel tests
 * - Suggested action button generates preview (onApplyAction called)
 */

// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WhyPanel } from '../WhyPanel'
import type { ScheduleConflict, SuggestedAction } from '@/lib/ssot/schedule'

const mockAction: SuggestedAction = {
  kind: 'shift_activity',
  label: 'Shift A1000 after A1020',
  params: { activity_id: 'A1000', new_start: '2026-02-04' },
}

const mockCollisionWithActions: ScheduleConflict = {
  type: 'RESOURCE',
  activity_id: 'A1000',
  message: 'Resource conflict',
  severity: 'warn',
  suggested_actions: [mockAction],
}

describe('Why Panel (T7.8)', () => {
  describe('Suggested action button generates preview', () => {
    it('calls onApplyAction with collision and action when suggested action button clicked', () => {
      const onApplyAction = vi.fn()
      render(
        <WhyPanel
          collision={mockCollisionWithActions}
          onClose={() => {}}
          onApplyAction={onApplyAction}
        />
      )

      const actionButton = screen.getByRole('button', { name: mockAction.label })
      fireEvent.click(actionButton)

      expect(onApplyAction).toHaveBeenCalledWith(mockCollisionWithActions, mockAction)
    })

    it('renders suggested actions when collision has suggested_actions', () => {
      render(
        <WhyPanel collision={mockCollisionWithActions} onClose={() => {}} />
      )

      expect(screen.getByText('Suggested actions')).toBeTruthy()
      expect(screen.getByRole('button', { name: mockAction.label })).toBeTruthy()
    })
  })
})
