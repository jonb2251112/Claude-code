import { BLITZ_POOL_SIZE, DEFAULT_POOL_SIZE } from '../../config/constants';
import type { EmojiType } from '../../types/tile';

/**
 * Active emoji spawn pool. Hero is always retained when shrinking for Blitz.
 */
export class TilePool {
  private base: EmojiType[];
  private active: EmojiType[];
  private removedForBlitz: EmojiType | null = null;
  private readonly hero: EmojiType;

  constructor(pool: EmojiType[], hero: EmojiType) {
    if (pool.length !== DEFAULT_POOL_SIZE) {
      throw new Error(`TilePool expects ${DEFAULT_POOL_SIZE} emoji types`);
    }
    if (!pool.includes(hero)) {
      throw new Error('Hero emoji must be present in the pool');
    }
    this.base = [...pool];
    this.active = [...pool];
    this.hero = hero;
  }

  get types(): ReadonlyArray<EmojiType> {
    return this.active;
  }

  get heroEmoji(): EmojiType {
    return this.hero;
  }

  /** Enter Blitz: drop one non-hero type at random via rng. */
  enterBlitz(rng: () => number): EmojiType {
    const candidates = this.base.filter((t) => t !== this.hero);
    const idx = Math.floor(rng() * candidates.length);
    const removed = candidates[idx];
    this.removedForBlitz = removed;
    this.active = this.base.filter((t) => t !== removed);
    if (this.active.length !== BLITZ_POOL_SIZE) {
      // Guard if pool composition unexpected
      this.active = this.active.slice(0, BLITZ_POOL_SIZE);
      if (!this.active.includes(this.hero)) this.active[0] = this.hero;
    }
    return removed;
  }

  exitBlitz(): void {
    this.removedForBlitz = null;
    this.active = [...this.base];
  }

  get blitzRemoved(): EmojiType | null {
    return this.removedForBlitz;
  }

  pick(rng: () => number): EmojiType {
    const i = Math.floor(rng() * this.active.length);
    return this.active[i];
  }
}
