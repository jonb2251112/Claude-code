import { describe, expect, it } from 'vitest';
import { GridModel } from '../src/core/model/GridModel';
import { TilePool } from '../src/core/model/TilePool';
import { GravityEngine } from '../src/core/engine/GravityEngine';
import { TileFactory } from '../src/core/engine/TileFactory';
import { createRng } from '../src/core/engine/rng';
import type { Tile } from '../src/types/tile';

function N(type: number, uid: number): Tile {
  return { uid, kind: 'Normal', emojiType: type };
}

describe('GravityEngine', () => {
  it('packs tiles downward and refills empties', () => {
    const grid = new GridModel();
    const pool = new TilePool([0, 1, 2, 3, 4], 0);
    const factory = new TileFactory(grid, pool, createRng(42));

    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) grid.set(r, c, N(1, r * 7 + c + 1));
    }
    // Punch holes in column 0
    grid.set(6, 0, null);
    grid.set(5, 0, null);
    grid.set(2, 0, null);

    const plan = new GravityEngine().compactAndRefill(grid, factory);
    for (let r = 0; r < 7; r++) {
      expect(grid.get(r, 0)).not.toBeNull();
    }
    expect(plan.spawns.length).toBe(3);
    expect(plan.moves.length).toBeGreaterThan(0);
  });
});
