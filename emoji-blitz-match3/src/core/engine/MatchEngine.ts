import { GRID_COLS, GRID_ROWS } from '../../config/constants';
import type { Cell, CloudAxis, Tile } from '../../types/tile';
import { cellKey } from '../../types/tile';
import type { GridModel } from '../model/GridModel';

export type MatchShape = 'three' | 'four' | 'five_line' | 'five_lt' | 'multi';

export interface MatchGroup {
  cells: Cell[];
  emojiType: number;
  shape: MatchShape;
  /** For Cloud spawn orientation when shape is four. */
  axis?: CloudAxis;
  /** Preferred spawn cell for specials (junction / center). */
  spawnAt: Cell;
}

export interface MatchResult {
  groups: MatchGroup[];
  /** Union of all cells to clear (excluding cells that will become specials). */
  clearCells: Cell[];
  specialSpawns: Array<{
    cell: Cell;
    kind: 'LightningCloud' | 'SunKing' | 'RainbowStar';
    cloudAxis?: CloudAxis;
  }>;
}

function isMatchableNormal(t: Tile | null): t is Tile & { emojiType: number } {
  return t != null && t.kind === 'Normal' && t.emojiType != null;
}

/**
 * Axis-aligned run scanner with L/T classification.
 * Flood-fill is used only to assemble connected clear sets from run membership.
 */
export class MatchEngine {
  findMatches(grid: GridModel): MatchResult {
    const runCells = new Map<number, Cell>();
    const runs: Cell[][] = [];

    // Horizontal runs
    for (let r = 0; r < GRID_ROWS; r++) {
      let start = 0;
      while (start < GRID_COLS) {
        const seed = grid.get(r, start);
        if (!isMatchableNormal(seed)) {
          start++;
          continue;
        }
        let end = start + 1;
        while (end < GRID_COLS) {
          const t = grid.get(r, end);
          if (!isMatchableNormal(t) || t.emojiType !== seed.emojiType) break;
          end++;
        }
        if (end - start >= 3) {
          const cells: Cell[] = [];
          for (let c = start; c < end; c++) {
            const cell = { r, c };
            cells.push(cell);
            runCells.set(cellKey(r, c), cell);
          }
          runs.push(cells);
        }
        start = end;
      }
    }

    // Vertical runs
    for (let c = 0; c < GRID_COLS; c++) {
      let start = 0;
      while (start < GRID_ROWS) {
        const seed = grid.get(start, c);
        if (!isMatchableNormal(seed)) {
          start++;
          continue;
        }
        let end = start + 1;
        while (end < GRID_ROWS) {
          const t = grid.get(end, c);
          if (!isMatchableNormal(t) || t.emojiType !== seed.emojiType) break;
          end++;
        }
        if (end - start >= 3) {
          const cells: Cell[] = [];
          for (let r = start; r < end; r++) {
            const cell = { r, c };
            cells.push(cell);
            runCells.set(cellKey(r, c), cell);
          }
          runs.push(cells);
        }
        start = end;
      }
    }

    if (runs.length === 0) {
      return { groups: [], clearCells: [], specialSpawns: [] };
    }

    // Merge overlapping runs into connected components (flood over run membership).
    const components = this.mergeRuns(runs);
    const groups: MatchGroup[] = [];
    const specialSpawns: MatchResult['specialSpawns'] = [];
    const clearKeys = new Set<number>();
    const reservedSpawnKeys = new Set<number>();

    for (const cells of components) {
      const sample = grid.getCell(cells[0]);
      if (!isMatchableNormal(sample)) continue;
      const classified = this.classify(cells);
      groups.push({
        cells,
        emojiType: sample.emojiType,
        shape: classified.shape,
        axis: classified.axis,
        spawnAt: classified.spawnAt,
      });

      if (classified.special) {
        specialSpawns.push({
          cell: classified.spawnAt,
          kind: classified.special,
          cloudAxis: classified.axis,
        });
        reservedSpawnKeys.add(cellKey(classified.spawnAt.r, classified.spawnAt.c));
      }

      for (const cell of cells) {
        const k = cellKey(cell.r, cell.c);
        if (!reservedSpawnKeys.has(k)) clearKeys.add(k);
      }
    }

    // Spawns occupy cells that would otherwise clear — ensure they are not in clearCells
    const clearCells: Cell[] = [];
    for (const k of clearKeys) {
      if (reservedSpawnKeys.has(k)) continue;
      const c = k % 8;
      const r = (k - c) / 8;
      clearCells.push({ r, c });
    }

    return { groups, clearCells, specialSpawns };
  }

