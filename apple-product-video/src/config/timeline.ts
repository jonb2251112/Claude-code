/**
 * ─────────────────────────────────────────────────────────────────────────────
 * TIMELINE — the edit
 * ─────────────────────────────────────────────────────────────────────────────
 * One source of truth for every cut point. The 3D camera rig, the overlay
 * scenes, the colour grade and the audio bed all read from here, which is what
 * keeps picture and sound frame-locked when you retime a beat.
 *
 * Total: 40 seconds @ 30fps = 1200 frames.
 */

export const FPS = 30;
export const SECONDS = 40;
export const DURATION = FPS * SECONDS; // 1200

/** Convert seconds → frames. Use this everywhere so retiming to 24/60fps is free. */
export const s = (seconds: number) => Math.round(seconds * FPS);

export const SCENES = {
  /** 0–4s · Abstract particle form resolves into the product silhouette. */
  coldOpen: {start: s(0), end: s(4)},
  /** 4–12s · Hero reveal: orbit + push-in, light sweep, wordmark. */
  hero: {start: s(4), end: s(12)},
  /** 12–22s · Three feature beats, ~3.33s each, joined by match cuts. */
  features: {start: s(12), end: s(22)},
  /** 22–32s · Emotional / lifestyle close. One continuous move, no cuts. */
  lifestyle: {start: s(22), end: s(32)},
  /** 32–40s · Logo lockup, statement, fade to black. */
  logo: {start: s(32), end: s(40)},
} as const;

/** The three feature beats, derived so they always tile `SCENES.features` exactly. */
export const FEATURE_BEATS = [0, 1, 2].map((i) => {
  const span = (SCENES.features.end - SCENES.features.start) / 3;
  return {
    index: i,
    start: Math.round(SCENES.features.start + span * i),
    end: Math.round(SCENES.features.start + span * (i + 1)),
  };
});

/**
 * Hard cut points. A flash/flare overlay is fired on each of these so the cut
 * is *masked by light* rather than being a naked jump — the trick that makes a
 * sequence of static shots feel like one continuous piece of film.
 *
 * Note there is deliberately NO cut at 22s: the third feature beat and the
 * lifestyle act share one uninterrupted 14-second camera move.
 */
export const CUTS = [
  SCENES.hero.start,
  FEATURE_BEATS[0].start,
  FEATURE_BEATS[1].start,
  FEATURE_BEATS[2].start,
  SCENES.logo.start,
];

/** Length of the fade-to-black tail. */
export const FADE_OUT = s(1.6);
