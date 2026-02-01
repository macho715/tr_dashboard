#!/usr/bin/env tsx
/**
 * AGI Schedule → Contract v0.8.0 Migration Script
 * 
 * Transforms option_c.json from AGI Schedule format to Contract v0.8.0 format
 * Reference: docs/plan/contract-v0.8.0-migration-plan.md
 * Contract: docs/contract/contract-optionc-v0.8.0.md (if exists)
 * 
 * Usage:
 *   pnpm tsx scripts/migrate-to-v0.8.0.ts [--dry-run] [--output <path>]
 */

import * as fs from 'fs'
import * as path from 'path'

// ============================================================================
// Types (Contract v0.8.0)
// ============================================================================

type ActivityState = 
  | 'draft' | 'planned' | 'committed' | 'ready' 
  | 'in_progress' | 'paused' | 'blocked' 
  | 'done' | 'verified' | 'cancelled' | 'aborted'

type LockLevel = 'none' | 'soft' | 'hard' | 'baseline'

type BlockerCode = 'NONE' | 'WEATHER' | 'PTW' | 'CERT' | 'RESOURCE' | 'LINKSPAN' | 'BARGE'

type DependencyType = 'FS' | 'SS' | 'FF' | 'SF'

interface AGIActivity {
  level1: string
  level2: string | null
  activity_id: string | null
  activity_name: string
  duration: number
  planned_start: string
  planned_finish: string
}

interface ContractActivity {
  activity_id: string
  trip_id: string
  tr_id: string | null
  type: string
  title: string
  state: ActivityState
  lock_level: LockLevel
  reflow_pins: any[]
  blocker_code: BlockerCode
  blockers: any[]
  location: {
    from_node_id: string | null
    to_node_id: string | null
  }
  plan: {
    start_ts: string
    duration_min: number
    end_ts: string
    priority: number
  }
  actual: {
    start_ts: string | null
    end_ts: string | null
    progress_pct: number | null
  }
  dependencies: Array<{
    from_activity_id: string
    to_activity_id: string
    type: DependencyType
    lag_min: number
  }>
  constraints: any[]
  resources: {
    required: any[]
    assigned: any[]
  }
  evidence_required: any[]
  evidence: any[]
  calc: {
    es_ts: string
    ef_ts: string
    ls_ts: string
    lf_ts: string
    total_float_min: number
    free_float_min: number
    is_critical_path: boolean
    reflow_shift_min: number
    collision_ids: string[]
    collision_count: number
    slack_bucket: string
  }
}

interface ContractV08 {
  schema: {
    name: string
    version: string
    scenario_id: string
    timezone: string
  }
  policy: {
    view_modes: string[]
    reflow: {
      snap_direction: string
      tie_break: string[]
      calendar_granularity_min: number
    }
  }
  catalog: {
    enums: {
      activity_state: ActivityState[]
      lock_level: LockLevel[]
      blocker_code: BlockerCode[]
      dependency_type: DependencyType[]
      evidence_stage: string[]
      collision_severity: string[]
      collision_kind: string[]
    }
    blocker_codes: Record<string, { code: string; description: string }>
    evidence_types: Record<string, any>
    activity_types: Record<string, any>
    constraint_rules: Record<string, any>
    resources: Record<string, any>
  }
  entities: {
    trips: Record<string, any>
    trs: Record<string, any>
    activities: Record<string, ContractActivity>
  }
  collisions: Record<string, any>
  reflow_runs: any[]
  baselines: {
    current_baseline_id: string | null
    items: Record<string, any>
  }
  history_events: any[]
}

// ============================================================================
// Utility Functions
// ============================================================================

const TIMEZONE = 'Asia/Dubai'
const TIMEZONE_OFFSET = '+04:00'

function convertDateToISO(dateStr: string, isEndOfDay = false): string {
  // AGI: "2026-01-26" → Contract: "2026-01-26T00:00:00+04:00"
  if (!dateStr) return ''
  
  if (isEndOfDay) {
    return `${dateStr}T23:59:59${TIMEZONE_OFFSET}`
  }
  return `${dateStr}T00:00:00${TIMEZONE_OFFSET}`
}

function convertDurationToMinutes(durationDays: number): number {
  // AGI: 1.0 (days) → Contract: 1440 (minutes)
  return Math.round(durationDays * 1440)
}

function inferActivityType(level1: string, level2: string | null): string {
  // Map AGI level1/level2 to Contract activity type
  const l1 = level1?.toUpperCase() || ''
  const l2 = level2?.toUpperCase() || ''
  
  if (l1 === 'MOBILIZATION') return 'mobilization'
  if (l1 === 'DEMOBILIZATION') return 'demobilization'
  
  if (l2.includes('LOAD-OUT')) return 'load_out'
  if (l2.includes('LOAD OUT')) return 'load_out'
  if (l2.includes('LOADOUT')) return 'load_out'
  
  if (l2.includes('TRANSIT')) return 'transit'
  if (l2.includes('SAIL')) return 'transit'
  
  if (l2.includes('LOAD-IN')) return 'load_in'
  if (l2.includes('LOAD IN')) return 'load_in'
  if (l2.includes('LOADIN')) return 'load_in'
  
  if (l2.includes('JACK')) return 'jack_down'
  
  return 'transport'
}

