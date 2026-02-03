/**
 * View Mode store tests (Phase 4 T4.5)
 *
 * - Mode switcher updates store
 * - Approval mode: canApplyReflow = false
 * - Date cursor change triggers preview
 * - Filter state updates
 */

import { describe, it, expect } from 'vitest'
import {
  viewModeReducer,
  DEFAULT_STATE,
  type ViewModeState,
} from '../stores/view-mode-store'

describe('view-mode-store', () => {
  it('provides default state', () => {
    expect(DEFAULT_STATE.mode).toBe('live')
    expect(DEFAULT_STATE.dateCursor).toBeDefined()
    expect(DEFAULT_STATE.selectedTripId).toBeNull()
    expect(DEFAULT_STATE.selectedTrIds).toEqual([])
    expect(DEFAULT_STATE.riskOverlay).toBe('none')
  })

  it('mode switcher updates store', () => {
    let state: ViewModeState = DEFAULT_STATE
    state = viewModeReducer(state, { type: 'SET_MODE', payload: 'history' })
    expect(state.mode).toBe('history')
    state = viewModeReducer(state, { type: 'SET_MODE', payload: 'approval' })
    expect(state.mode).toBe('approval')
    state = viewModeReducer(state, { type: 'SET_MODE', payload: 'compare' })
    expect(state.mode).toBe('compare')
    state = viewModeReducer(state, { type: 'SET_MODE', payload: 'live' })
    expect(state.mode).toBe('live')
  })

  it('approval mode implies canApplyReflow = false', () => {
    const state = viewModeReducer(DEFAULT_STATE, { type: 'SET_MODE', payload: 'approval' })
    expect(state.mode).toBe('approval')
    // canApplyReflow is derived: mode === 'live' only
    const canApplyReflow = state.mode === 'live'
    expect(canApplyReflow).toBe(false)
  })

  it('date cursor change updates store', () => {
    const newCursor = '2026-02-15T10:00:00+04:00'
    const state = viewModeReducer(DEFAULT_STATE, { type: 'SET_DATE_CURSOR', payload: newCursor })
    expect(state.dateCursor).toBe(newCursor)
  })

  it('filter state updates', () => {
    let state = viewModeReducer(DEFAULT_STATE, { type: 'SET_FILTERS', payload: { collisions: true } })
    expect(state.filters.collisions).toBe(true)
    state = viewModeReducer(state, { type: 'SET_FILTERS', payload: { states: ['in_progress'] } })
    expect(state.filters.states).toEqual(['in_progress'])
  })

  it('selected trip and TR update', () => {
    let state = viewModeReducer(DEFAULT_STATE, { type: 'SET_SELECTED_TRIP', payload: 'TRIP_001' })
    expect(state.selectedTripId).toBe('TRIP_001')
    state = viewModeReducer(state, { type: 'SET_SELECTED_TRS', payload: ['TR_001', 'TR_002'] })
    expect(state.selectedTrIds).toEqual(['TR_001', 'TR_002'])
  })

  it('reset restores default', () => {
    let state = viewModeReducer(DEFAULT_STATE, { type: 'SET_MODE', payload: 'approval' })
    state = viewModeReducer(state, { type: 'SET_SELECTED_TRIP', payload: 'T1' })
    state = viewModeReducer(state, { type: 'RESET' })
    expect(state.mode).toBe('live')
    expect(state.selectedTripId).toBeNull()
  })
})
