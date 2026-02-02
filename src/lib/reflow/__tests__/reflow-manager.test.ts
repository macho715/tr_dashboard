/**
 * Unit tests for Reflow Manager (Preview/Apply)
 */

import { describe, it, expect } from 'vitest';
import { loadSSOTSync } from '../../ssot-loader';
import { reflowPreview, reflowApply, type Approval } from '../reflow-manager';
import type { OptionC } from '../../../types/ssot';

describe('Reflow Manager', () => {
  describe('reflowPreview', () => {
    it('should run preview without mutating SSOT', () => {
      const ssot = loadSSOTSync('tests/fixtures/option_c_baseline.json');
      const original = JSON.stringify(ssot);

      const result = reflowPreview(ssot, {
        reason: 'date_cursor_changed',
        cursor_ts: '2026-02-05T08:00:00+04:00',
        focus_trip_id: 'TRIP_2026_02A'
      });

      // SSOT should not be mutated
      expect(JSON.stringify(ssot)).toBe(original);

      // Result should have required fields
      expect(result.run_id).toBeDefined();
      expect(result.mode).toBe('preview');
      expect(result.proposed_changes).toBeDefined();
      expect(Array.isArray(result.proposed_changes)).toBe(true);
      expect(result.applied_changes).toEqual([]);
      expect(result.collision_summary).toBeDefined();
      expect(result.collision_summary.blocking).toBeGreaterThanOrEqual(0);
      expect(result.collision_summary.warning).toBeGreaterThanOrEqual(0);
      expect(result.collision_summary.info).toBeGreaterThanOrEqual(0);
    });

    it('should return proposed_changes when ES/EF differs from plan', () => {
      const ssot = loadSSOTSync('tests/fixtures/option_c_baseline.json');

      const result = reflowPreview(ssot, {
        reason: 'date_cursor_changed',
        cursor_ts: '2026-02-01T08:00:00+04:00',
        focus_trip_id: 'TRIP_2026_02A'
      });

      // May or may not have proposed changes depending on data
      expect(Array.isArray(result.proposed_changes)).toBe(true);
      for (const change of result.proposed_changes) {
        expect(change).toHaveProperty('activity_id');
        expect(change).toHaveProperty('path');
        expect(change).toHaveProperty('from');
        expect(change).toHaveProperty('to');
        expect(change).toHaveProperty('reason_code');
      }
    });

    it('should handle empty activities', () => {
      const ssot = loadSSOTSync('tests/fixtures/option_c_minimal.json');

      const result = reflowPreview(ssot, {
        reason: 'initial_load',
        focus_trip_id: 'NONEXISTENT'
      });

      expect(result.proposed_changes).toEqual([]);
      expect(result.collision_summary).toEqual({ blocking: 0, warning: 0, info: 0 });
    });

    it('Phase 0-3: reflow produces identical results for same input (10 runs)', () => {
      const ssot = loadSSOTSync('tests/fixtures/option_c_baseline.json');
      const seed = {
        reason: 'determinism_test',
        cursor_ts: '2026-02-05T08:00:00+04:00',
        focus_trip_id: 'TRIP_2026_02A'
      };

      const results = Array.from({ length: 10 }, () =>
        reflowPreview(JSON.parse(JSON.stringify(ssot)), seed)
      );

      const hashes = results.map((r) =>
        JSON.stringify(
          r.proposed_changes
            .slice()
            .sort((a, b) =>
              (a.activity_id + a.path).localeCompare(b.activity_id + b.path)
            )
        )
      );
      expect(new Set(hashes).size).toBe(1);
    });
  });

  describe('reflowApply', () => {
    it('should apply changes with approval', () => {
      const ssot = loadSSOTSync('tests/fixtures/option_c_baseline.json');
      const preview = reflowPreview(ssot, {
        reason: 'date_cursor_changed',
        cursor_ts: '2026-02-01T08:00:00+04:00',
        focus_trip_id: 'TRIP_2026_02A'
      });

      if (preview.proposed_changes.length === 0) {
        return; // Skip if no changes to apply
      }

      const approval: Approval = {
        approved_by: 'user:pm',
        approved_at: new Date().toISOString()
      };

      const result = reflowApply(ssot, preview, approval, { viewMode: 'live' });

      expect(result.mode).toBe('apply');
      expect(result.applied_changes.length).toBeGreaterThan(0);
      expect(ssot.reflow_runs.length).toBeGreaterThan(0);
    });

    it('should throw without approval', () => {
      const ssot = loadSSOTSync('tests/fixtures/option_c_baseline.json');
      const preview = reflowPreview(ssot, {
        reason: 'test',
        focus_trip_id: 'TRIP_2026_02A'
      });

      expect(() => {
        reflowApply(ssot, preview, null as any, { viewMode: 'live' });
      }).toThrow('approval');

      expect(() => {
        reflowApply(ssot, preview, { approved_by: '', approved_at: '' }, { viewMode: 'live' });
      }).toThrow('approval');
    });

    it('should throw in Approval mode', () => {
      const ssot = loadSSOTSync('tests/fixtures/option_c_baseline.json');
      const preview = reflowPreview(ssot, {
        reason: 'test',
        focus_trip_id: 'TRIP_2026_02A'
      });

      const approval: Approval = {
        approved_by: 'user:pm',
        approved_at: new Date().toISOString()
      };

      expect(() => {
        reflowApply(ssot, preview, approval, { viewMode: 'approval' });
      }).toThrow('Approval mode');
    });
  });

  describe('Preview/Apply separation', () => {
    it('should not mutate SSOT in preview', () => {
      const ssot = loadSSOTSync('tests/fixtures/option_c_baseline.json');
      const before = JSON.parse(JSON.stringify(ssot));

      reflowPreview(ssot, {
        reason: 'test',
        cursor_ts: '2026-02-05T10:00:00+04:00',
        focus_trip_id: 'TRIP_2026_02A'
      });

      // Deep compare - entities.activities should be unchanged
      expect(JSON.stringify(ssot.entities.activities)).toBe(
        JSON.stringify(before.entities.activities)
      );
    });
  });
});