function inferTripAndTR(level1: string, activityId: string | null): { tripId: string; trId: string | null } {
  const l1 = level1?.toUpperCase() || ''
  
  if (l1 === 'MOBILIZATION') {
    return { tripId: 'TRIP_00', trId: null }
  }
  
  if (l1 === 'DEMOBILIZATION') {
    return { tripId: 'TRIP_99', trId: null }
  }
  
  // Extract TR number from level1 (e.g., "TR1" → 1)
  const trMatch = l1.match(/TR[_\s]?(\d+)/i)
  if (trMatch) {
    const trNum = parseInt(trMatch[1], 10)
    return {
      tripId: `TRIP_${String(trNum).padStart(2, '0')}`,
      trId: `TR_${String(trNum).padStart(2, '0')}`
    }
  }
  
  // Fallback: try to extract from activity_id
  if (activityId) {
    const idMatch = activityId.match(/[A-Z]?(\d+)/)
    if (idMatch) {
      const num = parseInt(idMatch[1], 10)
      const tripNum = Math.floor(num / 1000) || 1
      return {
        tripId: `TRIP_${String(tripNum).padStart(2, '0')}`,
        trId: `TR_${String(tripNum).padStart(2, '0')}`
      }
    }
  }
  
  return { tripId: 'TRIP_01', trId: 'TR_01' }
}

function generateActivityId(index: number, existing: string | null): string {
  // If AGI has activity_id, use it; otherwise generate
  if (existing && existing.trim() !== '') {
    return existing.trim()
  }
  return `A${String(index + 1000).padStart(4, '0')}`
}

// ============================================================================
// Migration Logic
// ============================================================================

function migrateAGIToContractV08(agiData: any): ContractV08 {
  console.log('🔄 Starting migration: AGI Schedule → Contract v0.8.0')
  console.log(`   Activities: ${agiData.activities?.length || 0}`)
  
  const contract: ContractV08 = {
    schema: {
      name: 'TR Dashboard SSOT',
      version: '0.8.0',
      scenario_id: 'agi-tr-1-6',
      timezone: TIMEZONE
    },
    policy: {
      view_modes: ['live', 'history', 'approval', 'compare'],
      reflow: {
        snap_direction: 'forward',
        tie_break: ['lock_level', 'priority', 'planned_start', 'activity_id'],
        calendar_granularity_min: 60
      }
    },
    catalog: {
      enums: {
        activity_state: [
          'draft', 'planned', 'committed', 'ready',
          'in_progress', 'paused', 'blocked',
          'done', 'verified', 'cancelled', 'aborted'
        ],
        lock_level: ['none', 'soft', 'hard', 'baseline'],
        blocker_code: ['NONE', 'WEATHER', 'PTW', 'CERT', 'RESOURCE', 'LINKSPAN', 'BARGE'],
        dependency_type: ['FS', 'SS', 'FF', 'SF'],
        evidence_stage: ['before_start', 'before_complete', 'after_complete'],
        collision_severity: ['minor', 'major', 'blocking'],
        collision_kind: [
          'dependency_cycle', 'dependency_violation', 'constraint_window_violation',
          'resource_overallocated', 'resource_unavailable', 'spatial_conflict',
          'baseline_conflict', 'data_incomplete', 'risk_hold'
        ]
      },
      blocker_codes: {
        'NONE': { code: 'NONE', description: 'No blocker' },
        'WEATHER': { code: 'WEATHER', description: 'Weather constraint' },
        'PTW': { code: 'PTW', description: 'Permit to Work required' },
        'CERT': { code: 'CERT', description: 'Certificate required' },
        'RESOURCE': { code: 'RESOURCE', description: 'Resource unavailable' },
        'LINKSPAN': { code: 'LINKSPAN', description: 'Linkspan unavailable' },
        'BARGE': { code: 'BARGE', description: 'Barge unavailable' }
      },
      evidence_types: {},
      activity_types: {},
      constraint_rules: {},
      resources: {}
    },
    entities: {
      trips: {},
      trs: {},
      activities: {}
    },
    collisions: {},
    reflow_runs: [],
    baselines: {
      current_baseline_id: null,
      items: {}
    },
    history_events: []
  }
  
  // Phase 1: Transform activities
  const activities = agiData.activities || []
  const tripSet = new Set<string>()
  const trSet = new Set<string>()
  
  activities.forEach((agiAct: AGIActivity, index: number) => {
    // Skip summary rows (no activity_id and duration > 5 days)
    if (!agiAct.activity_id && agiAct.duration > 5) {
      console.log(`   ⏭️  Skipping summary row: ${agiAct.activity_name}`)
      return
    }
    
    const activityId = generateActivityId(index, agiAct.activity_id)
    const { tripId, trId } = inferTripAndTR(agiAct.level1, activityId)
    const activityType = inferActivityType(agiAct.level1, agiAct.level2)
    
    tripSet.add(tripId)
    if (trId) trSet.add(trId)
    
    const startTs = convertDateToISO(agiAct.planned_start, false)
    const endTs = convertDateToISO(agiAct.planned_finish, true)
    const durationMin = convertDurationToMinutes(agiAct.duration)
    
    const contractAct: ContractActivity = {
      activity_id: activityId,
      trip_id: tripId,
      tr_id: trId,
      type: activityType,
      title: agiAct.activity_name || 'Untitled Activity',
      state: 'planned',
      lock_level: 'none',
      reflow_pins: [],
      blocker_code: 'NONE',
      blockers: [],
      location: {
        from_node_id: null,
        to_node_id: null
      },
      plan: {
        start_ts: startTs,
        duration_min: durationMin,
        end_ts: endTs,
        priority: 100
      },
      actual: {
        start_ts: null,
        end_ts: null,
        progress_pct: null
      },
      dependencies: [],
      constraints: [],
      resources: {
        required: [],
        assigned: []
      },
      evidence_required: [],
      evidence: [],
      calc: {
        es_ts: startTs,
        ef_ts: endTs,
        ls_ts: startTs,
        lf_ts: endTs,
        total_float_min: 0,
        free_float_min: 0,
        is_critical_path: false,
        reflow_shift_min: 0,
        collision_ids: [],
        collision_count: 0,
        slack_bucket: 'none'
      }
    }
    
    contract.entities.activities[activityId] = contractAct
  })
  
  // Create trips
  tripSet.forEach(tripId => {
    contract.entities.trips[tripId] = {
      trip_id: tripId,
      name: `Trip ${tripId.replace('TRIP_', '')}`,
      sequence: parseInt(tripId.replace('TRIP_', ''), 10),
      tr_ids: [],
      activity_ids: []
    }
  })
  
  // Create TRs
  trSet.forEach(trId => {
    const trNum = trId.replace('TR_', '')
    const tripId = `TRIP_${trNum}`
    
    contract.entities.trs[trId] = {
      tr_id: trId,
      trip_id: tripId,
      name: `TR ${trNum}`,
      sequence: parseInt(trNum, 10),
      activity_ids: []
    }
    
    if (contract.entities.trips[tripId]) {
      contract.entities.trips[tripId].tr_ids.push(trId)
    }
  })
  
  // Link activities to trips/TRs
  Object.values(contract.entities.activities).forEach(act => {
    if (contract.entities.trips[act.trip_id]) {
      contract.entities.trips[act.trip_id].activity_ids.push(act.activity_id)
    }
    
    if (act.tr_id && contract.entities.trs[act.tr_id]) {
      contract.entities.trs[act.tr_id].activity_ids.push(act.activity_id)
    }
  })
  
  console.log(`✅ Migration complete:`)
  console.log(`   Activities: ${Object.keys(contract.entities.activities).length}`)
  console.log(`   Trips: ${Object.keys(contract.entities.trips).length}`)
  console.log(`   TRs: ${Object.keys(contract.entities.trs).length}`)
  
  return contract
}

