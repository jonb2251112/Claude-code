import { GRID_COLS, GRID_ROWS } from '../../config/constants';
import type { Cell, Tile, TileKind } from '../../types/tile';
import { cellKey, isSpecial } from '../../types/tile';
import type { GridModel } from '../model/GridModel';
import type { TileFactory } from './TileFactory';

export interface ClearPlan {
  cells: Cell[];
  reason: 'cloud' | 'sun' | 'star' | 'combine' | 'character' | 'match' | 'cascade';
  /** Optional in-place transforms before clears (Star + Cloud/Sun). */
  transforms?: Array<{ cell: Cell; kind: TileKind; cloudAxis?: 'row' | 'col' }>;
  /** After transforms, trigger these cells as specials. */
  triggerAfterTransform?: Cell[];
}

function uniqCells(cells: Cell[]): Cell[] {
  const seen = new Set<number>();
  const out: Cell[] = [];
  for (const cell of cells) {
    const k = cellKey(cell.r, cell.c);
    if (seen.has(k)) continue;
    if (cell.r < 0 || cell.r >= GRID_ROWS || cell.c < 0 || cell.c >= GRID_COLS) continue;
    seen.add(k);
    out.push(cell);
  }
  return out;
}

function rowCells(r: number): Cell[] {
  const out: Cell[] = [];
  for (let c = 0; c < GRID_COLS; c++) out.push({ r, c });
  return out;
}

function colCells(c: number): Cell[] {
  const out: Cell[] = [];
  for (let r = 0; r < GRID_ROWS; r++) out.push({ r, c });
  return out;
}

function blast3x3(center: Cell): Cell[] {
  const out: Cell[] = [];
  for (let r = center.r - 1; r <= center.r + 1; r++) {
    for (let c = center.c - 1; c <= center.c + 1; c++) {
      out.push({ r, c });
    }
  }
  return out;
}

/**
 * Special activation + power-combining recipes.
 */
export class SpecialResolver {
  /**
   * After a speculative swap, attempt special activation/combine.
   * Returns null if neither cell is special (caller should run MatchEngine).
   */
  resolveSwap(grid: GridModel, a: Cell, b: Cell, factory: TileFactory): ClearPlan | null {
    const ta = grid.getCell(a);
    const tb = grid.getCell(b);
    if (!ta || !tb) return null;

    const aSpecial = isSpecial(ta.kind);
    const bSpecial = isSpecial(tb.kind);

    if (aSpecial && bSpecial) {
      return this.combine(grid, a, ta, b, tb, factory);
    }
    if (aSpecial) return this.activate(grid, a, ta, b, tb);
    if (bSpecial) return this.activate(grid, b, tb, a, ta);
    return null;
  }

  private activate(
    grid: GridModel,
    specialCell: Cell,
    special: Tile,
    otherCell: Cell,
    other: Tile,
  ): ClearPlan {
    switch (special.kind) {
      case 'LightningCloud': {
        const axis = special.cloudAxis ?? 'row';
        const cells =
          axis === 'row' ? rowCells(specialCell.r) : colCells(specialCell.c);
        return { cells: uniqCells(cells), reason: 'cloud' };
      }
      case 'SunKing':
        return { cells: uniqCells(blast3x3(specialCell)), reason: 'sun' };
      case 'RainbowStar': {
        if (other.kind !== 'Normal' || other.emojiType == null) {
          // Star swapped with special handled in combine; treat as no-op clear of both
          return { cells: uniqCells([specialCell, otherCell]), reason: 'star' };
        }
        const target = other.emojiType;
        const cells: Cell[] = [specialCell];
        grid.forEach((t, r, c) => {
          if (t?.kind === 'Normal' && t.emojiType === target) {
            cells.push({ r, c });
          }
        });
        return { cells: uniqCells(cells), reason: 'star' };
      }
      default:
        return { cells: [], reason: 'cloud' };
    }
  }

  private combine(
    grid: GridModel,
    a: Cell,
    ta: Tile,
    b: Cell,
    tb: Tile,
    factory: TileFactory,
  ): ClearPlan {
    const kinds = new Set([ta.kind, tb.kind]);

    if (ta.kind === 'LightningCloud' && tb.kind === 'LightningCloud') {
      const midR = Math.round((a.r + b.r) / 2);
      const midC = Math.round((a.c + b.c) / 2);
      const rows = [midR - 1, midR, midR + 1];
      const cols = [midC - 1, midC, midC + 1];
      const cells: Cell[] = [];
      for (const r of rows) cells.push(...rowCells(r));
      for (const c of cols) cells.push(...colCells(c));
      return { cells: uniqCells(cells), reason: 'combine' };
    }

    if (kinds.has('LightningCloud') && kinds.has('SunKing')) {
      // T-shaped blast: 3-lane-wide vertical through swap column + 3-lane-wide horizontal through swap row
      const midR = Math.round((a.r + b.r) / 2);
      const midC = Math.round((a.c + b.c) / 2);
      const cells: Cell[] = [];
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let dc = -1; dc <= 1; dc++) cells.push({ r, c: midC + dc });
      }
      for (let c = 0; c < GRID_COLS; c++) {
        for (let dr = -1; dr <= 1; dr++) cells.push({ r: midR + dr, c });
      }
      return { cells: uniqCells(cells), reason: 'combine' };
    }

    if (ta.kind === 'RainbowStar' && tb.kind === 'RainbowStar') {
      return { cells: uniqCells(grid.allCells()), reason: 'combine' };
    }

    if (kinds.has('RainbowStar') && (kinds.has('LightningCloud') || kinds.has('SunKing'))) {
      const into: TileKind = kinds.has('LightningCloud') ? 'LightningCloud' : 'SunKing';
      const common = grid.mostCommonNormalEmoji();
      if (common == null) {
        return { cells: uniqCells([a, b]), reason: 'combine' };
      }
      const transforms: ClearPlan['transforms'] = [];
      const triggers: Cell[] = [];
      let colToggle = 0;
      grid.forEach((t, r, c) => {
        if (t?.kind === 'Normal' && t.emojiType === common) {
          const cloudAxis = into === 'LightningCloud' ? (colToggle++ % 2 === 0 ? 'row' : 'col') : undefined;
          transforms!.push({ cell: { r, c }, kind: into, cloudAxis });
          triggers.push({ r, c });
        }
      });
      // Also consume the two swapped specials
      transforms.push({ cell: a, kind: into, cloudAxis: 'row' });
      transforms.push({ cell: b, kind: into, cloudAxis: 'col' });
      triggers.push(a, b);
      void factory; // transforms applied by CascadeRunner using factory if needed
      return {
        cells: [],
        reason: 'combine',
        transforms,
        triggerAfterTransform: uniqCells(triggers),
      };
    }

    // Fallback: activate both
    const ca = this.activate(grid, a, ta, b, tb);
    const cb = this.activate(grid, b, tb, a, ta);
    return { cells: uniqCells([...ca.cells, ...cb.cells]), reason: 'combine' };
  }

  /** Expand trigger cells after Star transform into full clear sets. */
  expandTriggers(grid: GridModel, triggers: Cell[]): Cell[] {
    const cells: Cell[] = [];
    for (const cell of triggers) {
      const t = grid.getCell(cell);
      if (!t) continue;
      if (t.kind === 'LightningCloud') {
        const axis = t.cloudAxis ?? 'row';
        cells.push(...(axis === 'row' ? rowCells(cell.r) : colCells(cell.c)));
      } else if (t.kind === 'SunKing') {
        cells.push(...blast3x3(cell));
      } else {
        cells.push(cell);
      }
    }
    return uniqCells(cells);
  }
}
