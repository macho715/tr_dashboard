# -*- coding: utf-8 -*-
"""Create AGI TR SCHEDULE_20260201.html with daily update (notice + weather date)."""
from pathlib import Path

SRC = Path(__file__).resolve().parent / "AGI TR SCHEDULE_20260130.html"
OUT = Path(__file__).resolve().parent / "AGI TR SCHEDULE_20260201.html"

OLD_NOTICE = """                    <strong style="color: var(--accent-amber); font-weight: 600;">2026-01-30</strong><br>
                    <strong>AGI Transformers (TR) – Status Update</strong><br>
                    • <strong>27 Jan:</strong> Deck preparation completed.<br>
                    • <strong>28 Jan:</strong> <strong>PTW</strong> rejected by <strong>HM</strong> due to missing <strong>linkspan certificate</strong>.<br>
                    • <strong>28–29 Jan:</strong> <strong>MMT</strong> unable to provide the required certificate/report; linkspan was designed/fabricated by their predecessor (<strong>ALE</strong>), and no <strong>Technical Test Report</strong> is available.<br>
                    • <strong>29 Jan:</strong> Sequential meetings held (<strong>SCT/MMT/OFCO/MWS → Port HM → Operations Manager</strong>) to explain the situation and seek approval.<br>
                    • <strong>30 Jan:</strong> <strong>OFCO</strong> and <strong>SCT</strong> to submit an <strong>Undertaking Letter</strong> (valid for <strong>1st trip only</strong>); <strong>PTW</strong> approval pending."""

NEW_NOTICE = """                    <strong style="color: var(--accent-amber); font-weight: 600;">2026-02-01</strong><br>"""

def main():
    text = SRC.read_text(encoding="utf-8")
    text = text.replace(OLD_NOTICE, NEW_NOTICE)
    text = text.replace("Last Updated: 30 Jan 2026 |", "Last Updated: 01 Feb 2026 |")
    OUT.write_text(text, encoding="utf-8")
    print(f"Created {OUT.name}")

if __name__ == "__main__":
    main()
