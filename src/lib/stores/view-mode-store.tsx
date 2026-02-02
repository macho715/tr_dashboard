'use client'

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type ReactNode,
} from 'react'
import type { ActivityState } from '@/src/types/ssot'

export type ViewMode = 'live' | 'history' | 'approval' | 'compare'

export type RiskOverlay = 'none' | 'all' | 'wx' | 'resource' | 'permit'

export interface ViewModeFilters {
  states: ActivityState[]
  collisions: boolean
  resources: string[]
  routeSegments: string[]
}

export interface ViewModeState {
  mode: ViewMode
  dateCursor: string // ISO 8601 + TZ
  selectedTripId: string | null
  selectedTrIds: string[]
  riskOverlay: RiskOverlay
  filters: ViewModeFilters
  searchQuery: string
}

type ViewModeAction =
  | { type: 'SET_MODE'; payload: ViewMode }
  | { type: 'SET_DATE_CURSOR'; payload: string }
  | { type: 'SET_SELECTED_TRIP'; payload: string | null }
  | { type: 'SET_SELECTED_TRS'; payload: string[] }
  | { type: 'SET_RISK_OVERLAY'; payload: RiskOverlay }
  | { type: 'SET_FILTERS'; payload: Partial<ViewModeFilters> }
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'RESET' }

export const DEFAULT_STATE: ViewModeState = {
  mode: 'live',
  dateCursor: new Date().toISOString(),
  selectedTripId: null,
  selectedTrIds: [],
  riskOverlay: 'none',
  filters: {
    states: [],
    collisions: false,
    resources: [],
    routeSegments: [],
  },
  searchQuery: '',
}

export function viewModeReducer(state: ViewModeState, action: ViewModeAction): ViewModeState {
  switch (action.type) {
    case 'SET_MODE':
      return { ...state, mode: action.payload }
    case 'SET_DATE_CURSOR':
      return { ...state, dateCursor: action.payload }
    case 'SET_SELECTED_TRIP':
      return { ...state, selectedTripId: action.payload }
    case 'SET_SELECTED_TRS':
      return { ...state, selectedTrIds: action.payload }
    case 'SET_RISK_OVERLAY':
      return { ...state, riskOverlay: action.payload }
    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...action.payload } }
    case 'SET_SEARCH':
      return { ...state, searchQuery: action.payload }
    case 'RESET':
      return DEFAULT_STATE
    default:
      return state
  }
}

const ViewModeContext = createContext<{
  state: ViewModeState
  dispatch: React.Dispatch<ViewModeAction>
  setMode: (mode: ViewMode) => void
  setDateCursor: (cursor: string) => void
  setSelectedTrip: (tripId: string | null) => void
  setSelectedTrs: (trIds: string[]) => void
  setRiskOverlay: (overlay: RiskOverlay) => void
  setFilters: (filters: Partial<ViewModeFilters>) => void
  setSearch: (query: string) => void
  canEdit: boolean
  canApplyReflow: boolean
  canUploadEvidence: boolean
} | null>(null)

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(viewModeReducer, DEFAULT_STATE)

  const setMode = useCallback((mode: ViewMode) => dispatch({ type: 'SET_MODE', payload: mode }), [])
  const setDateCursor = useCallback(
    (cursor: string) => dispatch({ type: 'SET_DATE_CURSOR', payload: cursor }),
    []
  )
  const setSelectedTrip = useCallback(
    (tripId: string | null) => dispatch({ type: 'SET_SELECTED_TRIP', payload: tripId }),
    []
  )
  const setSelectedTrs = useCallback(
    (trIds: string[]) => dispatch({ type: 'SET_SELECTED_TRS', payload: trIds }),
    []
  )
  const setRiskOverlay = useCallback(
    (overlay: RiskOverlay) => dispatch({ type: 'SET_RISK_OVERLAY', payload: overlay }),
    []
  )
  const setFilters = useCallback(
    (filters: Partial<ViewModeFilters>) => dispatch({ type: 'SET_FILTERS', payload: filters }),
    []
  )
  const setSearch = useCallback(
    (query: string) => dispatch({ type: 'SET_SEARCH', payload: query }),
    []
  )

  // Mode behavior (patch §2.2, §5.4)
  const canEdit = state.mode === 'live'
  const canApplyReflow = state.mode === 'live' // Limited (approval required)
  const canUploadEvidence = state.mode === 'live'

  return (
    <ViewModeContext.Provider
      value={{
        state,
        dispatch,
        setMode,
        setDateCursor,
        setSelectedTrip,
        setSelectedTrs,
        setRiskOverlay,
        setFilters,
        setSearch,
        canEdit,
        canApplyReflow,
        canUploadEvidence,
      }}
    >
      {children}
    </ViewModeContext.Provider>
  )
}

export function useViewMode() {
  const ctx = useContext(ViewModeContext)
  if (!ctx) throw new Error('useViewMode must be used within ViewModeProvider')
  return ctx
}

/** Optional hook - returns null when outside ViewModeProvider */
export function useViewModeOptional() {
  return useContext(ViewModeContext)
}
