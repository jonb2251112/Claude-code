import { COLUMN_CRUSH_COUNT } from '../../config/balance';
import { GRID_COLS, GRID_ROWS } from '../../config/constants';
import type { Cell } from '../../types/tile';
import type { ICharacterSpell, SpellContext, SpellResult } from '../ICharacterSpell';

/** Clears N random columns. */
export class ColumnCrushSpell implements ICharacterSpell {
  readonly id = 'column_crush';
  readonly displayName = 'Pillar Drop';

  execute(ctx: SpellContext): SpellResult {
    const cols = Array.from({ length: GRID_COLS }, (_, i) => i);
    const chosen: number[] = [];
    for (let i = 0; i < COLUMN_CRUSH_COUNT && cols.length; i++) {
      const idx = Math.floor(ctx.rng() * cols.length);
      chosen.push(cols.splice(idx, 1)[0]);
    }
    const cells: Cell[] = [];
    for (const c of chosen) {
      for (let r = 0; r < GRID_ROWS; r++) cells.push({ r, c });
    }
    return { clearCells: cells };
  }
}
