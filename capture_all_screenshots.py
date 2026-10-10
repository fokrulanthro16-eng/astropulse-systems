import os
import sys
import time
import requests
from playwright.sync_api import sync_playwright

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "docs", "screenshots")
os.makedirs(OUTPUT_DIR, exist_ok=True)

BACKEND_URL = "http://127.0.0.1:8000"
FRONTEND_URL = "http://localhost:3000"

def reset_simulation():
    try:
        requests.post(f"{BACKEND_URL}/api/simulate/reset", timeout=5)
        time.sleep(1)
    except Exception as e:
        print(f"Warning resetting simulation: {e}")

def trigger_crisis(astronaut_id="CDR-01"):
    try:
        requests.post(
            f"{BACKEND_URL}/api/simulate/crisis",
            json={"mode": "HYPOXIA_CRITICAL", "astronaut_id": astronaut_id},
            timeout=5
        )
    except Exception as e:
        print(f"Warning triggering crisis: {e}")

def main():
    print("=== AstroPulse Systems Screenshot Suite ===")
    reset_simulation()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            device_scale_factor=1
        )
        page = context.new_page()

        print("Navigating to Cockpit UI...")
        page.goto(FRONTEND_URL, wait_until="networkidle")
        page.wait_for_selector("text=1Hz REALTIME STREAM", timeout=15000)
        page.add_style_tag(content="* { cursor: none !important; }")
        print("Connected to telemetry stream.")

        # -------------------------------------------------------------------------
        # 1. 01_nominal_cockpit.png - Standard nominal state (Sarah Vance)
        # -------------------------------------------------------------------------
        print("\n[1/6] Capturing 01_nominal_cockpit.png...")
        page.locator("text=Sarah Vance").first.click(force=True)
        time.sleep(3)  # Allow several nominal telemetry ticks
        path_01 = os.path.join(OUTPUT_DIR, "01_nominal_cockpit.png")
        page.screenshot(path=path_01, full_page=True)
        print(f"Saved: {path_01}")

        # -------------------------------------------------------------------------
        # 2. 02_crisis_hypoxia_alert.png - Active crisis state
        # -------------------------------------------------------------------------
        print("\n[2/6] Triggering crisis & capturing 02_crisis_hypoxia_alert.png...")
        trigger_crisis("CDR-01")
        page.wait_for_selector("text=CRITICAL EMERGENCY", timeout=10000)
        time.sleep(4)  # Allow vitals to desaturate and trend line to drop
        path_02 = os.path.join(OUTPUT_DIR, "02_crisis_hypoxia_alert.png")
        page.screenshot(path=path_02, full_page=True)
        print(f"Saved: {path_02}")

        # -------------------------------------------------------------------------
        # 3. 03_emergency_sop_drawer.png - Clinical Checklist Drawer open
        # -------------------------------------------------------------------------
        print("\n[3/6] Opening SOP drawer & capturing 03_emergency_sop_drawer.png...")
        page.locator("text=VIEW EMERGENCY PROTOCOL").click(force=True)
        page.wait_for_selector("text=MANDATORY CLINICAL DIRECTIVES", timeout=5000)
        time.sleep(1)
        # Click first step to show verified state and mitigation progress bar
        step1 = page.locator("text=STEP 1: O2 MASK SEALED").first
        if step1.is_visible():
            step1.click(force=True)
            time.sleep(0.5)
        path_03 = os.path.join(OUTPUT_DIR, "03_emergency_sop_drawer.png")
        # For modal/drawer overlay, standard 1920x1080 viewport captures the full docked cockpit drawer
        page.screenshot(path=path_03, full_page=False)
        print(f"Saved: {path_03}")

        # Close drawer
        close_btn = page.locator("button:has(svg.lucide-x)")
        if close_btn.count() > 0:
            close_btn.first.click(force=True)
            time.sleep(1)

        # -------------------------------------------------------------------------
        # 4. 04_personalized_crew_switch.png - Focused on Specialist Mark Chen
        # -------------------------------------------------------------------------
        print("\n[4/6] Switching crew to Mark Chen & capturing 04_personalized_crew_switch.png...")
        reset_simulation()
        time.sleep(1)
        page.locator("text=Mark Chen").first.click(force=True)
        time.sleep(4)  # Allow WebSocket to stream Mark Chen's athletic baseline
        path_04 = os.path.join(OUTPUT_DIR, "04_personalized_crew_switch.png")
        page.screenshot(path=path_04, full_page=True)
        print(f"Saved: {path_04}")

        # -------------------------------------------------------------------------
        # 5. 05_long_term_exposure_analytics.png - 30-Day Degradation Tracker
        # -------------------------------------------------------------------------
        print("\n[5/6] Opening 30-Day Analytics & capturing 05_long_term_exposure_analytics.png...")
        page.locator("text=30-DAY ANALYTICS").first.click(force=True)
        page.wait_for_selector("text=Long-Duration Microgravity Degradation Analytics", timeout=5000)
        time.sleep(2)  # Allow area and line charts to render
        path_05 = os.path.join(OUTPUT_DIR, "05_long_term_exposure_analytics.png")
        page.screenshot(path=path_05, full_page=True)
        print(f"Saved: {path_05}")

        # Toggle analytics off
        page.locator("text=30-DAY ANALYTICS").first.click(force=True)
        time.sleep(1)

        # -------------------------------------------------------------------------
        # 6. 06_blackbox_export_menu.png - Blackbox telemetry export menu expanded
        # -------------------------------------------------------------------------
        print("\n[6/6] Expanding Blackbox export & capturing 06_blackbox_export_menu.png...")
        page.locator("text=BLACKBOX").first.click(force=True)
        page.wait_for_selector("text=Export Mission Log (.JSON)", timeout=5000)
        time.sleep(0.5)
        path_06 = os.path.join(OUTPUT_DIR, "06_blackbox_export_menu.png")
        page.screenshot(path=path_06, full_page=True)
        print(f"Saved: {path_06}")

        # Reset simulation back to nominal
        reset_simulation()
        browser.close()
        print("\n=== All 6 screenshots successfully captured! ===")

if __name__ == "__main__":
    main()
