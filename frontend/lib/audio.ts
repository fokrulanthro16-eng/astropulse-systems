"use client";

class CockpitAudioSynthesizer {
  private ctx: AudioContext | null = null;
  public isMuted: boolean = true; // Default muted until user interacts/unmutes
  private lastAlertTime: number = 0;

  private initContext() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  public toggleMute(): boolean {
    this.initContext();
    this.isMuted = !this.isMuted;
    if (!this.isMuted) {
      this.playChime(660, 0.08, 0.05);
    }
    return this.isMuted;
  }

  public playNominalPulse() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(520, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.015, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch {
      // Audio context might be restricted before interaction
    }
  }

  public playWarningAlert() {
    if (this.isMuted) return;
    const now = Date.now();
    if (now - this.lastAlertTime < 3000) return; // Rate limit to once every 3s
    this.lastAlertTime = now;

    this.initContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(587.33, t); // D5
      osc.frequency.setValueAtTime(739.99, t + 0.12); // F#5
      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.35);
    } catch {}
  }

  public playCriticalKlaxon() {
    if (this.isMuted) return;
    const now = Date.now();
    if (now - this.lastAlertTime < 2500) return; // Rate limit to once every 2.5s
    this.lastAlertTime = now;

    this.initContext();
    if (!this.ctx) return;

    try {
      const t = this.ctx.currentTime;
      // High-urgency alternating aerospace tone
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.setValueAtTime(660, t + 0.15);
      osc.frequency.setValueAtTime(880, t + 0.30);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.50);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.50);
    } catch {}
  }

  private playChime(freq: number, duration: number, volume: number) {
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(volume, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + duration);
    } catch {}
  }
}

export const cockpitAudio = new CockpitAudioSynthesizer();
