import { GUARANTEED_STAR_COUNT } from '../../config/balance';
import type { Cell } from '../../types/tile';
import type { ICharacterSpell, SpellContext, SpellResult } from '../ICharacterSpell';

/** Converts N random normal tiles into Rainbow Stars. */
export class GuaranteedStarsSpell implements ICharacterSpell {
  readonly id = 'guaranteed_stars';
  readonly displayName = 'Star Shower';

  execute(ctx: SpellContext): SpellResult {
    const normals: Cell[] = [];
    ctx.grid.forEach((t, r, c) => {
      if (t?.kind === 'Normal') normals.push({ r, c });
    });
    const picks: Cell[] = [];
    const pool = [...normals];
    for (let i = 0; i < GUARANTEED_STAR_COUNT && pool.length; i++) {
      const idx = Math.floor(ctx.rng() * pool.length);
      picks.push(pool.splice(idx, 1)[0]);
    }
    return {
      spawnSpecials: picks.map((cell) => ({ cell, kind: 'RainbowStar' as const })),
    };
  }
}
