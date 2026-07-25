/**
 * Small, dependency-free animation helpers used across every scene.
 * Everything is a pure function of `frame` — no refs, no accumulated state —
 * which is what guarantees a render is identical to the preview.
 */

import {Easing, interpolate} from 'remotion';
import {EASE} from '../config/theme';

export type EasingFn = (t: number) => number;

export const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const lerp3 = (
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  t: number,
): [number, number, number] => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/** Normalised 0→1 progress across an arbitrary frame span, clamped at both ends. */
export const progress = (frame: number, start: number, end: number) =>
  clamp((frame - start) / Math.max(1, end - start));

/**
 * Multi-stop keyframe track.
 *   track(frame, [[0, 0], [30, 1], [90, 1], [120, 0]])
 * The easing is applied *within* each segment, so a long hold between two
 * stops stays perfectly flat.
 */
export const track = (
  frame: number,
  stops: readonly (readonly [number, number])[],
  easing: EasingFn = EASE.cinematic,
) => {
  /* Remotion's interpolate() requires a strictly increasing input range, which
   * is easy to violate by accident: two beats can legitimately share a frame
   * (SCENES.hero.end === FEATURE_BEATS[0].start), and a zero-length fade-in
   * produces [start, start]. Rather than making every call site defend against
   * that, we nudge each stop to sit a fraction after its predecessor. A
   * zero-length segment then behaves exactly as authored — an instant step. */
  const inputs: number[] = [];
  for (let i = 0; i < stops.length; i++) {
    inputs.push(i === 0 ? stops[i][0] : Math.max(stops[i][0], inputs[i - 1] + 1e-4));
  }

  return interpolate(
    frame,
    inputs,
    stops.map((st) => st[1]),
    {easing, extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );
};

/**
 * Fade a value up at `start` and back down before `end`.
 * Used by nearly every text block: `opacity={fadeInOut(f, 0, 90, 14, 20)}`.
 */
export const fadeInOut = (
  frame: number,
  start: number,
  end: number,
  inDuration = 14,
  outDuration = 14,
) =>
  track(
    frame,
    [
      [start, 0],
      [start + inDuration, 1],
      [end - outDuration, 1],
      [end, 0],
    ],
    EASE.cinematic,
  );

/**
 * A decaying oscillation — the "settle" you get from a real motion-control rig
 * coming to rest. Amplitude falls off exponentially so it never looks bouncy.
 */
export const settleWobble = (t: number, frequency = 2.4, decay = 4) =>
  Math.sin(t * Math.PI * 2 * frequency) * Math.exp(-t * decay);

/**
 * Deterministic pseudo-random in [0,1). Seeded by an integer, so the same
 * particle gets the same value on every machine and every render pass.
 */
export const rand = (seed: number) => {
  let t = (seed + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** Deterministic value in [min,max). */
export const randRange = (seed: number, min: number, max: number) =>
  min + rand(seed) * (max - min);

/**
 * Layered value noise — smooth, continuous, deterministic. Used for the
 * camera's handheld micro-float and for dust drift.
 */
export const noise1D = (x: number, seed = 0) => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f); // smoothstep
  const a = rand(i * 374761393 + seed * 668265263);
  const b = rand((i + 1) * 374761393 + seed * 668265263);
  return lerp(a, b, u) * 2 - 1; // → [-1, 1]
};

/** Degrees → radians. */
export const rad = (deg: number) => (deg * Math.PI) / 180;

/** Re-export so scenes only need one import for motion. */
export {Easing, interpolate};
