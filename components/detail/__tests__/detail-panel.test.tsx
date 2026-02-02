/**
 * Phase 7 T7.8: Detail panel tests
 * - Collision card click expands Why panel (onCollisionClick called)
 */

// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CollisionCard } from '../CollisionCard'
import { CollisionTray } from '../CollisionTray'
import type { ScheduleConflict } from '@/lib/ssot/schedule'

const mockCollision: ScheduleConflict = {
  type: 'RESOURCE',
  activity_id: 'A1000',
  message: 'Resource conflict: CRANE is required by both A1000 and A1020',
  severity: 'warn',
  related_activity_ids: ['A1000', 'A1020'],
  resource: 'CRANE',
}

describe('Detail Panel (T7.8)', () => {
  describe('Collision card click expands Why panel', () => {
    it('calls onCollisionClick when CollisionCard is clicked', async () => {
      const onCollisionClick = vi.fn()
      render(
        <CollisionCard collision={mockCollision} onClick={() => onCollisionClick(mockCollision)} />
      )

      const card = screen.getByTestId('collision-card')
      fireEvent.click(card)

      expect(onCollisionClick).toHaveBeenCalledTimes(1)
    })

    it('CollisionTray passes collision to onCollisionClick when card clicked', async () => {
      const onCollisionClick = vi.fn()
      render(
        <CollisionTray
          collisions={[mockCollision]}
          onCollisionClick={onCollisionClick}
        />
      )

      const card = screen.getByTestId('collision-card')
      fireEvent.click(card)

      expect(onCollisionClick).toHaveBeenCalledWith(mockCollision)
    })
  })
})
