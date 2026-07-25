/**
 * ─────────────────────────────────────────────────────────────────────────────
 * DESIGN TOKENS
 * ─────────────────────────────────────────────────────────────────────────────
 * Every colour, type size, and easing curve in the film resolves through this
 * file. Change a value here and it propagates through all five scenes, the 3D
 * stage and the overlay grade — nothing is hard-coded downstream.
 */

import {Easing} from 'remotion';

/* ── Colour ────────────────────────────────────────────────────────────────
 * A deliberately tiny palette: three neutrals, two metals, one accent.
 * The accent is used at ≤ 8% coverage in any given frame — restraint is what
 * separates "premium" from "flashy".
 */
export const COLORS = {
  /** True black. The film starts and ends here. */
  void: '#000000',
  /** Near-black used for the cyclorama backdrop so it never crushes to pure 0. */
  ink: '#050507',
  /** Backdrop horizon lift — gives the "infinite studio wall" falloff. */
  ash: '#101218',
  /** Product body: cool machined aluminium. */
  aluminium: '#c2c7cf',
  /** Darker metal for chamfers and the internal chassis. */
  graphite: '#2a2d33',
  /** Glass front. Not black — deep blue-black reads as glass, pure black reads as plastic. */
  glass: '#05060a',

  white: '#ffffff',
  /** Type white. Never pure #fff for body copy — it vibrates against black. */
  softWhite: '#eceef1',
  /** Secondary copy. */
  mist: 'rgba(236,238,241,0.55)',

  /** THE accent. One colour, used sparingly. Swap this to re-theme the film. */
  accent: '#6fa8ff',
  /** Warm counterpart used only in the lifestyle act (22–32s) for the grade shift. */
  warm: '#ffb98a',
} as const;

/** Linear-space RGB triples for anything that goes into a shader / three.js. */
export const COLORS_3D = {
  bodyMetal: '#b9bec7',
  bodyMetalDark: '#6f747c',
  chassis: '#1b1e23',
  glass: '#04050a',
  accent: COLORS.accent,
  warm: COLORS.warm,
  backdropTop: '#000000',
  backdropHorizon: '#0e1015',
  floor: '#07080b',
} as const;

/* ── Typography ────────────────────────────────────────────────────────────
 * Inter is bundled locally via @fontsource (no network fetch at render time,
 * so renders are byte-for-byte reproducible offline).
 *
 * To use real SF Pro instead — the actual Apple typeface — install it locally
 * and change FONT_FAMILY to: '"SF Pro Display", "Inter", sans-serif'.
 *
 * The whole type system is authored at 1920×1080 and uniformly scaled for 4K
 * by <DesignFrame>, so these numbers are literal pixels at 1080p.
 */
export const FONT_FAMILY =
  '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif';

export const TYPE = {
  /** Product wordmark. Thin weight + tight tracking = expensive. */
  hero: {
    fontSize: 148,
    fontWeight: 200,
    letterSpacing: '0.012em',
    lineHeight: 1.02,
  },
  /** Section headlines during the feature act. */
  headline: {
    fontSize: 62,
    fontWeight: 300,
    letterSpacing: '-0.018em',
    lineHeight: 1.14,
  },
  /** The closing statement. */
  statement: {
    fontSize: 76,
    fontWeight: 300,
    letterSpacing: '-0.02em',
    lineHeight: 1.16,
  },
  /** All-caps eyebrow labels. Wide tracking, small size, low opacity. */
  kicker: {
    fontSize: 19,
    fontWeight: 500,
    letterSpacing: '0.34em',
    lineHeight: 1,
    textTransform: 'uppercase' as const,
  },
  /** Supporting copy under a headline. */
  body: {
    fontSize: 27,
    fontWeight: 300,
    letterSpacing: '0.005em',
    lineHeight: 1.5,
  },
  /** Logo lockup tagline. */
  tagline: {
    fontSize: 34,
    fontWeight: 300,
    letterSpacing: '0.02em',
    lineHeight: 1.3,
  },
} as const;

/* ── Easing ────────────────────────────────────────────────────────────────
 * The single most important file in the project.
 *
 * Apple motion almost never uses a symmetric ease-in-out. It uses curves with
 * a fast, confident start and a very long, decelerating settle — the object
 * arrives, then *keeps* arriving for another 400ms. Those are the curves below.
 */
export const EASE = {
  /**
   * The house curve. Near-exponential out (approximates `expo-out`).
   * Use for: reveals, camera pushes, anything that should feel weightless.
   */
  cinematic: Easing.bezier(0.16, 1, 0.3, 1),
  /**
   * Slightly softer entry than `cinematic`, longer tail.
   * Use for: type settling into place.
   */
  settle: Easing.bezier(0.22, 1, 0.28, 1),
  /**
   * Symmetric but heavily weighted at both ends — for continuous camera arcs
   * that need to start and stop without a visible "click".
   */
  glide: Easing.bezier(0.62, 0.02, 0.2, 1),
  /** Long, lazy drift used for the 10-second lifestyle move. */
  drift: Easing.bezier(0.42, 0, 0.24, 1),
  /** Accelerating exit — objects leaving frame, fades to black. */
  exit: Easing.bezier(0.7, 0, 0.84, 0),
  /** Sharp attack, instant decay. Light flares and flash cuts only. */
  flash: Easing.bezier(0.05, 0.9, 0.2, 1),
  linear: Easing.linear,
} as const;

/** Spring configs tuned to feel physical but never bouncy-cartoonish. */
export const SPRING = {
  /** Barely-there overshoot. Product layers, cards. */
  premium: {damping: 200, mass: 1.1, stiffness: 68, overshootClamping: false},
  /** No overshoot at all — for type, where any bounce reads as cheap. */
  type: {damping: 200, mass: 0.7, stiffness: 90, overshootClamping: true},
  /** A little life. Used for the exploded-view separation. */
  lively: {damping: 26, mass: 1, stiffness: 90},
} as const;

/* ── Post / grade toggles ──────────────────────────────────────────────────
 * Flip these to trade render time for polish.
 */
export const LOOK = {
  /** WebGL post-processing pass (bloom + chromatic aberration). */
  postProcessing: true,
  /** Real-time reflective floor. The single most expensive effect. */
  reflectiveFloor: true,
  /** Animated film grain overlay (DOM/SVG, essentially free). */
  filmGrain: true,
  /** 2.39:1 cinema bars. Off by default — Apple ads run full-frame. */
  letterbox: false,
  /** Global exposure multiplier for the whole film. */
  exposure: 1.0,
} as const;
