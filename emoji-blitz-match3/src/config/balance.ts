/**
 * Tunable balance knobs — safe to hot-reload in tooling without touching engine code.
 */

export const SCORE = {
  normalClear: 10,
  cloudClear: 15,
  sunClear: 20,
  starClear: 25,
  combineClear: 30,
  /** Extra multiplier per cascade depth step after the first clear. */
  cascadeDepthBonus: 0.25,
} as const;

export const COINS_PER_SCORE = 50;

export const TIME_PAUSE_SPELL_SEC = 3;

export const GUARANTEED_STAR_COUNT = 2;

export const COLUMN_CRUSH_COUNT = 2;