// ============================================================================
// Main
// ============================================================================

function main() {
  const args = process.argv.slice(2)
  const isDryRun = args.includes('--dry-run')
  const outputIndex = args.indexOf('--output')
  const outputPath = outputIndex >= 0 && args[outputIndex + 1]
    ? args[outputIndex + 1]
    : path.join(__dirname, '../data/schedule/option_c_v0.8.0.json')
  
  const inputPath = path.join(__dirname, '../data/schedule/option_c.json')
  
  console.log('📋 Contract v0.8.0 Migration')
  console.log(`   Input:  ${inputPath}`)
  console.log(`   Output: ${outputPath}`)
  console.log(`   Dry run: ${isDryRun ? 'YES' : 'NO'}`)
  console.log('')
  
  // Read AGI Schedule
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Error: Input file not found: ${inputPath}`)
    process.exit(1)
  }
  
  const agiData = JSON.parse(fs.readFileSync(inputPath, 'utf-8'))
  
  // Migrate
  const contractData = migrateAGIToContractV08(agiData)
  
  // Write output
  if (!isDryRun) {
    const outputDir = path.dirname(outputPath)
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(contractData, null, 2), 'utf-8')
    console.log(`\n✅ Written to: ${outputPath}`)
  } else {
    console.log('\n🔍 Dry run: No files written')
    console.log('\nSample activity:')
    const sampleId = Object.keys(contractData.entities.activities)[0]
    console.log(JSON.stringify(contractData.entities.activities[sampleId], null, 2))
  }
  
  console.log('\n📌 Next steps:')
  console.log('   1. Validate: VALIDATION_MODE=CONTRACT python .cursor/skills/tr-dashboard-ssot-guard/scripts/validate_optionc.py')
  console.log('   2. Backup original: cp data/schedule/option_c.json data/schedule/option_c_legacy.json')
  console.log('   3. Replace: cp data/schedule/option_c_v0.8.0.json data/schedule/option_c.json')
  console.log('   4. Test: pnpm build')
}

if (require.main === module) {
  main()
}
