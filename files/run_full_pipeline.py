#!/usr/bin/env python3
"""
AGI Schedule Complete Pipeline (Steps 1-4)

Executes the full integrated pipeline:
1. agi-schedule-shift (optional)
2. agi-schedule-daily-update (always)
3. agi-schedule-pipeline-check (always)
4. weather-go-nogo (if weather data provided)

Usage:
    # Full pipeline with shift
    python run_full_pipeline.py --pivot-date 2026-02-15 --new-date 2026-02-20 --weather sample
    
    # Pipeline without shift (update only)
    python run_full_pipeline.py --no-shift --weather sample
    
    # Pipeline with custom weather limits
    python run_full_pipeline.py --weather forecast.json --hs-limit 3.5 --wind-limit 30
"""

import os
import sys
import subprocess
from datetime import datetime
from pathlib import Path
import argparse


class PipelineRunner:
    """Orchestrates the complete AGI Schedule pipeline"""
    
    def __init__(self, files_dir: str = "."):
        self.files_dir = files_dir
        self.results = {
            'shift': None,
            'daily_update': None,
            'pipeline_check': None,
            'weather_gonogo': None
        }
        self.errors = []
    
    def run_step(self, step_name: str, script_name: str, args: list = None) -> bool:
        """
        Execute a pipeline step
        
        Returns:
            True if successful, False otherwise
        """
        print(f"\n{'='*60}")
        print(f"STEP: {step_name}")
        print(f"{'='*60}")
        
        try:
            cmd = [sys.executable, script_name]
            if args:
                cmd.extend(args)
            
            result = subprocess.run(
                cmd,
                cwd=self.files_dir,
                check=True,
                capture_output=True,
                text=True
            )
            
            print(result.stdout)
            if result.stderr:
                print("Warnings:", result.stderr)
            
            self.results[step_name.lower().replace(' ', '_').replace('-', '_')] = {
                'status': 'SUCCESS',
                'output': result.stdout
            }
            
            return True
            
        except subprocess.CalledProcessError as e:
            error_msg = f"{step_name} failed: {e.stderr}"
            print(f"ERROR: {error_msg}")
            self.errors.append(error_msg)
            
            self.results[step_name.lower().replace(' ', '_').replace('-', '_')] = {
                'status': 'FAILED',
                'error': error_msg
            }
            
            return False
    
    def run_full_pipeline(
        self,
        shift_args: dict = None,
        weather_args: dict = None,
        skip_shift: bool = False
    ) -> bool:
        """
        Execute complete 4-step pipeline
        
        Args:
            shift_args: Dict with 'pivot_date' and 'new_date' for schedule shift
            weather_args: Dict with weather evaluation parameters
            skip_shift: If True, skip step 1
        
        Returns:
            True if all steps succeeded, False if any failed
        """
        print("\n" + "="*60)
        print("AGI SCHEDULE COMPLETE PIPELINE")
        print("="*60)
        print(f"Start Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Files Directory: {os.path.abspath(self.files_dir)}")
        
        success = True
        
        # Step 1: Schedule Shift (optional)
        if not skip_shift and shift_args:
            step1_args = [
                '--pivot-date', shift_args['pivot_date'],
                '--new-date', shift_args['new_date']
            ]
            if not self.run_step('shift', 'schedule_shift.py', step1_args):
                print("\nWARNING: Step 1 failed, continuing with existing schedule...")
        else:
            print("\n" + "="*60)
            print("STEP 1: Schedule Shift - SKIPPED")
            print("="*60)
            self.results['shift'] = {'status': 'SKIPPED'}
        
        # Step 2: Daily Update (always)
        if not self.run_step('daily_update', 'run_daily_update.py'):
            print("\nERROR: Step 2 failed, cannot continue pipeline")
            return False
        
        # Step 3: Pipeline Check (if script exists)
        pipeline_check_script = os.path.join(self.files_dir, 'run_pipeline_check.py')
        if os.path.exists(pipeline_check_script):
            if not self.run_step('pipeline_check', 'run_pipeline_check.py'):
                print("\nWARNING: Step 3 had issues, continuing to step 4...")
                success = False
        else:
            print("\n" + "="*60)
            print("STEP 3: Pipeline Check - SKIPPED (script not found)")
            print("="*60)
            self.results['pipeline_check'] = {'status': 'SKIPPED'}
        
        # Step 4: Weather Go/No-Go (if weather data provided)
        if weather_args:
            step4_args = ['--weather', weather_args.get('weather_source', 'sample')]
            
            if 'hs_limit' in weather_args:
                step4_args.extend(['--hs-limit', str(weather_args['hs_limit'])])
            if 'wind_limit' in weather_args:
                step4_args.extend(['--wind-limit', str(weather_args['wind_limit'])])
            if 'sailing_time' in weather_args:
                step4_args.extend(['--sailing-time', str(weather_args['sailing_time'])])
            if 'reserve' in weather_args:
                step4_args.extend(['--reserve', str(weather_args['reserve'])])
            if weather_args.get('no_gate_b', False):
                step4_args.append('--no-gate-b')
            
            if not self.run_step('weather_gonogo', 'run_pipeline_step4.py', step4_args):
                print("\nWARNING: Step 4 failed")
                success = False
        else:
            print("\n" + "="*60)
            print("STEP 4: Weather Go/No-Go - SKIPPED (no weather data)")
            print("="*60)
            self.results['weather_gonogo'] = {'status': 'SKIPPED'}
        
        # Summary
        self.print_summary()
        
        return success
    
    def print_summary(self):
        """Print pipeline execution summary"""
        print("\n" + "="*60)
        print("PIPELINE SUMMARY")
        print("="*60)
        print(f"End Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        
        for step, result in self.results.items():
            if result:
                status_text = result['status']
                step_name = step.replace('_', ' ').title()
                print(f"  {step_name}: {status_text}")
        
        if self.errors:
            print(f"\nErrors ({len(self.errors)}):")
            for i, error in enumerate(self.errors, 1):
                print(f"  {i}. {error}")
        else:
            print("\nAll executed steps completed successfully!")
        
        print("="*60 + "\n")


def main():
    parser = argparse.ArgumentParser(
        description="AGI Schedule Complete Pipeline (Steps 1-4)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Full pipeline with schedule shift
  python run_full_pipeline.py --pivot-date 2026-02-15 --new-date 2026-02-20 --weather sample
  
  # Update only (no shift)
  python run_full_pipeline.py --no-shift --weather sample
  
  # Custom weather limits
  python run_full_pipeline.py --weather forecast.json --hs-limit 3.5 --wind-limit 30
  
  # No weather evaluation
  python run_full_pipeline.py --no-shift
        """
    )
    
    # Step 1 arguments
    parser.add_argument(
        '--pivot-date',
        help='Pivot date for schedule shift (YYYY-MM-DD)'
    )
    parser.add_argument(
        '--new-date',
        help='New date for pivot (YYYY-MM-DD)'
    )
    parser.add_argument(
        '--no-shift',
        action='store_true',
        help='Skip schedule shift step'
    )
    
    # Step 4 arguments
    parser.add_argument(
        '--weather',
        help='Weather data source: "sample" or path to JSON file'
    )
    parser.add_argument(
        '--hs-limit',
        type=float,
        help='Max significant wave height (m)'
    )
    parser.add_argument(
        '--wind-limit',
        type=float,
        help='Max wind speed (kt)'
    )
    parser.add_argument(
        '--sailing-time',
        type=float,
        help='Expected sailing time (hr)'
    )
    parser.add_argument(
        '--reserve',
        type=float,
        help='Reserve time (hr)'
    )
    parser.add_argument(
        '--no-gate-b',
        action='store_true',
        help='Disable Gate-B squall buffer'
    )
    
    # General arguments
    parser.add_argument(
        '--files-dir',
        default='.',
        help='Files directory (default: current directory)'
    )
    
    args = parser.parse_args()
    
    # Build shift arguments
    shift_args = None
    if args.pivot_date and args.new_date:
        shift_args = {
            'pivot_date': args.pivot_date,
            'new_date': args.new_date
        }
    
    # Build weather arguments
    weather_args = None
    if args.weather:
        weather_args = {
            'weather_source': args.weather
        }
        if args.hs_limit:
            weather_args['hs_limit'] = args.hs_limit
        if args.wind_limit:
            weather_args['wind_limit'] = args.wind_limit
        if args.sailing_time:
            weather_args['sailing_time'] = args.sailing_time
        if args.reserve:
            weather_args['reserve'] = args.reserve
        if args.no_gate_b:
            weather_args['no_gate_b'] = True
    
    # Run pipeline
    runner = PipelineRunner(files_dir=args.files_dir)
    success = runner.run_full_pipeline(
        shift_args=shift_args,
        weather_args=weather_args,
        skip_shift=args.no_shift
    )
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
