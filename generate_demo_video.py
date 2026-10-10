import os
import sys
import time
import asyncio
import subprocess
import requests
import edge_tts
from playwright.sync_api import sync_playwright

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DOCS_DIR = os.path.join(BASE_DIR, "docs")
os.makedirs(DOCS_DIR, exist_ok=True)

TEMP_DIR = os.path.join(BASE_DIR, "temp_video_build")
os.makedirs(TEMP_DIR, exist_ok=True)

VOICEOVER_MP3 = os.path.join(BASE_DIR, "temp_voiceover.mp3")
FINAL_MP4 = os.path.join(DOCS_DIR, "astropulse_demo_presentation.mp4")

BACKEND_URL = "http://127.0.0.1:8000"
FRONTEND_URL = "http://localhost:3000"
VOICE = "en-US-ChristopherNeural"

# Timeline parameters (in seconds)
# Part 1: starts at 1.5s
# Part 2: starts at 20.5s
# Part 3: starts at 42.5s
# Part 4: starts at 67.5s
# Part 5: starts at 89.5s
TIMELINE = {
    "p1_start": 1.5,
    "p2_start": 20.5,
    "p3_start": 42.5,
    "p4_start": 67.5,
    "p5_start": 89.5,
    "total_video_duration": 108.0
}

SCRIPT_PARAGRAPHS = [
    ("part1", "In deep space transit, Earth is a 20-minute radio ping away. When an acute clinical crisis strikes an astronaut aboard the Orion capsule, waiting for Houston is fatal. Cloud-dependent AI fails in deep space. Meet AstroPulse Systems."),
    ("part2", "AstroPulse is a zero-cloud, edge-native bio-telemetry cockpit engineered directly for spacecraft compute. Ingesting continuous high-frequency vitals and ECLSS atmospheric telemetry, it maintains personalized adaptive baselines for each crew member, distinguishing normal athletic physiology from acute distress."),
    ("part3", "Watch as we simulate an acute in-flight crisis: rapid hypoxemic desaturation. Within milliseconds, our onboard Isolation Forest engine isolates the primary failure vector: arterial oxygen drop with compensatory tachycardia. No internet. No external API. Pure on-device clinical inference."),
    ("part4", "AstroPulse doesn't just plot anomalies, it drives recovery. Following NASA Flight Medicine SOPs, the crew receives actionable emergency directives. As each step is verified, our dynamic closed-loop feedback pipeline stabilizes the astronaut's vitals back to nominal equilibrium."),
    ("part5", "All telemetry frames are cached in an offline rolling blackbox buffer, ready for burst downlink whenever Earth telemetry windows open. AstroPulse Systems: autonomous physiological resilience for humanity's journey to Mars and beyond.")
]

async def generate_narration_audio():
    print("\n--- STEP 1: Generating Narration Segments with edge-tts ---")
    audio_files = []
    for tag, text in SCRIPT_PARAGRAPHS:
        out_file = os.path.join(TEMP_DIR, f"{tag}.mp3")
        print(f"Generating {tag}.mp3 ({len(text)} chars)...")
        comm = edge_tts.Communicate(text, VOICE, rate="-3%")
        await comm.save(out_file)
        audio_files.append(out_file)

    print("\n--- STEP 2: Assembling Synchronized Master Audio Track with FFmpeg ---")
    d1 = int(TIMELINE["p1_start"] * 1000)
    d2 = int(TIMELINE["p2_start"] * 1000)
    d3 = int(TIMELINE["p3_start"] * 1000)
    d4 = int(TIMELINE["p4_start"] * 1000)
    d5 = int(TIMELINE["p5_start"] * 1000)

    filter_complex = (
        f"[0:a]adelay={d1}|{d1}[a0];"
        f"[1:a]adelay={d2}|{d2}[a1];"
        f"[2:a]adelay={d3}|{d3}[a2];"
        f"[3:a]adelay={d4}|{d4}[a3];"
        f"[4:a]adelay={d5}|{d5}[a4];"
        f"[a0][a1][a2][a3][a4]amix=inputs=5:dropout_transition=0:normalize=0[aout]"
    )

    cmd = [
        "ffmpeg", "-y",
        "-i", audio_files[0],
        "-i", audio_files[1],
        "-i", audio_files[2],
        "-i", audio_files[3],
        "-i", audio_files[4],
        "-filter_complex", filter_complex,
        "-map", "[aout]",
        VOICEOVER_MP3
    ]
    subprocess.run(cmd, check=True)
    print(f"Master voiceover generated: {VOICEOVER_MP3}")

