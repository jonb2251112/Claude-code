export class SoundManager {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private masterGain: GainNode | null = null;

  init(): void {
    if (this.ctx) return;
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);
    } catch {
      this.enabled = false;
    }
  }

  resume(): void {
    this.init();
    this.ctx?.resume();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  playMatch(combo: number): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    const freq = 440 + combo * 80;
    this.playTone(freq, 0.12, 'sine', 0.15);
    setTimeout(() => this.playTone(freq * 1.25, 0.08, 'sine', 0.1), 50);
  }

  playSwap(): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    this.playTone(330, 0.06, 'triangle', 0.08);
  }

  playInvalid(): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    this.playTone(180, 0.15, 'sawtooth', 0.06);
  }

  playPowerUp(): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.15, 'sine', 0.12), i * 60);
    });
  }

  playBlitz(): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    [440, 554, 659, 880].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.2, 'square', 0.1), i * 80);
    });
  }

  playAbility(): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    this.playTone(880, 0.1, 'sine', 0.12);
    setTimeout(() => this.playTone(1100, 0.15, 'sine', 0.1), 80);
  }

  playGameOver(won: boolean): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    if (won) {
      [523, 659, 784, 1047, 1319].forEach((f, i) => {
        setTimeout(() => this.playTone(f, 0.25, 'sine', 0.12), i * 120);
      });
    } else {
      [400, 350, 300].forEach((f, i) => {
        setTimeout(() => this.playTone(f, 0.3, 'sine', 0.1), i * 200);
      });
    }
  }

  playCascade(level: number): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    this.playTone(500 + level * 100, 0.08, 'sine', 0.08);
  }

  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType,
    volume: number
  ): void {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }
}

export const soundManager = new SoundManager();
