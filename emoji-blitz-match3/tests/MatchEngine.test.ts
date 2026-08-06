import { describe, expect, it } from 'vitest';
import { GridModel } from '../src/core/model/GridModel';
import { MatchEngine } from '../src/core/engine/MatchEngine';
import type { Tile } from '../src/types/tile';

function N(type: number, uid: number): Tile {
  return { uid, kind: 'Normal', emojiType: type };
}

describe('MatchEngine', () => {
  it('detects horizontal match-3', () => {
    const g = new GridModel();
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        g.set(r, c, N((r + c) % 5, r * 7 + c + 1));
      }
    }
    g.set(3, 1, N(9, 100));
    g.set(3, 2, N(9, 101));
    g.set(3, 3, N(9, 102));

    const result = new MatchEngine().findMatches(g);
    expect(result.groups.length).toBeGreaterThanOrEqual(1);
    const group = result.groups.find((x) => x.emojiType === 9);
    expect(group?.cells).toHaveLength(3);
    expect(group?.shape).toBe('three');
  });

  it('creates Lightning Cloud intent for match-4', () => {
    const g = new GridModel();
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) g.set(r, c, N(1, r * 7 + c + 1));
    }
    // Break everything then place a clean horizontal 4 of type 2 on row 2
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        g.set(r, c, N((c + r * 3) % 5 === 2 ? 0 : (c + r * 3) % 5, r * 7 + c + 1));
      }
    }
    g.set(2, 0, N(7, 200));
    g.set(2, 1, N(7, 201));
    g.set(2, 2, N(7, 202));
    g.set(2, 3, N(7, 203));

    const result = new MatchEngine().findMatches(g);
    const spawn = result.specialSpawns.find((s) => s.kind === 'LightningCloud');
    expect(spawn).toBeTruthy();
    expect(spawn?.cloudAxis).toBe('row');
  });

  it('creates Rainbow Star for straight match-5', () => {
    const g = new GridModel();
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        g.set(r, c, N((r * 2 + c) % 5, r * 7 + c + 1));
      }
    }
    for (let c = 0; c < 5; c++) g.set(4, c, N(8, 300 + c));

    const result = new MatchEngine().findMatches(g);
    expect(result.specialSpawns.some((s) => s.kind === 'RainbowStar')).toBe(true);
  });

  it('creates Sun King for L-shape of 5', () => {
    const g = new GridModel();
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        g.set(r, c, N((r + c * 2) % 5, r * 7 + c + 1));
      }
    }
    // L: horizontal 3 + vertical 3 sharing corner => 5 cells
    g.set(1, 1, N(6, 400));
    g.set(1, 2, N(6, 401));
    g.set(1, 3, N(6, 402));
    g.set(2, 1, N(6, 403));
    g.set(3, 1, N(6, 404));

    const result = new MatchEngine().findMatches(g);
    expect(result.specialSpawns.some((s) => s.kind === 'SunKing')).toBe(true);
  });

  it('does not match diagonals', () => {
    const g = new GridModel();
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        g.set(r, c, N(0, r * 7 + c + 1));
      }
    }
    // Checker so no H/V runs of 3, but diagonal of same type exists
    let uid = 1;
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        g.set(r, c, N((r + c) % 2, uid++));
      }
    }
    const result = new MatchEngine().findMatches(g);
    expect(result.groups).toHaveLength(0);
  });
});
