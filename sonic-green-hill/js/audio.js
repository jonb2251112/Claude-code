/** Lightweight procedural SFX via Web Audio API */
export class AudioBus {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx?.state === "suspended") this.ctx.resume();
  }

  tone(freq, dur = 0.08, type = "square", gain = 0.06, slide = 0) {
    if (!this.enabled) return;
    this.ensure();
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.linearRampToValueAtTime(freq + slide, t0 + dur);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  ring() {
    this.tone(880, 0.07, "square", 0.05);
    this.tone(1320, 0.09, "square", 0.035, 200);
  }

  jump() {
    this.tone(320, 0.1, "square", 0.05, 280);
  }

  spindash() {
    this.tone(180, 0.15, "sawtooth", 0.04, 420);
  }

  hurt() {
    this.tone(220, 0.18, "sawtooth", 0.06, -120);
  }

  spring() {
    this.tone(400, 0.12, "square", 0.05, 500);
  }

  checkpoint() {
    this.tone(520, 0.08, "square", 0.045);
    setTimeout(() => this.tone(780, 0.12, "square", 0.04), 80);
  }

  clear() {
    [523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.15, "square", 0.05), i * 90);
    });
  }

  stomp() {
    this.tone(140, 0.08, "triangle", 0.05, -40);
  }
}
