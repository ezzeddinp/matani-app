"""Captures Fig. 4 (Matani NDVI chart and estimate panel, Krangkeng 2021) from a LOCAL web build.

    EXPO_PUBLIC_CHART_LANG=en npx expo start --web --port 8099   # against local Supabase, seeded with
    # seed-local-krangkeng-demo.py and import-ndvi-estimates.mjs (see .agent/evidence-register.md, Fig. 4 entries)
    uv run --no-project --with playwright python research/scripts/capture-fig4.py \
        --chromium "<Chromium binary>" --email demo@matani.local --password <local demo password> \
        --out docs/manuscripts/ml-fig-app.png

Selects the last estimate before the first measurement (the leading-gap panel the paper describes) and saves the
chart card plus the upper part of the panel as one image. Talks only to localhost.
"""

import argparse
from pathlib import Path

from playwright.sync_api import sync_playwright

LAHAN_ID = "6b7c1a52-2021-4c1e-9a6f-6b7261616e67"  # fixed by seed-local-krangkeng-demo.py
BASE = "http://localhost:8099"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--chromium", required=True)
    ap.add_argument("--email", required=True)
    ap.add_argument("--password", required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--width", type=int, default=400)
    args = ap.parse_args()
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=args.chromium)
        page = browser.new_page(viewport={"width": args.width, "height": 1400}, device_scale_factor=3)
        page.goto(f"{BASE}/auth/login", timeout=180_000)
        page.fill("input[placeholder='nama@email.com']", args.email)
        page.fill("input[placeholder='Masukkan password']", args.password)
        page.get_by_text("Masuk", exact=True).last.click()
        page.wait_for_url(lambda url: "/auth/" not in url, timeout=60_000)
        page.goto(f"{BASE}/detail-lahan-page?id={LAHAN_ID}")
        chart = page.locator("[aria-label^='Grafik deret waktu NDVI']")
        chart.wait_for(timeout=60_000)
        diamonds = chart.locator("path[stroke-dasharray]")
        boxes = sorted((b for b in (diamonds.nth(i).bounding_box() for i in range(diamonds.count())) if b), key=lambda b: b["x"])
        assert boxes, "no estimates on the chart"
        last = boxes[-1]  # rightmost estimate: the last one before the first measurement
        page.mouse.click(last["x"] + last["width"] / 2, last["y"] + last["height"] / 2)
        panel = page.get_by_text("Model-derived estimate", exact=True).first
        panel.wait_for(timeout=10_000)
        top = chart.locator("xpath=..").bounding_box()  # the chart frame: chart, date axis and legend
        # the panel is cut below its radar line; the model, version and rules note it carries are in the paper text
        radar = page.get_by_text("From Sentinel-1 radar", exact=False).first.bounding_box()
        clip = {"x": 0, "y": top["y"] - 8, "width": args.width, "height": radar["y"] + radar["height"] + 8 - (top["y"] - 8)}
        page.screenshot(path=str(args.out), clip=clip)
        print(f"saved {args.out} ({clip['width']}x{clip['height']:.0f} CSS px at 3x), {len(boxes)} estimates on the chart")
        browser.close()


if __name__ == "__main__":
    main()
