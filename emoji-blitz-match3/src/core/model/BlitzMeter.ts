import {
  BLITZ_DECAY_PER_SEC,
  BLITZ_DURATION_SEC,
  BLITZ_FILL_PER_CLEAR,
} from '../../config/constants';

/**
 * Core Blitz Meter: +1% per cleared emoji, -2%/s idle decay, activates at 100%.
 */
export class BlitzMeter {
  private value = 0;
  private idle = true;
  private blitzRemaining = 0;
  private active = false;

  get percent(): number {
    return this.value;
  }

  get isActive(): boolean {
    return this.active;
  }

  get blitzTimeLeft(): number {
    return this.blitzRemaining;
  }

  markActivity(): void {
    this.idle = false;
  }

  /** Call once per frame after processing input; sets idle for next decay window. */
  beginFrame(): void {
    this.idle = true;
  }

  addClears(count: number): void {
    if (this.active) return;
    this.value = Math.min(100, this.value + count * BLITZ_FILL_PER_CLEAR);
  }

  /**
   * @returns true if Blitz Mode should activate this frame
   */
  tickDecay(dt: number, canDecay: boolean): boolean {
    if (this.active) return false;
    if (canDecay && this.idle && this.value > 0) {
      this.value = Math.max(0, this.value - BLITZ_DECAY_PER_SEC * dt);
    }
    if (this.value >= 100) {
      this.activate();
      return true;
    }
    return false;
  }

  activate(): void {
    this.active = true;
    this.value = 100;
    this.blitzRemaining = BLITZ_DURATION_SEC;
  }

  /**
   * @returns true when Blitz Mode just ended
   */
  tickBlitz(dt: number): boolean {
    if (!this.active) return false;
    this.blitzRemaining -= dt;
    if (this.blitzRemaining <= 0) {
      this.deactivate();
      return true;
    }
    return false;
  }

  /** Hold Blitz end until cascade finishes. */
  freezeBlitzEnd(): void {
    if (this.active && this.blitzRemaining < 0.0001) {
      this.blitzRemaining = 0.0001;
    }
  }

  deactivate(): void {
    this.active = false;
    this.value = 0;
    this.blitzRemaining = 0;
  }
}
