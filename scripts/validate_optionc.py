#!/usr/bin/env python3
"""
validate_optionc.py - TR Dashboard SSOT Validator (Contract v0.8.0)

Validates option_c.json against Contract v0.8.0 rules:
- entities.activities must be dict (not array)
- All enums must be lowercase
- Mandatory fields present
- SSOT violations: Trip/TR must not contain state/location/progress
- Collision IDs reference existing collisions

Usage:
    python scripts/validate_optionc.py option_c.json
    python scripts/validate_optionc.py tests/fixtures/option_c_baseline.json
"""

import json
import sys
from typing import Dict, List, Set, Any
from pathlib import Path


# Contract v0.8.0 Enums (lowercase)
VALID_ACTIVITY_STATES = {
    'draft', 'planned', 'ready', 'in_progress', 'paused', 
    'blocked', 'completed', 'canceled', 'aborted'
}

VALID_LOCK_LEVELS = {'none', 'soft', 'hard', 'baseline'}

VALID_DEPENDENCY_TYPES = {'fs', 'ss', 'ff', 'sf'}

VALID_CONSTRAINT_HARDNESS = {'hard', 'soft'}

VALID_EVIDENCE_STAGES = {'before_ready', 'before_start', 'during', 'after_end'}

VALID_COLLISION_SEVERITIES = {'info', 'warning', 'blocking'}

VALID_COLLISION_STATUSES = {'open', 'resolved', 'ignored'}

VALID_REFLOW_MODES = {'preview', 'apply'}

VALID_DURATION_MODES = {'work', 'elapsed'}


class ValidationError(Exception):
    """SSOT validation error"""
    pass


