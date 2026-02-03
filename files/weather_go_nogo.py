#!/usr/bin/env python3
"""
Weather Go/No-Go for SEA TRANSIT (AGI Schedule Pipeline Step 4)

Evaluates marine weather conditions using 3-Gate logic:
- Gate-A: Basic wave/wind thresholds
- Gate-B: Squall buffer + Hmax estimation
- Gate-C: Continuous weather window

Part of integrated pipeline: shift(1) → daily-update(2) → pipeline-check(3) → weather-go-nogo(4)
"""

from dataclasses import dataclass
from typing import List, Optional, Tuple
from datetime import datetime, timedelta
import json
import os


@dataclass
class WeatherInput:
    """Input weather data for Go/No-Go evaluation"""
    wave_ft: float  # Combined sea+swell wave height (feet)
    wind_kt: float  # Wind speed (knots)
    timestamp: datetime
    wave_period_s: Optional[float] = None  # Wave period (seconds), optional


@dataclass
class GoNoGoLimits:
    """Operational limits for sea transit"""
    Hs_limit_m: float = 3.0  # Max allowed significant wave height (meters)
    Wind_limit_kt: float = 25.0  # Max allowed wind speed (knots)
    SailingTime_hr: float = 8.0  # Expected sailing time (hours)
    Reserve_hr: float = 4.0  # Reserve time for safety (hours)
    ΔHs_squall_m: float = 0.5  # Squall wave buffer (meters)
    ΔGust_kt: float = 10.0  # Gust wind buffer (knots)
    Hmax_allow_m: float = 5.5  # Max allowed peak wave height (meters)


@dataclass
class GateResult:
    """Result from a single gate evaluation"""
    passed: bool
    reason_codes: List[str]
    details: str


@dataclass
class GoNoGoResult:
    """Final Go/No-Go decision"""
    decision: str  # "GO" | "NO-GO" | "CONDITIONAL"
    reason_codes: List[str]
    gate_a: GateResult
    gate_b: Optional[GateResult]
    gate_c: GateResult
    rationale: str
    recommendations: List[str]


def ft_to_m(feet: float) -> float:
    """Convert feet to meters"""
    return feet * 0.3048


def evaluate_gate_a(
    weather: WeatherInput, 
    limits: GoNoGoLimits
) -> GateResult:
    """
    Gate-A: Basic Threshold
    - Hs_m ≤ Hs_limit_m AND Wind_kt ≤ Wind_limit_kt → GO
    - Otherwise → NO-GO
    """
    Hs_m = ft_to_m(weather.wave_ft)
    reason_codes = []
    details_parts = []
    
    wave_ok = Hs_m <= limits.Hs_limit_m
    wind_ok = weather.wind_kt <= limits.Wind_limit_kt
    
    if not wave_ok:
        reason_codes.append("WX_WAVE")
        details_parts.append(
            f"Wave height {Hs_m:.2f}m exceeds limit {limits.Hs_limit_m}m"
        )
    
    if not wind_ok:
        reason_codes.append("WX_WIND")
        details_parts.append(
            f"Wind speed {weather.wind_kt}kt exceeds limit {limits.Wind_limit_kt}kt"
        )
    
    passed = wave_ok and wind_ok
    details = " AND ".join(details_parts) if details_parts else "All thresholds within limits"
    
    return GateResult(passed=passed, reason_codes=reason_codes, details=details)