  /**
   * Recursive flood-fill over cells that participate in any ≥3 run,
   * 4-connected, same emoji type.
   */
  floodConnected(
    grid: GridModel,
    start: Cell,
    memberKeys: Set<number>,
  ): Cell[] {
    const startTile = grid.getCell(start);
    if (!isMatchableNormal(startTile)) return [];
    const out: Cell[] = [];
    const stack: Cell[] = [start];
    const seen = new Set<number>();
    while (stack.length) {
      const cur = stack.pop()!;
      const k = cellKey(cur.r, cur.c);
      if (seen.has(k) || !memberKeys.has(k)) continue;
      seen.add(k);
      const t = grid.getCell(cur);
      if (!isMatchableNormal(t) || t.emojiType !== startTile.emojiType) continue;
      out.push(cur);
      stack.push(
        { r: cur.r - 1, c: cur.c },
        { r: cur.r + 1, c: cur.c },
        { r: cur.r, c: cur.c - 1 },
        { r: cur.r, c: cur.c + 1 },
      );
    }
    return out;
  }

  private mergeRuns(runs: Cell[][]): Cell[][] {
    const parent = new Map<number, number>();
    const find = (k: number): number => {
      let p = parent.get(k) ?? k;
      while (p !== (parent.get(p) ?? p)) p = parent.get(p)!;
      parent.set(k, p);
      return p;
    };
    const union = (a: number, b: number) => {
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) parent.set(ra, rb);
    };

    const cellMap = new Map<number, Cell>();
    for (const run of runs) {
      let prev: number | null = null;
      for (const cell of run) {
        const k = cellKey(cell.r, cell.c);
        cellMap.set(k, cell);
        if (!parent.has(k)) parent.set(k, k);
        if (prev != null) union(prev, k);
        prev = k;
      }
    }

    // Also union cells that touch orthogonally with same component opportunity:
    // already connected via shared cells between H/V runs through union-find on shared keys.
    const buckets = new Map<number, Cell[]>();
    for (const [k, cell] of cellMap) {
      const root = find(k);
      const list = buckets.get(root) ?? [];
      list.push(cell);
      buckets.set(root, list);
    }
    return [...buckets.values()];
  }

  private classify(cells: Cell[]): {
    shape: MatchShape;
    axis?: CloudAxis;
    spawnAt: Cell;
    special?: 'LightningCloud' | 'SunKing' | 'RainbowStar';
  } {
    const rows = new Set(cells.map((c) => c.r));
    const cols = new Set(cells.map((c) => c.c));
    const spawnAt = cells[Math.floor(cells.length / 2)];

    if (rows.size === 1) {
      // Horizontal line
      if (cells.length >= 5) {
        return { shape: 'five_line', axis: 'row', spawnAt, special: 'RainbowStar' };
      }
      if (cells.length === 4) {
        return { shape: 'four', axis: 'row', spawnAt, special: 'LightningCloud' };
      }
      return { shape: 'three', axis: 'row', spawnAt };
    }

    if (cols.size === 1) {
      if (cells.length >= 5) {
        return { shape: 'five_line', axis: 'col', spawnAt, special: 'RainbowStar' };
      }
      if (cells.length === 4) {
        return { shape: 'four', axis: 'col', spawnAt, special: 'LightningCloud' };
      }
      return { shape: 'three', axis: 'col', spawnAt };
    }

    // L / T detection: find junction with neighbors in both axes within the set
    const keySet = new Set(cells.map((c) => cellKey(c.r, c.c)));
    let junction: Cell | null = null;
    for (const cell of cells) {
      const hasH =
        keySet.has(cellKey(cell.r, cell.c - 1)) ||
        keySet.has(cellKey(cell.r, cell.c + 1));
      const hasV =
        keySet.has(cellKey(cell.r - 1, cell.c)) ||
        keySet.has(cellKey(cell.r + 1, cell.c));
      if (hasH && hasV) {
        junction = cell;
        break;
      }
    }

    if (junction && cells.length >= 5) {
      return {
        shape: 'five_lt',
        spawnAt: junction,
        special: 'SunKing',
      };
    }

    return { shape: 'multi', spawnAt };
  }
}
