/**
 * SSOT Loader for TR Dashboard (Contract v0.8.0)
 * 
 * Loads and validates option_c.json with type safety.
 * Integrates with Python validator for contract compliance.
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { OptionC } from '../types/ssot';

const execAsync = promisify(exec);

export class SSOTLoadError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'SSOTLoadError';
  }
}

export class SSOTValidationError extends Error {
  constructor(message: string, public validationErrors: string[] = []) {
    super(message);
    this.name = 'SSOTValidationError';
  }
}

/**
 * Load SSOT from file path
 * 
 * @param path - Path to option_c.json file
 * @param options - Load options
 * @returns Validated and typed SSOT data
 * 
 * @throws {SSOTLoadError} If file cannot be read or parsed
 * @throws {SSOTValidationError} If validation fails
 */
export async function loadSSOT(
  path: string,
  options: {
    validate?: boolean;
    validateWithPython?: boolean;
  } = {}
): Promise<OptionC> {
  const {
    validate = true,
    validateWithPython = true
  } = options;

  // Check file exists
  if (!existsSync(path)) {
    throw new SSOTLoadError(`File not found: ${path}`);
  }

  // Read file
  let rawData: string;
  try {
    rawData = await readFile(path, 'utf-8');
  } catch (error) {
    throw new SSOTLoadError(
      `Failed to read file: ${path}`,
      error as Error
    );
  }

  // Parse JSON
  let data: any;
  try {
    data = JSON.parse(rawData);
  } catch (error) {
    throw new SSOTLoadError(
      `Invalid JSON in file: ${path}`,
      error as Error
    );
  }

  // Validate with Python validator if requested
  if (validate && validateWithPython) {
    await validateWithPythonScript(path);
  }

  // Basic TypeScript validation
  if (validate) {
    validateBasicStructure(data);
  }

  // Type cast (validated)
  return data as OptionC;
}

/**
 * Validate using Python validator script
 */
async function validateWithPythonScript(path: string): Promise<void> {
  const validatorPath = 'scripts/validate_optionc.py';
  
  if (!existsSync(validatorPath)) {
    console.warn('Python validator not found, skipping external validation');
    return;
  }

  try {
    const { stdout, stderr } = await execAsync(`python ${validatorPath} ${path}`);
    
    // Check for validation failure
    if (stderr.includes('[FAIL]') || stdout.includes('[FAIL]')) {
      const errors = extractValidationErrors(stdout + stderr);
      throw new SSOTValidationError(
        'SSOT validation failed (Python validator)',
        errors
      );
    }
  } catch (error: any) {
    if (error instanceof SSOTValidationError) {
      throw error;
    }
    
    // Python execution error
    throw new SSOTLoadError(
      'Failed to run Python validator',
      error
    );
  }
}

/**
 * Extract error messages from validator output
 */
function extractValidationErrors(output: string): string[] {
  const lines = output.split('\n');
  return lines
    .filter(line => line.trim().startsWith('ERROR:'))
    .map(line => line.replace('ERROR:', '').trim());
}

/**
 * Basic structure validation (TypeScript-level)
 */
function validateBasicStructure(data: any): void {
  const errors: string[] = [];

  // Check contract section
  if (!data.contract) {
    errors.push('Missing contract section');
  } else {
    if (data.contract.version !== '0.8.0') {
      errors.push(`Invalid contract version: ${data.contract.version}`);
    }
    if (!data.contract.ssot?.activity_is_source_of_truth) {
      errors.push('contract.ssot.activity_is_source_of_truth must be true');
    }
  }

  // Check entities section
  if (!data.entities) {
    errors.push('Missing entities section');
  } else {
    // CRITICAL: activities must be dict, not array
    if (!data.entities.activities) {
      errors.push('Missing entities.activities');
    } else if (Array.isArray(data.entities.activities)) {
      errors.push('entities.activities must be dict, not array');
    }
  }

  if (errors.length > 0) {
    throw new SSOTValidationError(
      'Basic structure validation failed',
      errors
    );
  }
}

/**
 * Load SSOT synchronously (for testing)
 * 
 * WARNING: This is a blocking operation. Use loadSSOT() for production.
 */
export function loadSSOTSync(path: string): OptionC {
  const fs = require('fs');
  
  if (!existsSync(path)) {
    throw new SSOTLoadError(`File not found: ${path}`);
  }

  const rawData = fs.readFileSync(path, 'utf-8');
  const data = JSON.parse(rawData);
  
  validateBasicStructure(data);
  
  return data as OptionC;
}

// Re-export query helpers for consumers that need both load + query
export {
  getActivitiesArray,
  getActivity,
  getTrip,
  getTR,
  getCollision,
  getEvidence,
  getActivitiesForTrip,
  getActivitiesForTR,
  getCollisionsForActivity,
} from './ssot-queries';

/**
 * Check if SSOT is valid (basic check)
 */
export function isValidSSOT(data: any): boolean {
  try {
    validateBasicStructure(data);
    return true;
  } catch {
    return false;
  }
}