def evaluate_gate_b(
    weather: WeatherInput,
    limits: GoNoGoLimits
) -> GateResult:
    """
    Gate-B: Squall/Peak Wave Buffer
    - Apply squall buffers to get effective values
    - Estimate Hmax = 1.86 × Hs_eff
    - Check if Hmax_est > Hmax_allow_m
    """
    Hs_m = ft_to_m(weather.wave_ft)
    Hs_eff = Hs_m + limits.ΔHs_squall_m
    Wind_eff = weather.wind_kt + limits.ΔGust_kt
    Hmax_est = 1.86 * Hs_eff
    
    reason_codes = []
    details_parts = []
    
    wave_ok = Hs_eff <= limits.Hs_limit_m
    wind_ok = Wind_eff <= limits.Wind_limit_kt
    hmax_ok = Hmax_est <= limits.Hmax_allow_m
    
    if not wave_ok:
        reason_codes.append("WX_WAVE_SQUALL")
        details_parts.append(
            f"Wave with squall buffer {Hs_eff:.2f}m exceeds limit {limits.Hs_limit_m}m"
        )
    
    if not wind_ok:
        reason_codes.append("WX_WIND_GUST")
        details_parts.append(
            f"Wind with gust {Wind_eff:.1f}kt exceeds limit {limits.Wind_limit_kt}kt"
        )
    
    if not hmax_ok:
        reason_codes.append("WX_HMAX")
        details_parts.append(
            f"Estimated Hmax {Hmax_est:.2f}m exceeds limit {limits.Hmax_allow_m}m"
        )
    
    passed = wave_ok and wind_ok and hmax_ok
    details = " AND ".join(details_parts) if details_parts else "Squall buffers within limits"
    
    return GateResult(passed=passed, reason_codes=reason_codes, details=details)


def evaluate_gate_c(
    weather_series: List[WeatherInput],
    limits: GoNoGoLimits,
    gate_a_results: List[GateResult],
    gate_b_results: Optional[List[GateResult]] = None
) -> GateResult:
    """
    Gate-C: Continuous Weather Window
    - Requires (SailingTime + Reserve) hours of continuous GO conditions
    - All time buckets in window must pass Gate-A (and Gate-B if used)
    """
    required_window_hr = limits.SailingTime_hr + limits.Reserve_hr
    
    # Find continuous GO windows
    continuous_go_hours = 0
    max_continuous = 0
    reason_codes = []
    
    for i, (weather, gate_a) in enumerate(zip(weather_series, gate_a_results)):
        gate_b = gate_b_results[i] if gate_b_results else None
        
        # Check if this time bucket is GO
        is_go = gate_a.passed
        if gate_b is not None:
            is_go = is_go and gate_b.passed
        
        if is_go:
            continuous_go_hours += 1
            max_continuous = max(max_continuous, continuous_go_hours)
        else:
            continuous_go_hours = 0
            if not gate_a.reason_codes:
                reason_codes.extend(gate_a.reason_codes)
            if gate_b and gate_b.reason_codes:
                reason_codes.extend(gate_b.reason_codes)
    
    passed = max_continuous >= required_window_hr
    
    if passed:
        details = f"Continuous window of {max_continuous:.1f}hr ≥ required {required_window_hr:.1f}hr"
    else:
        details = f"Max continuous window {max_continuous:.1f}hr < required {required_window_hr:.1f}hr"
        reason_codes.append("WX_WINDOW_INSUFFICIENT")
    
    return GateResult(
        passed=passed,
        reason_codes=list(set(reason_codes)),  # Remove duplicates
        details=details
    )


