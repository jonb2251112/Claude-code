import { ROUND_DURATION_SEC } from '../../config/constants';

export class RoundTimer {
  private remaining: number;
  private paused = false;

  constructor(duration = ROUND_DURATION_SEC) {
    this.remaining = duration;
  }

  get timeLeft(): number {
    return this.remaining;
  }

  get isExpired(): boolean {
    return this.remaining <= 0;
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  get isPaused(): boolean {
    return this.paused;
  }

  /** Temporary pause from character spell (stacks conceptually by remaining time add). */
  addBonusTime(sec: number): void {
    this.remaining += sec;
  }

  tick(dt: number): void {
    if (this.paused) return;
    this.remaining = Math.max(0, this.remaining - dt);
  }

  reset(duration = ROUND_DURATION_SEC): void {
    this.remaining = duration;
    this.paused = false;
  }
}
