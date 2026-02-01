# -*- coding: utf-8 -*-
"""One-off daily update: 2026-02-01. Updates Operational Notice + Weather blocks."""
from pathlib import Path

FILES_DIR = Path(__file__).resolve().parent
SRC = FILES_DIR / "AGI TR SCHEDULE_20260130.html"
OUT = FILES_DIR / "AGI TR SCHEDULE_20260201.html"

# Operational Notice: date only (no content per spec when user doesn't provide)
NOTICE_OLD = """        <!-- Operational Notice -->
        <div class="weather-alert"
            style="border-color: rgba(6, 182, 212, 0.4); background: linear-gradient(135deg, rgba(6, 182, 212, 0.12), rgba(20, 184, 166, 0.06)); padding: 16px 24px;">
            <span class="icon">\ud83d\udce2</span>
            <div class="content">
                <p style="margin: 0; font-size: 12px; color: var(--text-secondary); line-height: 1.7;">
                    <strong style="color: var(--accent-amber); font-weight: 600;">2026-01-30</strong><br>
                    <strong>AGI Transformers (TR) \u2013 Status Update</strong><br>
                    \u2022 <strong>27 Jan:</strong> Deck preparation completed.<br>
                    \u2022 <strong>28 Jan:</strong> Load-out V1 commenced.<br>
                    \u2022 <strong>29 Jan:</strong> Sail V1 in progress.<br>
                    \u2022 <strong>30 Jan:</strong> Load-in V1 expected."""

NOTICE_NEW = """        <!-- Operational Notice -->
        <div class="weather-alert"
            style="border-color: rgba(6, 182, 212, 0.4); background: linear-gradient(135deg, rgba(6, 182, 212, 0.12), rgba(20, 184, 166, 0.06)); padding: 16px 24px;">
            <span class="icon">\ud83d\udce2</span>
            <div class="content">
                <p style="margin: 0; font-size: 12px; color: var(--text-secondary); line-height: 1.7;">
                    <strong style="color: var(--accent-amber); font-weight: 600;">2026-02-01</strong><br>"""

# Weather: Last Updated + 4-day placeholder
WEATHER_OLD = "Last Updated: 30 Jan 2026 |"
WEATHER_NEW = "Last Updated: 01 Feb 2026 |"

def main():
    text = SRC.read_text(encoding="utf-8")
    # Find and replace notice block - use partial match since full block may vary
    if "2026-01-30</strong><br>" in text and "Operational Notice" in text:
        # Replace from Operational Notice to end of that div (before KPI Grid)
        import re
        pat = re.compile(
            r'(<!-- Operational Notice -->.*?<strong style="color: var\(--accent-amber\); font-weight: 600;">)2026-01-30(</strong><br>)(.*?)(<!-- KPI Grid -->)',
            re.DOTALL
        )
        def repl(m):
            return m.group(1) + "2026-02-01" + m.group(2) + m.group(4)
        text = pat.sub(repl, text, count=1)
        # Also clear notice content - keep only date
        text = text.replace(
            "<strong>AGI Transformers (TR) – Status Update</strong><br>\n                    • <strong>27 Jan:</strong> Deck preparation completed.<br>\n                    • <strong>28 Jan:</strong> Load-out V1 commenced.<br>\n                    • <strong>29 Jan:</strong> Sail V1 in progress.<br>\n                    • <strong>30 Jan:</strong> Load-in V1 expected.",
            "",
            1
        )
    text = text.replace(WEATHER_OLD, WEATHER_NEW)
    OUT.write_text(text, encoding="utf-8")
    print(f"Created {OUT.name}")

if __name__ == "__main__":
    main()
