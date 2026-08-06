import type { CloudAxis, EmojiType, Tile, TileKind } from '../../types/tile';
import type { GridModel } from '../model/GridModel';
import type { TilePool } from '../model/TilePool';

export class TileFactory {
  constructor(
    private readonly grid: GridModel,
    private readonly pool: TilePool,
    private readonly rng: () => number,
  ) {}

  normal(emojiType?: EmojiType): Tile {
    return {
      uid: this.grid.allocUid(),
      kind: 'Normal',
      emojiType: emojiType ?? this.pool.pick(this.rng),
    };
  }

  special(kind: Exclude<TileKind, 'Normal'>, cloudAxis?: CloudAxis): Tile {
    return {
      uid: this.grid.allocUid(),
      kind,
      emojiType: null,
      cloudAxis: kind === 'LightningCloud' ? cloudAxis ?? 'row' : undefined,
    };
  }

  /** Fill entire board with no immediate matches (best-effort reshuffle). */
  fillBoardAvoidingMatches(maxAttempts = 40): void {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      for (let r = 0; r < this.grid.rows; r++) {
        for (let c = 0; c < this.grid.cols; c++) {
          this.grid.set(r, c, this.normalAvoiding(r, c));
        }
      }
      // Caller may run MatchEngine; if matches exist, reshuffle.
      return;
    }
  }

  private normalAvoiding(r: number, c: number): Tile {
    const forbidden = new Set<EmojiType>();
    if (c >= 2) {
      const a = this.grid.get(r, c - 1);
      const b = this.grid.get(r, c - 2);
      if (
        a?.kind === 'Normal' &&
        b?.kind === 'Normal' &&
        a.emojiType != null &&
        a.emojiType === b.emojiType
      ) {
        forbidden.add(a.emojiType);
      }
    }
    if (r >= 2) {
      const a = this.grid.get(r - 1, c);
      const b = this.grid.get(r - 2, c);
      if (
        a?.kind === 'Normal' &&
        b?.kind === 'Normal' &&
        a.emojiType != null &&
        a.emojiType === b.emojiType
      ) {
        forbidden.add(a.emojiType);
      }
    }
    const options = this.pool.types.filter((t) => !forbidden.has(t));
    const pickFrom = options.length > 0 ? options : [...this.pool.types];
    const emoji = pickFrom[Math.floor(this.rng() * pickFrom.length)];
    return this.normal(emoji);
  }
}
