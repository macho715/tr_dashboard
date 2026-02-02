#!/usr/bin/env python3
"""
AGI Schedule Pipeline Step 4: Weather Go/No-Go Integration

Integrates weather-go-nogo evaluation into AGI TR SCHEDULE HTML.
Part of the full pipeline: shift(1) → daily-update(2) → pipeline-check(3) → weather-go-nogo(4)
"""

import os
import sys
from datetime import datetime
from pathlib import Path
import re

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from weather_go_nogo import (
    run_gonogo_from_json,
    run_gonogo_manual,
    format_html_output,
    GoNoGoLimits,
    GoNoGoResult
)


def find_latest_schedule_html(files_dir: str = ".") -> str:
    """Find the most recent AGI TR SCHEDULE HTML file"""
    pattern = re.compile(r"AGI TR SCHEDULE_(\d{8})\.html")
    latest_date = None
    latest_file = None
    
    for filename in os.listdir(files_dir):
        match = pattern.match(filename)
        if match:
            date_str = match.group(1)
            if latest_date is None or date_str > latest_date:
                latest_date = date_str
                latest_file = filename
    
    if latest_file is None:
        raise FileNotFoundError("No AGI TR SCHEDULE HTML files found")
    
    return os.path.join(files_dir, latest_file)


def insert_gonogo_into_html(
    html_path: str,
    gonogo_html: str,
    output_path: str = None
) -> str:
    """
    Insert Go/No-Go HTML block into AGI TR SCHEDULE
    
    Inserts after the Weather & Marine Risk section, before voyage cards
    """
    with open(html_path, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    # Find insertion point (after Weather & Marine Risk section)
    # Look for the end of the weather-marine-risk div
    insertion_marker = '</div>\n        </div>\n\n        <!-- Voyages Overview -->'
    
    if insertion_marker in html_content:
        # Insert before voyage cards
        html_content = html_content.replace(
            insertion_marker,
            f'</div>\n        </div>\n\n        {gonogo_html}\n\n        <!-- Voyages Overview -->'
        )
    else:
        # Fallback: insert before closing main container
        html_content = html_content.replace(
            '</div>\n    </div>\n</body>',
            f'        {gonogo_html}\n    </div>\n</body>'
        )
    
    # Save result
    if output_path is None:
        output_path = html_path.replace('.html', '_with_gonogo.html')
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    return output_path


def run_pipeline_step4(
    weather_source: str = "sample",
    limits: GoNoGoLimits = None,
    use_gate_b: bool = True,
    output_dir: str = "."
) -> tuple[GoNoGoResult, str]:
    """
    Execute pipeline step 4: Weather Go/No-Go evaluation and HTML integration
    
    Args:
        weather_source: "sample" or path to weather JSON file
        limits: Operational limits (uses defaults if None)
        use_gate_b: Whether to apply Gate-B squall buffer
        output_dir: Output directory for updated HTML
    
    Returns:
        Tuple of (GoNoGoResult, output_html_path)
    """
    print("="*60)
    print("AGI SCHEDULE PIPELINE STEP 4: Weather Go/No-Go")
    print("="*60)
    
    # Step 1: Load weather data and evaluate
    print("\n[1/3] Loading weather data and evaluating Go/No-Go...")
    
    if limits is None:
        limits = GoNoGoLimits(
            Hs_limit_m=3.0,
            Wind_limit_kt=25.0,
            SailingTime_hr=8.0,
            Reserve_hr=4.0,
            ΔHs_squall_m=0.5,
            ΔGust_kt=10.0,
            Hmax_allow_m=5.5
        )
    
    if weather_source == "sample":
        weather_json = os.path.join(output_dir, "weather_forecast_sample.json")
        if not os.path.exists(weather_json):
            print(f"Warning: Sample file not found at {weather_json}")
            print("Creating sample data...")
            # Use manual data as fallback
            result = run_gonogo_manual(
                wave_ft_series=[6.5, 7.0, 7.2, 6.8, 6.5, 6.2, 6.0, 5.8, 5.5, 5.2, 5.0, 4.8],
                wind_kt_series=[18, 20, 22, 21, 19, 18, 17, 16, 15, 14, 13, 12],
                limits=limits,
                use_gate_b=use_gate_b
            )
        else:
            result = run_gonogo_from_json(weather_json, limits, use_gate_b)
    else:
        result = run_gonogo_from_json(weather_source, limits, use_gate_b)
    
    print(f"   Decision: {result.decision}")
    print(f"   Rationale: {result.rationale}")
    
    # Step 2: Generate HTML block
    print("\n[2/3] Generating HTML block...")
    gonogo_html = format_html_output(result, limits)
    print(f"   Generated {len(gonogo_html)} characters of HTML")
    
    # Step 3: Insert into latest AGI TR SCHEDULE
    print("\n[3/3] Integrating into AGI TR SCHEDULE...")
    try:
        latest_html = find_latest_schedule_html(output_dir)
        print(f"   Source: {os.path.basename(latest_html)}")
        
        # Generate output filename with today's date
        today = datetime.now().strftime("%Y%m%d")
        output_path = os.path.join(output_dir, f"AGI TR SCHEDULE_{today}_with_gonogo.html")
        
        output_path = insert_gonogo_into_html(latest_html, gonogo_html, output_path)
        print(f"   Output: {os.path.basename(output_path)}")
        
    except FileNotFoundError as e:
        print(f"   Error: {e}")
        # Save standalone HTML block
        output_path = os.path.join(output_dir, f"weather_gonogo_block_{datetime.now().strftime('%Y%m%d_%H%M')}.html")
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(gonogo_html)
        print(f"   Saved standalone HTML block to: {os.path.basename(output_path)}")
    
    print("\n" + "="*60)
    print("STEP 4 COMPLETE")
    print("="*60 + "\n")
    
    return result, output_path


def main():
    """CLI entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="AGI Schedule Pipeline Step 4: Weather Go/No-Go Integration"
    )
    parser.add_argument(
        '--weather',
        default='sample',
        help='Weather data source: "sample" or path to JSON file'
    )
    parser.add_argument(
        '--hs-limit',
        type=float,
        default=3.0,
        help='Max significant wave height (m)'
    )
    parser.add_argument(
        '--wind-limit',
        type=float,
        default=25.0,
        help='Max wind speed (kt)'
    )
    parser.add_argument(
        '--sailing-time',
        type=float,
        default=8.0,
        help='Expected sailing time (hr)'
    )
    parser.add_argument(
        '--reserve',
        type=float,
        default=4.0,
        help='Reserve time (hr)'
    )
    parser.add_argument(
        '--no-gate-b',
        action='store_true',
        help='Disable Gate-B squall buffer'
    )
    parser.add_argument(
        '--output-dir',
        default='.',
        help='Output directory (default: current directory)'
    )
    
    args = parser.parse_args()
    
    limits = GoNoGoLimits(
        Hs_limit_m=args.hs_limit,
        Wind_limit_kt=args.wind_limit,
        SailingTime_hr=args.sailing_time,
        Reserve_hr=args.reserve
    )
    
    result, output_path = run_pipeline_step4(
        weather_source=args.weather,
        limits=limits,
        use_gate_b=not args.no_gate_b,
        output_dir=args.output_dir
    )
    
    print("\nSummary:")
    print(f"  Decision: {result.decision}")
    print(f"  Output file: {output_path}")
    
    if result.reason_codes:
        print(f"  Reason codes: {', '.join(result.reason_codes)}")


if __name__ == "__main__":
    main()