def reset_simulation():
    try:
        requests.post(f"{BACKEND_URL}/api/simulate/reset", timeout=5)
    except Exception as e:
        print(f"Simulation reset warning: {e}")

def trigger_crisis():
    try:
        requests.post(
            f"{BACKEND_URL}/api/simulate/crisis",
            json={"mode": "HYPOXIA_CRITICAL", "astronaut_id": "CDR-01"},
            timeout=5
        )
    except Exception as e:
        print(f"Simulation crisis trigger warning: {e}")

def record_screen_session():
    print("\n--- STEP 3: Recording Choreographed Cockpit Session with Playwright ---")
    reset_simulation()
    rec_dir = os.path.join(TEMP_DIR, "screen_rec")
    os.makedirs(rec_dir, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            record_video_dir=rec_dir,
            record_video_size={"width": 1920, "height": 1080}
        )
        page = context.new_page()

        print("Opening cockpit at http://localhost:3000...")
        page.goto(FRONTEND_URL, wait_until="networkidle")
        page.wait_for_selector("text=1Hz REALTIME STREAM", timeout=15000)
        page.add_style_tag(content="* { cursor: default; }")

        # Initial baseline selection
        page.locator("text=Sarah Vance").first.click(force=True)
        page.wait_for_timeout(1000)

        # Synchronized timeline runner
        start_time = time.time()
        def wait_until(target_s):
            now = time.time() - start_time
            rem = target_s - now
            if rem > 0:
                page.wait_for_timeout(int(rem * 1000))

        print("[T=0.0s] Beginning synchronized sequence...")

        # -------------------------------------------------------------
        # Phase 1: Intro & Nominal System Overview (0s -> 20.5s)
        # -------------------------------------------------------------
        print("[T=8.0s] Phase 1: Highlighting nominal vitals & trend waves...")
        wait_until(8.0)
        page.evaluate("window.scrollBy({ top: 260, behavior: 'smooth' })")
        
        wait_until(15.0)
        page.evaluate("window.scrollTo({ top: 0, behavior: 'smooth' })")

        # -------------------------------------------------------------
        # Phase 2: Crew Personalization & Adaptive Baselines (20.5s -> 42.5s)
        # -------------------------------------------------------------
        print("[T=20.5s] Phase 2: Demonstrating astronaut baseline adaptations...")
        wait_until(21.5)
        print("  -> Selecting Mark Chen (Athletic baseline)...")
        page.locator("text=Mark Chen").first.click(force=True)

        wait_until(30.0)
        print("  -> Selecting Elena Rostova (Medical Officer)...")
        page.locator("text=Elena Rostova").first.click(force=True)

        wait_until(37.0)
        print("  -> Returning focus to Commander Sarah Vance...")
        page.locator("text=Sarah Vance").first.click(force=True)

        # -------------------------------------------------------------
        # Phase 3: Acute Crisis Simulation & Edge ML Inference (42.5s -> 67.5s)
        # -------------------------------------------------------------
        print("[T=42.5s] Phase 3: Simulating Acute In-Flight Hypoxia Crisis...")
        wait_until(43.5)
        trigger_crisis()

        wait_until(46.0)
        page.wait_for_selector("text=CRITICAL EMERGENCY", timeout=8000)
        print("  -> Crisis alert banner active with Edge ML confidence score!")

        wait_until(52.0)
        print("  -> Scrolling to live trend waves showing SpO2 plunge...")
        page.evaluate("window.scrollBy({ top: 380, behavior: 'smooth' })")

        wait_until(63.0)
        print("  -> Scrolling back to top to access clinical protocols...")
        page.evaluate("window.scrollTo({ top: 0, behavior: 'smooth' })")

        # -------------------------------------------------------------
        # Phase 4: NASA Flight Medicine SOP & Closed-Loop Recovery (67.5s -> 89.5s)
        # -------------------------------------------------------------
        print("[T=67.5s] Phase 4: Engaging NASA Clinical SOPs & Closed-Loop Recovery...")
        wait_until(68.5)
        print("  -> Opening Emergency SOP Drawer...")
        page.locator("text=VIEW EMERGENCY PROTOCOL").click(force=True)
        page.wait_for_selector("text=MANDATORY CLINICAL DIRECTIVES", timeout=6000)

        wait_until(71.0)
        print("  -> Verifying Step 1 (O2 Mask Sealed 100% FiO2)...")
        s1 = page.locator("text=STEP 1: O2 MASK SEALED").first
        if s1.is_visible(): s1.click(force=True)

        wait_until(73.5)
        print("  -> Verifying Step 2 (ECLSS Scrubber Valve Override)...")
        s2 = page.locator("text=STEP 2: ECLSS SCRUBBER").first
        if s2.is_visible(): s2.click(force=True)

        wait_until(76.0)
        print("  -> Verifying Step 3 (IV Fluid Saline Preload)...")
        s3 = page.locator("text=STEP 3: IV FLUID SALINE").first
        if s3.is_visible(): s3.click(force=True)

        wait_until(78.5)
        print("  -> Verifying Step 4 (Restrict High-g Movement & Supine)...")
        s4 = page.locator("text=STEP 4: RESTRICT HIGH-G").first
        if s4.is_visible(): s4.click(force=True)
        print("  -> All 4 steps verified: Closed-loop recovery engaged automatically!")

        wait_until(81.0)
        print("  -> Closing checklist drawer to observe real-time recovery trajectory...")
        close_btn = page.locator("button:has(svg.lucide-x)")
        if close_btn.count() > 0: close_btn.first.click(force=True)

        # -------------------------------------------------------------
        # Phase 5: Blackbox Downlink & 30-Day Long-Duration Analytics (89.5s -> 108.0s)
        # -------------------------------------------------------------
        print("[T=89.5s] Phase 5: Telemetry Blackbox & Long-Term Exposure Analytics...")
        wait_until(90.5)
        print("  -> Expanding Blackbox Export dropdown...")
        page.locator("text=BLACKBOX").first.click(force=True)

        wait_until(94.0)
        print("  -> Toggling 30-Day Microgravity Degradation Analytics...")
        page.locator("text=BLACKBOX").first.click(force=True)  # close menu
        page.locator("text=30-DAY ANALYTICS").first.click(force=True)
        page.wait_for_selector("text=Long-Duration Microgravity Degradation Analytics", timeout=5000)

        wait_until(96.0)
        page.evaluate("window.scrollBy({ top: 160, behavior: 'smooth' })")

        wait_until(100.5)
        print("  -> Switching horizon to 90 Days...")
        h90 = page.locator("button:has-text('90 DAYS')")
        if h90.is_visible(): h90.click(force=True)

        wait_until(104.0)
        page.evaluate("window.scrollTo({ top: 0, behavior: 'smooth' })")
        page.locator("text=30-DAY ANALYTICS").first.click(force=True)  # close analytics

        wait_until(TIMELINE["total_video_duration"])
        print("[T=108.0s] Recording completed cleanly!")

        context.close()
        video_path = page.video.path()
        browser.close()
        reset_simulation()
        return video_path