def evaluate_go_nogo(
    weather_series: List[WeatherInput],
    limits: GoNoGoLimits,
    use_gate_b: bool = True
) -> GoNoGoResult:
    """
    Complete 3-Gate Go/No-Go evaluation
    
    Args:
        weather_series: Time series of weather data (hourly)
        limits: Operational limits
        use_gate_b: Whether to apply Gate-B squall buffer logic
    
    Returns:
        GoNoGoResult with final decision
    """
    # Evaluate Gate-A for all time points
    gate_a_results = [evaluate_gate_a(w, limits) for w in weather_series]
    
    # Evaluate Gate-B if requested
    gate_b_results = None
    if use_gate_b:
        gate_b_results = [evaluate_gate_b(w, limits) for w in weather_series]
    
    # Evaluate Gate-C (continuous window)
    gate_c_result = evaluate_gate_c(
        weather_series, limits, gate_a_results, gate_b_results
    )
    
    # Aggregate all reason codes
    all_reason_codes = set()
    for result in gate_a_results:
        all_reason_codes.update(result.reason_codes)
    if gate_b_results:
        for result in gate_b_results:
            all_reason_codes.update(result.reason_codes)
    all_reason_codes.update(gate_c_result.reason_codes)
    
    # Determine final decision
    if gate_c_result.passed:
        decision = "GO"
        rationale = f"All gates passed. {gate_c_result.details}"
        recommendations = [
            "Monitor weather continuously during transit",
            "Prepare contingency plans if conditions deteriorate",
            "Confirm latest forecast before departure"
        ]
    else:
        decision = "NO-GO"
        rationale = f"Gate-C failed. {gate_c_result.details}"
        recommendations = [
            "Wait for weather window to improve",
            "Monitor 2-day hourly forecasts for next opportunity",
            "Consider alternative timing or route if available"
        ]
    
    # Check for marginal conditions (CONDITIONAL)
    marginal_conditions = False
    for gate_a in gate_a_results:
        if gate_a.passed:
            # Check if close to limits
            for weather in weather_series:
                Hs_m = ft_to_m(weather.wave_ft)
                if Hs_m > limits.Hs_limit_m * 0.85 or weather.wind_kt > limits.Wind_limit_kt * 0.85:
                    marginal_conditions = True
                    break
    
    if decision == "GO" and marginal_conditions:
        decision = "CONDITIONAL"
        recommendations.insert(0, "Weather is near operational limits - proceed with caution")
    
    return GoNoGoResult(
        decision=decision,
        reason_codes=list(all_reason_codes),
        gate_a=GateResult(
            passed=all(r.passed for r in gate_a_results),
            reason_codes=list(set(sum([r.reason_codes for r in gate_a_results], []))),
            details=f"{sum(r.passed for r in gate_a_results)}/{len(gate_a_results)} time points passed"
        ),
        gate_b=GateResult(
            passed=all(r.passed for r in gate_b_results) if gate_b_results else None,
            reason_codes=list(set(sum([r.reason_codes for r in gate_b_results], []))) if gate_b_results else [],
            details=f"{sum(r.passed for r in gate_b_results)}/{len(gate_b_results)} time points passed" if gate_b_results else "Not evaluated"
        ) if use_gate_b else None,
        gate_c=gate_c_result,
        rationale=rationale,
        recommendations=recommendations
    )


def format_html_output(result: GoNoGoResult, limits: GoNoGoLimits) -> str:
    """
    Format Go/No-Go result as HTML block for AGI TR SCHEDULE
    Following DASHBOARD_OUTPUT_SCHEMA.md format
    """
    # Color coding
    color_map = {
        "GO": "#10b981",  # Green
        "NO-GO": "#ef4444",  # Red
        "CONDITIONAL": "#eab308"  # Yellow
    }
    bg_color_map = {
        "GO": "rgba(16, 185, 129, 0.1)",
        "NO-GO": "rgba(239, 68, 68, 0.1)",
        "CONDITIONAL": "rgba(234, 179, 8, 0.1)"
    }
    
    color = color_map.get(result.decision, "#64748b")
    bg_color = bg_color_map.get(result.decision, "rgba(100, 116, 139, 0.1)")
    
    html = f"""
        <div class="weather-gonogo-section" style="
            background: {bg_color};
            border: 2px solid {color};
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
        ">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                <div style="
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    background: {color};
                    box-shadow: 0 0 12px {color};
                "></div>
                <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: var(--text-primary);">
                    SEA TRANSIT Weather Go/No-Go
                </h3>
            </div>
            
            <div style="
                background: {color};
                color: white;
                padding: 16px 24px;
                border-radius: 8px;
                font-size: 24px;
                font-weight: 700;
                text-align: center;
                margin-bottom: 16px;
                text-transform: uppercase;
                letter-spacing: 2px;
            ">
                {result.decision}
            </div>
            
            <div style="margin-bottom: 16px;">
                <div style="font-weight: 600; color: var(--text-secondary); margin-bottom: 8px;">
                    Rationale:
                </div>
                <div style="color: var(--text-primary); line-height: 1.6;">
                    {result.rationale}
                </div>
            </div>
            
            <div style="margin-bottom: 16px;">
                <div style="font-weight: 600; color: var(--text-secondary); margin-bottom: 8px;">
                    Gate Results:
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                    <div style="background: var(--bg-tertiary); padding: 12px; border-radius: 8px;">
                        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Gate-A (Basic)</div>
                        <div style="color: {'#10b981' if result.gate_a.passed else '#ef4444'}; font-weight: 600;">
                            {'✓ PASS' if result.gate_a.passed else '✗ FAIL'}
                        </div>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                            {result.gate_a.details}
                        </div>
                    </div>
"""
    
    if result.gate_b:
        html += f"""
                    <div style="background: var(--bg-tertiary); padding: 12px; border-radius: 8px;">
                        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Gate-B (Squall)</div>
                        <div style="color: {'#10b981' if result.gate_b.passed else '#ef4444'}; font-weight: 600;">
                            {'✓ PASS' if result.gate_b.passed else '✗ FAIL'}
                        </div>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                            {result.gate_b.details}
                        </div>
                    </div>
"""
    
    html += f"""
                    <div style="background: var(--bg-tertiary); padding: 12px; border-radius: 8px;">
                        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">Gate-C (Window)</div>
                        <div style="color: {'#10b981' if result.gate_c.passed else '#ef4444'}; font-weight: 600;">
                            {'✓ PASS' if result.gate_c.passed else '✗ FAIL'}
                        </div>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                            {result.gate_c.details}
                        </div>
                    </div>
                </div>
            </div>
            
            <div style="margin-bottom: 16px;">
                <div style="font-weight: 600; color: var(--text-secondary); margin-bottom: 8px;">
                    Operational Limits:
                </div>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 13px;">
                    <div style="color: var(--text-primary);">
                        <span style="color: var(--text-muted);">Wave (Hs):</span> ≤{limits.Hs_limit_m}m
                    </div>
                    <div style="color: var(--text-primary);">
                        <span style="color: var(--text-muted);">Wind:</span> ≤{limits.Wind_limit_kt}kt
                    </div>
                    <div style="color: var(--text-primary);">
                        <span style="color: var(--text-muted);">Peak Wave (Hmax):</span> ≤{limits.Hmax_allow_m}m
                    </div>
                    <div style="color: var(--text-primary);">
                        <span style="color: var(--text-muted);">Required Window:</span> {limits.SailingTime_hr + limits.Reserve_hr}hr
                    </div>
                </div>
            </div>
            
            <div>
                <div style="font-weight: 600; color: var(--text-secondary); margin-bottom: 8px;">
                    Recommendations:
                </div>
                <ul style="margin: 0; padding-left: 20px; color: var(--text-primary); line-height: 1.8;">
"""
    
    for rec in result.recommendations:
        html += f"                    <li>{rec}</li>\n"
    
    html += """
                </ul>
            </div>
            
            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border-subtle); font-size: 12px; color: var(--text-muted); text-align: center;">
                Last Evaluated: """ + datetime.now().strftime("%Y-%m-%d %H:%M UTC") + """
            </div>
        </div>
"""
    
    return html


