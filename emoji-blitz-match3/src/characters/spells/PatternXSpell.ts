import { GRID_COLS, GRID_ROWS } from '../../config/constants';
import type { Cell } from '../../types/tile';
import type { ICharacterSpell, SpellContext, SpellResult } from '../ICharacterSpell';

/** Clears both main diagonals (X pattern). */
export class PatternXSpell implements ICharacterSpell {
  readonly id = 'pattern_x';
  readonly displayName = 'Crossburst';

  execute(_ctx: SpellContext): SpellResult {
    const cells: Cell[] = [];
    for (let i = 0; i < GRID_ROWS; i++) {
      cells.push({ r: i, c: i });
      cells.push({ r: i, c: GRID_COLS - 1 - i });
    }
    return { clearCells: cells };
  }
}
