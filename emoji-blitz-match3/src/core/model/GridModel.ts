import { GRID_COLS, GRID_ROWS } from '../../config/constants';
import type { Cell, Tile } from '../../types/tile';

/**
 * Authoritative 7×7 board. Zero renderer dependencies.
 * Storage is a flat array for predictable iteration and cheap cloning of references.
 */
export class GridModel {
  readonly rows = GRID_ROWS;
  readonly cols = GRID_COLS;

  private readonly cells: (Tile | null)[];
  private nextUid: number;

  constructor(nextUid = 1) {
    this.cells = new Array(GRID_ROWS * GRID_COLS).fill(null);
    this.nextUid = nextUid;
  }

  index(r: number, c: number): number {
    return r * GRID_COLS + c;
  }

  inBounds(r: number, c: number): boolean {
    return r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS;
  }

  get(r: number, c: number): Tile | null {
    if (!this.inBounds(r, c)) return null;
    return this.cells[this.index(r, c)];
  }

  getCell(cell: Cell): Tile | null {
    return this.get(cell.r, cell.c);
  }

  set(r: number, c: number, tile: Tile | null): void {
    if (!this.inBounds(r, c)) {
      throw new RangeError(`GridModel.set out of bounds (${r},${c})`);
    }
    this.cells[this.index(r, c)] = tile;
  }

  setCell(cell: Cell, tile: Tile | null): void {
    this.set(cell.r, cell.c, tile);
  }

  swap(a: Cell, b: Cell): void {
    const ta = this.getCell(a);
    const tb = this.getCell(b);
    this.setCell(a, tb);
    this.setCell(b, ta);
  }

  clearCells(cells: Iterable<Cell>): void {
    for (const cell of cells) {
      if (this.inBounds(cell.r, cell.c)) {
        this.set(cell.r, cell.c, null);
      }
    }
  }

  allocUid(): number {
    return this.nextUid++;
  }

  /** Shallow copy of tile references into a new GridModel (shared Tile objects). */
  clone(): GridModel {
    const g = new GridModel(this.nextUid);
    for (let i = 0; i < this.cells.length; i++) {
      g.cells[i] = this.cells[i];
    }
    return g;
  }

  /** Deep-ish snapshot: new Tile object shells so speculative edits do not leak. */
  cloneDeep(): GridModel {
    const g = new GridModel(this.nextUid);
    for (let i = 0; i < this.cells.length; i++) {
      const t = this.cells[i];
      g.cells[i] = t
        ? {
            uid: t.uid,
            kind: t.kind,
            emojiType: t.emojiType,
            cloudAxis: t.cloudAxis,
          }
        : null;
    }
    return g;
  }

  forEach(fn: (tile: Tile | null, r: number, c: number) => void): void {
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        fn(this.cells[this.index(r, c)], r, c);
      }
    }
  }

  /** Debug / golden-hash helper. */
  fingerprint(): string {
    const parts: string[] = [];
    this.forEach((t) => {
      if (!t) {
        parts.push('.');
        return;
      }
      const type = t.emojiType ?? 'x';
      const axis = t.cloudAxis ? t.cloudAxis[0] : '';
      parts.push(`${t.kind[0]}${type}${axis}`);
    });
    return parts.join(',');
  }

  countEmoji(emojiType: number): number {
    let n = 0;
    this.forEach((t) => {
      if (t?.kind === 'Normal' && t.emojiType === emojiType) n++;
    });
    return n;
  }

  mostCommonNormalEmoji(): number | null {
    const counts = new Map<number, number>();
    this.forEach((t) => {
      if (t?.kind === 'Normal' && t.emojiType != null) {
        counts.set(t.emojiType, (counts.get(t.emojiType) ?? 0) + 1);
      }
    });
    let best: number | null = null;
    let bestN = -1;
    for (const [type, n] of counts) {
      if (n > bestN) {
        best = type;
        bestN = n;
      }
    }
    return best;
  }

  allCells(): Cell[] {
    const out: Cell[] = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        out.push({ r, c });
      }
    }
    return out;
  }
}