def run_gonogo_from_json(
    weather_json_path: str,
    limits: Optional[GoNoGoLimits] = None,
    use_gate_b: bool = True
) -> GoNoGoResult:
    """
    Run Go/No-Go evaluation from weather JSON file
    
    Expected JSON format:
    {
        "forecast": [
            {
                "timestamp": "2026-02-02T06:00:00Z",
                "wave_ft": 6.5,
                "wind_kt": 18.0,
                "wave_period_s": 8.0
            },
            ...
        ]
    }
    """
    if limits is None:
        limits = GoNoGoLimits()
    
    with open(weather_json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    weather_series = []
    for item in data.get('forecast', []):
        weather_series.append(WeatherInput(
            wave_ft=item['wave_ft'],
            wind_kt=item['wind_kt'],
            timestamp=datetime.fromisoformat(item['timestamp'].replace('Z', '+00:00')),
            wave_period_s=item.get('wave_period_s')
        ))
    
    return evaluate_go_nogo(weather_series, limits, use_gate_b)


def run_gonogo_manual(
    wave_ft_series: List[float],
    wind_kt_series: List[float],
    limits: Optional[GoNoGoLimits] = None,
    use_gate_b: bool = True
) -> GoNoGoResult:
    """
    Run Go/No-Go evaluation from manual input arrays
    
    Args:
        wave_ft_series: List of wave heights in feet (hourly)
        wind_kt_series: List of wind speeds in knots (hourly)
        limits: Operational limits (uses defaults if None)
        use_gate_b: Whether to apply Gate-B squall buffer logic
    """
    if limits is None:
        limits = GoNoGoLimits()
    
    if len(wave_ft_series) != len(wind_kt_series):
        raise ValueError("wave_ft_series and wind_kt_series must have same length")
    
    weather_series = []
    base_time = datetime.now()
    for i, (wave_ft, wind_kt) in enumerate(zip(wave_ft_series, wind_kt_series)):
        weather_series.append(WeatherInput(
            wave_ft=wave_ft,
            wind_kt=wind_kt,
            timestamp=base_time + timedelta(hours=i)
        ))
    
    return evaluate_go_nogo(weather_series, limits, use_gate_b)


def main():
    """
    Command-line interface for weather Go/No-Go evaluation
    
    Usage:
        python weather_go_nogo.py --json weather_forecast.json
        python weather_go_nogo.py --manual "6.5,7.0,6.8,6.2" "18,20,19,17"
    """
    import argparse
    
    parser = argparse.ArgumentParser(
        description="SEA TRANSIT Weather Go/No-Go Evaluation (Pipeline Step 4)"
    )
    parser.add_argument(
        '--json',
        help='Path to weather forecast JSON file'
    )
    parser.add_argument(
        '--manual-wave',
        help='Comma-separated wave heights in feet (hourly)'
    )
    parser.add_argument(
        '--manual-wind',
        help='Comma-separated wind speeds in knots (hourly)'
    )
    parser.add_argument(
        '--hs-limit',
        type=float,
        default=3.0,
        help='Max significant wave height (m), default=3.0'
    )
    parser.add_argument(
        '--wind-limit',
        type=float,
        default=25.0,
        help='Max wind speed (kt), default=25.0'
    )
    parser.add_argument(
        '--sailing-time',
        type=float,
        default=8.0,
        help='Expected sailing time (hr), default=8.0'
    )
    parser.add_argument(
        '--reserve',
        type=float,
        default=4.0,
        help='Reserve time (hr), default=4.0'
    )
    parser.add_argument(
        '--no-gate-b',
        action='store_true',
        help='Disable Gate-B squall buffer evaluation'
    )
    parser.add_argument(
        '--output-html',
        help='Output HTML file path (for integration into AGI TR SCHEDULE)'
    )
    
    args = parser.parse_args()
    
    # Create limits
    limits = GoNoGoLimits(
        Hs_limit_m=args.hs_limit,
        Wind_limit_kt=args.wind_limit,
        SailingTime_hr=args.sailing_time,
        Reserve_hr=args.reserve
    )
    
    # Run evaluation
    if args.json:
        if not os.path.exists(args.json):
            print(f"Error: JSON file not found: {args.json}")
            return
        result = run_gonogo_from_json(args.json, limits, not args.no_gate_b)
    elif args.manual_wave and args.manual_wind:
        wave_series = [float(x.strip()) for x in args.manual_wave.split(',')]
        wind_series = [float(x.strip()) for x in args.manual_wind.split(',')]
        result = run_gonogo_manual(wave_series, wind_series, limits, not args.no_gate_b)
    else:
        print("Error: Must provide either --json or both --manual-wave and --manual-wind")
        parser.print_help()
        return
    
    # Print result
    print("\n" + "="*60)
    print("SEA TRANSIT WEATHER GO/NO-GO EVALUATION")
    print("="*60)
    print(f"\nDecision: {result.decision}")
    print(f"\nRationale: {result.rationale}")
    
    if result.reason_codes:
        print(f"\nReason Codes: {', '.join(result.reason_codes)}")
    
    print(f"\nGate-A (Basic Threshold): {'PASS' if result.gate_a.passed else 'FAIL'}")
    print(f"  {result.gate_a.details}")
    
    if result.gate_b:
        print(f"\nGate-B (Squall Buffer): {'PASS' if result.gate_b.passed else 'FAIL'}")
        print(f"  {result.gate_b.details}")
    
    print(f"\nGate-C (Continuous Window): {'PASS' if result.gate_c.passed else 'FAIL'}")
    print(f"  {result.gate_c.details}")
    
    print("\nRecommendations:")
    for i, rec in enumerate(result.recommendations, 1):
        print(f"  {i}. {rec}")
    
    # Save HTML if requested
    if args.output_html:
        html_output = format_html_output(result, limits)
        with open(args.output_html, 'w', encoding='utf-8') as f:
            f.write(html_output)
        print(f"\nHTML output saved to: {args.output_html}")
    
    print("\n" + "="*60 + "\n")


if __name__ == "__main__":
    main()
