/**
 * Unit tests for SSOT Loader (Contract v0.8.0)
 */

import { describe, it, expect } from 'vitest';
import {
  loadSSOTSync,
  getActivitiesArray,
  getActivity,
  getTrip,
  getTR,
  getCollision,
  getActivitiesForTrip,
  getActivitiesForTR,
  isValidSSOT,
  SSOTLoadError,
  SSOTValidationError
} from '../ssot-loader';
import type { OptionC } from '../../types/ssot';

describe('SSOT Loader', () => {
  describe('loadSSOTSync', () => {
    it('should load valid minimal SSOT', () => {
      const ssot = loadSSOTSync('tests/fixtures/option_c_minimal.json');
      
      expect(ssot).toBeDefined();
      expect(ssot.contract.version).toBe('0.8.0');
      expect(ssot.contract.ssot.activity_is_source_of_truth).toBe(true);
    });
    
    it('should load valid baseline SSOT', () => {
      const ssot = loadSSOTSync('tests/fixtures/option_c_baseline.json');
      
      expect(ssot).toBeDefined();
      expect(Object.keys(ssot.entities.activities).length).toBe(16);
      expect(Object.keys(ssot.entities.trips).length).toBe(2);
      expect(Object.keys(ssot.entities.trs).length).toBe(3);
    });
    
    it('should throw on missing file', () => {
      expect(() => {
        loadSSOTSync('nonexistent.json');
      }).toThrow(SSOTLoadError);
    });
    
    it('should validate activities is dict, not array', () => {
      const invalidData = {
        contract: {
          version: '0.8.0',
          ssot: { activity_is_source_of_truth: true }
        },
        entities: {
          activities: [] // INVALID: should be dict
        }
      };
      
      // @ts-expect-error Testing invalid data structure
      expect(() => {
        isValidSSOT(invalidData);
      }).not.toThrow();
      
      expect(isValidSSOT(invalidData)).toBe(false);
    });
  });
  
  describe('getActivitiesArray', () => {
    it('should convert activities dict to array', () => {
      const ssot = loadSSOTSync('tests/fixtures/option_c_baseline.json');
      const activities = getActivitiesArray(ssot);
      
      expect(Array.isArray(activities)).toBe(true);
      expect(activities.length).toBe(16);
      expect(activities[0]).toHaveProperty('activity_id');
    });
  });
  
  describe('getActivity', () => {
    it('should retrieve activity by ID', () => {
      const ssot = loadSSOTSync('tests/fixtures/option_c_baseline.json');
      const activity = getActivity(ssot, 'A1000');
      
      expect(activity).toBeDefined();
      expect(activity?.activity_id).toBe('A1000');
      expect(activity?.type_id).toBe('route_survey');
    });
    
    it('should return undefined for missing activity', () => {
      const ssot = loadSSOTSync('tests/fixtures/option_c_baseline.json');
      const activity = getActivity(ssot, 'NONEXISTENT');
      
      expect(activity).toBeUndefined();
    });
  });
  
  describe('getTrip', () => {
    it('should retrieve trip by ID', () => {
      const ssot = loadSSOTSync('tests/fixtures/option_c_baseline.json');
      const trip = getTrip(ssot, 'TRIP_2026_02A');
      
      expect(trip).toBeDefined();
      expect(trip?.trip_id).toBe('TRIP_2026_02A');
      expect(trip?.tr_ids).toContain('TR_001');
    });
  });
  
  describe('getTR', () => {
    it('should retrieve TR by ID', () => {
      const ssot = loadSSOTSync('tests/fixtures/option_c_baseline.json');
      const tr = getTR(ssot, 'TR_001');
      
      expect(tr).toBeDefined();
      expect(tr?.tr_id).toBe('TR_001');
      expect(tr?.spec.weight_t).toBe(310.0);
    });
  });
  
  describe('getCollision', () => {
    it('should retrieve collision by ID', () => {
      const ssot = loadSSOTSync('tests/fixtures/option_c_baseline.json');
      const collision = getCollision(ssot, 'COL_001');
      
      expect(collision).toBeDefined();
      expect(collision?.collision_id).toBe('COL_001');
      expect(collision?.kind).toBe('resource_overallocated');
    });
  });
  
  describe('getActivitiesForTrip', () => {
    it('should return all activities for trip', () => {
      const ssot = loadSSOTSync('tests/fixtures/option_c_baseline.json');
      const activities = getActivitiesForTrip(ssot, 'TRIP_2026_02A');
      
      expect(activities.length).toBeGreaterThan(0);
      for (const activity of getActivitiesArray(ssot)) {
        expect(activity.trip_id).toBe('TRIP_2026_02A');
      }
    });
  });
  
  describe('getActivitiesForTR', () => {
    it('should return all activities for TR', () => {
      const ssot = loadSSOTSync('tests/fixtures/option_c_baseline.json');
      const activities = getActivitiesForTR(ssot, 'TR_001');
      
      expect(activities.length).toBeGreaterThan(0);
      for (const activity of activities) {
        expect(activity.tr_ids.includes('TR_001')).toBe(true);
      }
    });
  });
  
  describe('SSOT integrity', () => {
    it('should enforce Activity as SSOT', () => {
      const ssot = loadSSOTSync('tests/fixtures/option_c_baseline.json');
      
      // Trip should not have state/location/progress
      for (const tripId in ssot.entities.trips) {
        const trip = ssot.entities.trips[tripId];
        expect(trip).not.toHaveProperty('state');
        expect(trip).not.toHaveProperty('current_state');
        expect(trip).not.toHaveProperty('location');
        expect(trip).not.toHaveProperty('current_location');
        expect(trip).not.toHaveProperty('progress');
      }
      
      // TR should not have state/location/progress
      for (const trId in ssot.entities.trs) {
        const tr = ssot.entities.trs[trId];
        expect(tr).not.toHaveProperty('state');
        expect(tr).not.toHaveProperty('current_state');
        expect(tr).not.toHaveProperty('location');
        expect(tr).not.toHaveProperty('current_location');
        expect(tr).not.toHaveProperty('progress');
      }
    });
    
    it('should have lowercase enums', () => {
      const ssot = loadSSOTSync('tests/fixtures/option_c_baseline.json');
      
      for (const activity of getActivitiesArray(ssot)) {
        // State should be lowercase
        expect(activity.state).toBe(activity.state.toLowerCase());
        
        // Lock level should be lowercase
        expect(activity.lock_level).toBe(activity.lock_level.toLowerCase());
        
        // Dependency types should be lowercase
        for (const dep of activity.plan.dependencies) {
          expect(dep.type).toBe(dep.type.toLowerCase());
        }
      }
    });
  });
});