def merge_video_and_audio(raw_video_path):
    print("\n--- STEP 4: Muxing High-Definition MP4 with FFmpeg ---")
    cmd = [
        "ffmpeg", "-y",
        "-i", raw_video_path,
        "-i", VOICEOVER_MP3,
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        FINAL_MP4
    ]
    print("Executing FFmpeg muxing command...")
    subprocess.run(cmd, check=True)
    print(f"\nSUCCESS! Demo presentation created at:\n{FINAL_MP4}")

def main():
    print("=======================================================")
    print(" AstroPulse Systems — Automated Demo Video Pipeline")
    print("=======================================================")
    
    # 1. Generate Voiceover
    asyncio.run(generate_narration_audio())

    # 2. Record Playwright session
    raw_video = record_screen_session()
    print(f"Raw Playwright video recorded: {raw_video}")

    # 3. Merge video with voiceover
    merge_video_and_audio(raw_video)

    # 4. Check output file size and details
    if os.path.exists(FINAL_MP4):
        size_mb = os.path.getsize(FINAL_MP4) / (1024 * 1024)
        print(f"\nFinal File Size: {size_mb:.2f} MB")
        # Run ffmpeg probe on output
        res = subprocess.run(["ffmpeg", "-i", FINAL_MP4], capture_output=True, text=True)
        for line in res.stderr.splitlines():
            if "Duration" in line or "Stream #0" in line:
                print(f"  {line.strip()}")

if __name__ == "__main__":
    main()
