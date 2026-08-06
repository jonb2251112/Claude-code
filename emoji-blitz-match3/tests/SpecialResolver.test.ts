import { describe, expect, it } from 'vitest';
import { GridModel } from '../src/core/model/GridModel';
import { TilePool } from '../src/core/model/TilePool';
import { SpecialResolver } from '../src/core/engine/SpecialResolver';
import { TileFactory } from '../src/core/engine/TileFactory';
import { createRng } from '../src/core/engine/rng';
import type { Tile } from '../src/types/tile';

function fill(grid: GridModel, type = 1): void {
  let uid = 1;
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      grid.set(r, c, { uid: uid++, kind: 'Normal', emojiType: (r + c) % 5 });
    }
  }
}

describe('SpecialResolver', () => {
  it('Cloud + Cloud clears 3 rows and 3 columns', () => {
    const grid = new GridModel();
    fill(grid);
    const pool = new TilePool([0, 1, 2, 3, 4], 0);
    const factory = new TileFactory(grid, pool, createRng(1));
    grid.set(3, 3, factory.special('LightningCloud', 'row'));
    grid.set(3, 4, factory.special('LightningCloud', 'col'));

    const plan = new SpecialResolver().resolveSwap(
      grid,
      { r: 3, c: 3 },
      { r: 3, c: 4 },
      factory,
    );
    expect(plan?.reason).toBe('combine');
    // 3 rows × 7 + 3 cols × 7 − 9 intersections = 33
    expect(plan?.cells.length).toBe(33);
  });

  it('Star + Star clears the entire board', () => {
    const grid = new GridModel();
    fill(grid);
    const pool = new TilePool([0, 1, 2, 3, 4], 0);
    const factory = new TileFactory(grid, pool, createRng(1));
    grid.set(0, 0, factory.special('RainbowStar'));
    grid.set(0, 1, factory.special('RainbowStar'));

    const plan = new SpecialResolver().resolveSwap(
      grid,
      { r: 0, c: 0 },
      { r: 0, c: 1 },
      factory,
    );
    expect(plan?.cells.length).toBe(49);
  });

  it('Sun King clears a 3x3 blast', () => {
    const grid = new GridModel();
    fill(grid);
    const pool = new TilePool([0, 1, 2, 3, 4], 0);
    const factory = new TileFactory(grid, pool, createRng(1));
    const sun: Tile = factory.special('SunKing');
    grid.set(3, 3, sun);
    grid.set(3, 4, { uid: 999, kind: 'Normal', emojiType: 2 });

    const plan = new SpecialResolver().resolveSwap(
      grid,
      { r: 3, c: 3 },
      { r: 3, c: 4 },
      factory,
    );
    expect(plan?.reason).toBe('sun');
    expect(plan?.cells.length).toBe(9);
  });
});