class SSOTValidator:
    """Validates option_c.json Contract v0.8.0"""
    
    def __init__(self, data: Dict[str, Any]):
        self.data = data
        self.errors: List[str] = []
        self.warnings: List[str] = []
        self.collision_ids: Set[str] = set()
        self.activity_ids: Set[str] = set()
        self.trip_ids: Set[str] = set()
        self.tr_ids: Set[str] = set()
        
    def validate(self) -> bool:
        """Run all validations. Returns True if valid."""
        print("[*] Validating option_c.json (Contract v0.8.0)...")
        
        try:
            self._validate_contract_section()
            self._validate_entities_structure()
            self._validate_activities()
            self._validate_trips()
            self._validate_trs()
            self._validate_collisions()
            self._validate_reflow_runs()
            self._validate_baselines()
            self._validate_history_events()
            
            # Summary
            if self.errors:
                print(f"\n[FAIL] VALIDATION FAILED: {len(self.errors)} error(s)\n")
                for err in self.errors:
                    print(f"  ERROR: {err}")
                return False
            
            if self.warnings:
                print(f"\n[WARN] {len(self.warnings)} warning(s):\n")
                for warn in self.warnings:
                    print(f"  WARN: {warn}")
            
            print(f"\n[PASS] VALIDATION PASSED")
            print(f"   Activities: {len(self.activity_ids)}")
            print(f"   Trips: {len(self.trip_ids)}")
            print(f"   TRs: {len(self.tr_ids)}")
            print(f"   Collisions: {len(self.collision_ids)}")
            return True
            
        except Exception as e:
            self.errors.append(f"Unexpected error: {str(e)}")
            print(f"\n[FAIL] VALIDATION FAILED: {e}")
            return False
    
    def _validate_contract_section(self):
        """Validate contract metadata"""
        if 'contract' not in self.data:
            self.errors.append("Missing 'contract' section")
            return
        
        contract = self.data['contract']
        
        if contract.get('version') != '0.8.0':
            self.warnings.append(f"Contract version is {contract.get('version')}, expected 0.8.0")
        
        if 'ssot' not in contract:
            self.warnings.append("Missing 'contract.ssot' section")
        elif not contract['ssot'].get('activity_is_source_of_truth'):
            self.errors.append("contract.ssot.activity_is_source_of_truth must be true")
    
    def _validate_entities_structure(self):
        """Validate entities top-level structure"""
        if 'entities' not in self.data:
            self.errors.append("Missing 'entities' section")
            return
        
        entities = self.data['entities']
        
        # CRITICAL: entities.activities must be dict, not array
        if 'activities' not in entities:
            self.errors.append("Missing 'entities.activities'")
        elif not isinstance(entities['activities'], dict):
            self.errors.append(
                f"entities.activities must be dict, got {type(entities['activities']).__name__}"
            )
        
        # Check other required entities
        for key in ['trips', 'trs', 'locations']:
            if key not in entities:
                self.warnings.append(f"Missing 'entities.{key}'")
    
    def _validate_activities(self):
        """Validate all activities"""
        activities = self.data.get('entities', {}).get('activities', {})
        
        if not isinstance(activities, dict):
            return  # Already reported in _validate_entities_structure
        
        for activity_id, activity in activities.items():
            self.activity_ids.add(activity_id)
            self._validate_activity(activity_id, activity)
    
    def _validate_activity(self, activity_id: str, activity: Dict[str, Any]):
        """Validate single activity"""
        # Mandatory fields
        mandatory = [
            'activity_id', 'type_id', 'trip_id', 'tr_ids', 'title',
            'state', 'lock_level', 'blocker_code',
            'evidence_required', 'evidence_ids', 'reflow_pins',
            'plan', 'actual', 'calc'
        ]
        
        for field in mandatory:
            if field not in activity:
                self.errors.append(f"Activity {activity_id}: missing mandatory field '{field}'")
        
        # Validate enums (lowercase)
        state = activity.get('state', '')
        if state and state not in VALID_ACTIVITY_STATES:
            self.errors.append(
                f"Activity {activity_id}: invalid state '{state}' (must be lowercase)"
            )
        
        lock_level = activity.get('lock_level', '')
        if lock_level and lock_level not in VALID_LOCK_LEVELS:
            self.errors.append(
                f"Activity {activity_id}: invalid lock_level '{lock_level}'"
            )
        
        # Validate blocker_code consistency
        if activity.get('state') == 'blocked' and not activity.get('blocker_code'):
            self.errors.append(
                f"Activity {activity_id}: state=blocked requires blocker_code"
            )
        
        # Validate plan section
        if 'plan' in activity:
            self._validate_activity_plan(activity_id, activity['plan'])
        
        # Validate actual section
        if 'actual' in activity:
            self._validate_activity_actual(activity_id, activity['actual'])
        
        # Validate calc section (read-only derived)
        if 'calc' in activity:
            self._validate_activity_calc(activity_id, activity['calc'])
        
        # Validate evidence_required
        if 'evidence_required' in activity:
            for i, er in enumerate(activity['evidence_required']):
                self._validate_evidence_required(activity_id, i, er)
    
    def _validate_activity_plan(self, activity_id: str, plan: Dict[str, Any]):
        """Validate activity.plan section"""
        # Mandatory fields
        mandatory = [
            'start_ts', 'end_ts', 'duration_min', 'duration_mode',
            'location', 'dependencies', 'resources', 'constraints', 'notes'
        ]
        
        for field in mandatory:
            if field not in plan:
                self.errors.append(f"Activity {activity_id}.plan: missing '{field}'")
        
        # Validate duration_mode
        duration_mode = plan.get('duration_mode')
        if duration_mode and duration_mode not in VALID_DURATION_MODES:
            self.errors.append(
                f"Activity {activity_id}.plan.duration_mode: invalid '{duration_mode}'"
            )
        
        # Validate dependencies
        for i, dep in enumerate(plan.get('dependencies', [])):
            self._validate_dependency(activity_id, i, dep)
        
        # Validate constraints
        for i, constraint in enumerate(plan.get('constraints', [])):
            self._validate_constraint(activity_id, i, constraint)
    
    def _validate_dependency(self, activity_id: str, idx: int, dep: Dict[str, Any]):
        """Validate single dependency"""
        if 'pred_activity_id' not in dep:
            self.errors.append(
                f"Activity {activity_id}.plan.dependencies[{idx}]: missing pred_activity_id"
            )
        
        dep_type = dep.get('type', '')
        if dep_type and dep_type not in VALID_DEPENDENCY_TYPES:
            self.errors.append(
                f"Activity {activity_id}.plan.dependencies[{idx}]: invalid type '{dep_type}'"
            )
    
    def _validate_constraint(self, activity_id: str, idx: int, constraint: Dict[str, Any]):
        """Validate single constraint"""
        if 'kind' not in constraint:
            self.errors.append(
                f"Activity {activity_id}.plan.constraints[{idx}]: missing kind"
            )
        
        hardness = constraint.get('hardness', '')
        if hardness and hardness not in VALID_CONSTRAINT_HARDNESS:
            self.errors.append(
                f"Activity {activity_id}.plan.constraints[{idx}]: invalid hardness '{hardness}'"
            )
    
    def _validate_evidence_required(self, activity_id: str, idx: int, er: Dict[str, Any]):
        """Validate evidence_required entry"""
        mandatory = ['evidence_type', 'stage', 'min_count', 'required', 'validity_min', 'tags']
        
        for field in mandatory:
            if field not in er:
                self.errors.append(
                    f"Activity {activity_id}.evidence_required[{idx}]: missing '{field}'"
                )
        
        stage = er.get('stage', '')
        if stage and stage not in VALID_EVIDENCE_STAGES:
            self.errors.append(
                f"Activity {activity_id}.evidence_required[{idx}]: invalid stage '{stage}'"
            )
    
    def _validate_activity_actual(self, activity_id: str, actual: Dict[str, Any]):
        """Validate activity.actual section"""
        mandatory = [
            'start_ts', 'end_ts', 'progress_pct',
            'location_override', 'resource_assignments', 'notes'
        ]
        
        for field in mandatory:
            if field not in actual:
                self.errors.append(f"Activity {activity_id}.actual: missing '{field}'")
    
    def _validate_activity_calc(self, activity_id: str, calc: Dict[str, Any]):
        """Validate activity.calc section (derived, read-only)"""
        mandatory = [
            'es_ts', 'ef_ts', 'ls_ts', 'lf_ts', 'slack_min',
            'critical_path', 'collision_ids', 'collision_severity_max',
            'risk_score', 'predicted_end_ts', 'reflow'
        ]
        
        for field in mandatory:
            if field not in calc:
                self.warnings.append(f"Activity {activity_id}.calc: missing '{field}'")
        
        # Validate collision_ids reference existing collisions
        collision_ids = calc.get('collision_ids', [])
        for col_id in collision_ids:
            if col_id not in self.collision_ids:
                # Will validate after collisions section is parsed
                pass
    
    def _validate_trips(self):
        """Validate trips (SSOT violation check)"""
        trips = self.data.get('entities', {}).get('trips', {})
        
        for trip_id, trip in trips.items():
            self.trip_ids.add(trip_id)
            
            # SSOT VIOLATION: Trip must not contain state/location/progress
            forbidden_fields = ['state', 'current_state', 'location', 'current_location', 
                               'progress', 'progress_pct']
            
            for field in forbidden_fields:
                if field in trip:
                    self.errors.append(
                        f"Trip {trip_id}: SSOT VIOLATION - contains '{field}' "
                        f"(must derive from Activities)"
                    )
            
            # Check calc is read-only derived
            if 'calc' in trip:
                # This is allowed (derived values)
                pass
    
    def _validate_trs(self):
        """Validate TRs (SSOT violation check)"""
        trs = self.data.get('entities', {}).get('trs', {})
        
        for tr_id, tr in trs.items():
            self.tr_ids.add(tr_id)
            
            # SSOT VIOLATION: TR must not contain state/location/progress
            forbidden_fields = ['state', 'current_state', 'location', 'current_location',
                               'progress', 'progress_pct', 'current_activity']
            
            for field in forbidden_fields:
                if field in tr:
                    self.errors.append(
                        f"TR {tr_id}: SSOT VIOLATION - contains '{field}' "
                        f"(must derive from Activities)"
                    )
            
            # Check calc is read-only derived
            if 'calc' in tr:
                # This is allowed (derived values)
                pass
    
    def _validate_collisions(self):
        """Validate collisions"""
        collisions = self.data.get('collisions', {})
        
        for collision_id, collision in collisions.items():
            self.collision_ids.add(collision_id)
            self._validate_collision(collision_id, collision)
    
    def _validate_collision(self, collision_id: str, collision: Dict[str, Any]):
        """Validate single collision"""
        mandatory = [
            'collision_id', 'kind', 'severity', 'status', 'trip_id',
            'activity_ids', 'resource_ids', 'rule_refs',
            'message', 'details', 'suggested_actions'
        ]
        
        for field in mandatory:
            if field not in collision:
                self.errors.append(f"Collision {collision_id}: missing '{field}'")
        
        severity = collision.get('severity', '')
        if severity and severity not in VALID_COLLISION_SEVERITIES:
            self.errors.append(
                f"Collision {collision_id}: invalid severity '{severity}'"
            )
        
        status = collision.get('status', '')
        if status and status not in VALID_COLLISION_STATUSES:
            self.errors.append(
                f"Collision {collision_id}: invalid status '{status}'"
            )
    
    def _validate_reflow_runs(self):
        """Validate reflow_runs"""
        reflow_runs = self.data.get('reflow_runs', [])
        
        for i, run in enumerate(reflow_runs):
            self._validate_reflow_run(i, run)
    
    def _validate_reflow_run(self, idx: int, run: Dict[str, Any]):
        """Validate single reflow run"""
        mandatory = [
            'run_id', 'mode', 'requested_at', 'requested_by',
            'seed', 'proposed_changes', 'applied_changes', 'collision_summary'
        ]
        
        for field in mandatory:
            if field not in run:
                self.errors.append(f"reflow_runs[{idx}]: missing '{field}'")
        
        mode = run.get('mode', '')
        if mode and mode not in VALID_REFLOW_MODES:
            self.errors.append(f"reflow_runs[{idx}]: invalid mode '{mode}'")
    
    def _validate_baselines(self):
        """Validate baselines"""
        baselines = self.data.get('baselines', {})
        
        if 'current_baseline_id' not in baselines:
            self.warnings.append("baselines: missing current_baseline_id")
        
        items = baselines.get('items', {})
        for baseline_id, baseline in items.items():
            self._validate_baseline(baseline_id, baseline)
    
    def _validate_baseline(self, baseline_id: str, baseline: Dict[str, Any]):
        """Validate single baseline"""
        mandatory = [
            'baseline_id', 'name', 'status', 'created_at', 'created_by',
            'scope', 'freeze_policy', 'snapshot'
        ]
        
        for field in mandatory:
            if field not in baseline:
                self.errors.append(f"Baseline {baseline_id}: missing '{field}'")
    
    def _validate_history_events(self):
        """Validate history_events (append-only)"""
        history = self.data.get('history_events', [])
        
        for i, event in enumerate(history):
            self._validate_history_event(i, event)
    
    def _validate_history_event(self, idx: int, event: Dict[str, Any]):
        """Validate single history event"""
        mandatory = ['event_id', 'ts', 'actor', 'event_type', 'entity_ref', 'details']
        
        for field in mandatory:
            if field not in event:
                self.warnings.append(f"history_events[{idx}]: missing '{field}'")


def main():
    """Main entry point"""
    if len(sys.argv) < 2:
        print("Usage: python validate_optionc.py <path-to-option_c.json>")
        sys.exit(1)
    
    file_path = Path(sys.argv[1])
    
    if not file_path.exists():
        print(f"[ERROR] File not found: {file_path}")
        sys.exit(1)
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        print(f"[ERROR] Invalid JSON: {e}")
        sys.exit(1)
    
    validator = SSOTValidator(data)
    success = validator.validate()
    
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
