import { SCORE } from '../../config/balance';
import { BLITZ_SCORE_MULTIPLIER } from '../../config/constants';
import type { ClearReason } from '../../types/events';

export class ScoreModel {
  private score = 0;
  private blitzMultiplier = 1;

  get total(): number {
    return this.score;
  }

  setBlitzActive(active: boolean): void {
    this.blitzMultiplier = active ? BLITZ_SCORE_MULTIPLIER : 1;
  }

  baseForReason(reason: ClearReason): number {
    switch (reason) {
      case 'cloud':
        return SCORE.cloudClear;
      case 'sun':
        return SCORE.sunClear;
      case 'star':
        return SCORE.starClear;
      case 'combine':
        return SCORE.combineClear;
      case 'character':
      case 'match':
      case 'cascade':
      default:
        return SCORE.normalClear;
    }
  }

  /**
   * @param cellCount tiles cleared this step
   * @param cascadeDepth 0 for first clear in a resolve chain
   */
  award(cellCount: number, reason: ClearReason, cascadeDepth: number): number {
    const base = this.baseForReason(reason) * cellCount;
    const depthMul = 1 + SCORE.cascadeDepthBonus * Math.max(0, cascadeDepth);
    const delta = Math.floor(base * depthMul * this.blitzMultiplier);
    this.score += delta;
    return delta;
  }

  reset(): void {
    this.score = 0;
    this.blitzMultiplier = 1;
  }
}
