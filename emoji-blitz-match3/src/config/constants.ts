/**
 * Global immutable gameplay constants.
 * Designer-tunable values that change with balance patches live in balance.ts.
 */

export const GRID_ROWS = 7 as const;
export const GRID_COLS = 7 as const;

export const ROUND_DURATION_SEC = 60;
export const BLITZ_DURATION_SEC = 5;

/** Default number of emoji variants in the spawn pool (includes hero). */
export const DEFAULT_POOL_SIZE = 5;

/** Pool size while Blitz Mode is active. */
export const BLITZ_POOL_SIZE = 4;

export const BLITZ_FILL_PER_CLEAR = 1; // percent
export const BLITZ_DECAY_PER_SEC = 2; // percent
export const BLITZ_SCORE_MULTIPLIER = 3;

export const CHARACTER_CHARGE_PER_HERO_CLEAR = 8; // percent

/** Orthogonal adjacency only. */
export const ORTHO_DELTAS: ReadonlyArray<readonly [number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

export const MAX_CASCADE_DEPTH = 30;

export const ANIM = {
  swapMs: 80,
  rejectMs: 110,
  clearMs: 90,
  fallPerCellMs: 40,
  spawnMs: 120,
} as const;
