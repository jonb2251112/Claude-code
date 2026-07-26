/**
 * ─────────────────────────────────────────────────────────────────────────────
 * CAMERA — the shot list
 * ─────────────────────────────────────────────────────────────────────────────
 * Positions are authored in POLAR coordinates (angle, radius, height) rather
 * than XYZ. That matters: interpolating XYZ between two points on a circle
 * gives you a straight chord — the camera visibly cuts *through* the arc and
 * the shot feels like a slide. Interpolating the angle gives a true orbit.
 *
 * Every shot also pushes or pulls slightly while it orbits. A pure orbit reads
 * as a turntable render; an orbit + push reads as a crane move.
 *
 * Where one shot's `from` equals the previous shot's `to`, the join is
 * invisible and the move continues (shots 5 → 6 share a 14-second arc).
 * Everywhere else the discontinuity is an intentional hard cut, masked by a
 * light flare fired from `CUTS` in the timeline config.
 */

import {PRODUCT} from '../config/product';
import {EASE} from '../config/theme';
import {SCENES, FEATURE_BEATS} from '../config/timeline';
import {lerp, lerp3, noise1D, progress, rad, type EasingFn} from '../lib/anim';

/**
 * Everything below is authored RELATIVE TO THE PRODUCT, not to the floor:
 * `height: 0` puts the camera level with the middle of the object and
 * `target: [0,0,0]` aims at it. The product hovers, so absolute coordinates
 * would silently point every shot at the floor underneath it — and would all
 * need rewriting the moment you changed the hover height or swapped in a model
 * with a different origin.
 */
const PIVOT_Y = PRODUCT.dimensions.hover;

export type CamKey = {
  /** Orbit angle around Y, in degrees. 0° = straight in front (+Z). */
  angle: number;
  /** Horizontal distance from the target. */
  radius: number;
  /** Camera height, relative to the centre of the product (0 = level with it). */
  height: number;
  /** Look-at point, relative to the centre of the product. */
  target: readonly [number, number, number];
  /** Vertical field of view. Long lenses (16–26°) compress and flatter. */
  fov: number;
  /** Dutch roll in degrees. Used at ≤ 0.6° — enough to feel human, not enough to notice. */
  roll?: number;
};

export type Shot = {
  name: string;
  start: number;
  end: number;
  easing: EasingFn;
  from: CamKey;
  to: CamKey;
};

export const SHOTS: Shot[] = [
  /* 1 · COLD OPEN — a long, slow push through the particle field.
   * Starts on a long lens, far out and just below the object's centre line, so
   * the particles read as a nebula the camera is moving *through* rather than
   * as confetti in front of a subject. */
  {
    name: 'cold-open',
    start: SCENES.coldOpen.start,
    end: SCENES.coldOpen.end,
    easing: EASE.drift,
    from: {angle: -16, radius: 13.5, height: -0.12, target: [0, 0, 0], fov: 30},
    to: {angle: -5, radius: 8.8, height: 0.35, target: [0, 0.05, 0], fov: 27},
  },

  /* 2 · HERO REVEAL — the money shot. A 68° orbit from behind-left round to
   * three-quarter front, craning DOWN from well above the object to just above
   * its centre line, pushing in the whole way.
   *
   * The descent is the point: it drags the strip-light reflection across the
   * top face from back to front. An orbit at a fixed height would rotate the
   * reflection around the object; descending through it pulls the highlight
   * over the chamfer, which is the single most product-film image there is.
   *
   * The target ends BELOW the object's centre (-0.18). Aiming low pushes the
   * subject up in frame — it is the framing equivalent of tilting the camera
   * down — and that is what clears the bottom third for the wordmark. */
  {
    name: 'hero-orbit',
    start: SCENES.hero.start,
    end: SCENES.hero.end,
    easing: EASE.glide,
    from: {angle: -54, radius: 8.4, height: 2.1, target: [0, 0.05, 0], fov: 32, roll: -0.5},
    to: {angle: 14, radius: 6.4, height: 0.55, target: [0, -0.18, 0], fov: 26, roll: 0},
  },

  /* 3 · MATERIAL — macro on the chamfer. An 18° lens at 5.2 units frames about
   * 1.6 units of height, so the edge and its corner fill the frame while the
   * form stays readable. (Closer than this is tempting and it is a trap: at
   * 2.8 units the shot becomes an abstract stripe — you lose the product.)
   * The camera sits just above the top face so the chamfer's specular line
   * runs through the middle of frame. */
  {
    name: 'feature-edge',
    start: FEATURE_BEATS[0].start,
    end: FEATURE_BEATS[0].end,
    easing: EASE.drift,
    from: {angle: 212, radius: 6.0, height: 0.6, target: [0, 0.02, 0], fov: 20},
    to: {angle: 239, radius: 5.2, height: 0.34, target: [0, -0.02, 0], fov: 18},
  },

  /* 4 · ARCHITECTURE — high three-quarter for the exploded view. We need
   * altitude to read the layer separation (the glass travels +0.62 up), then
   * descend as they reassemble so the camera "settles" with the object. */
  {
    name: 'feature-architecture',
    start: FEATURE_BEATS[1].start,
    end: FEATURE_BEATS[1].end,
    easing: EASE.glide,
    from: {angle: 306, radius: 8.6, height: 2.5, target: [0, 0.3, 0], fov: 26, roll: 0.4},
    to: {angle: 338, radius: 7.2, height: 1.35, target: [0, 0.16, 0], fov: 24, roll: 0},
  },

  /* 5 · PRESENCE — pull back to a wide, environmental frame. Note that the
   * `to` of this shot is the `from` of the next one: there is no cut at 22s. */
  {
    name: 'feature-context',
    start: FEATURE_BEATS[2].start,
    end: FEATURE_BEATS[2].end,
    easing: EASE.drift,
    from: {angle: 34, radius: 9.8, height: 1.0, target: [0, 0.15, 0], fov: 34},
    to: {angle: 58, radius: 8.8, height: 0.68, target: [0, 0.3, 0], fov: 32},
  },

  /* 6 · LIFESTYLE — ten uninterrupted seconds, the slowest move in the film:
   * 60° of orbit spread over 300 frames. The target keeps rising to +0.42,
   * which walks the product down into the lower third of frame and opens the
   * space the closing line needs. */
  {
    name: 'lifestyle',
    start: SCENES.lifestyle.start,
    end: SCENES.lifestyle.end,
    easing: EASE.drift,
    from: {angle: 58, radius: 8.8, height: 0.68, target: [0, 0.3, 0], fov: 32},
    to: {angle: 118, radius: 6.7, height: 0.3, target: [0, 0.42, 0], fov: 27},
  },

  /* 7 · OUTRO — the product recedes into the dark as the logo comes up. The
   * radius nearly triples, and because EASE.cinematic front-loads its travel,
   * most of that retreat happens in the first two seconds — the object is
   * already small and dim by the time the mark finishes drawing. */
  {
    name: 'logo',
    start: SCENES.logo.start,
    end: SCENES.logo.end,
    easing: EASE.cinematic,
    from: {angle: 118, radius: 6.7, height: 0.3, target: [0, 0.42, 0], fov: 27},
    to: {angle: 133, radius: 17, height: 0.9, target: [0, 0.5, 0], fov: 24},
  },
];

const lerpKey = (a: CamKey, b: CamKey, t: number): Required<CamKey> => ({
  angle: lerp(a.angle, b.angle, t),
  radius: lerp(a.radius, b.radius, t),
  height: lerp(a.height, b.height, t),
  target: lerp3(a.target, b.target, t),
  fov: lerp(a.fov, b.fov, t),
  roll: lerp(a.roll ?? 0, b.roll ?? 0, t),
});

export type CameraState = {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  roll: number;
};

/**
 * Micro-float. Real camera rigs — even motion-control ones — have a tiny amount
 * of low-frequency drift. Amplitude here is ~1cm at a 7m distance, i.e. a few
 * pixels. You cannot see it in a still. You absolutely feel its absence in
 * motion: without it, CG camera moves have an uncanny "on rails" stillness.
 */
const handheld = (frame: number) => ({
  x: noise1D(frame / 47, 11) * 0.022,
  y: noise1D(frame / 39, 23) * 0.016,
  z: noise1D(frame / 53, 37) * 0.018,
  roll: noise1D(frame / 61, 41) * 0.14,
  fov: noise1D(frame / 71, 53) * 0.07,
});

export const getCameraState = (frame: number): CameraState => {
  const shot = SHOTS.find((sh) => frame < sh.end) ?? SHOTS[SHOTS.length - 1];
  const t = shot.easing(progress(frame, shot.start, shot.end));
  const k = lerpKey(shot.from, shot.to, t);
  const drift = handheld(frame);

  const a = rad(k.angle);
  return {
    position: [
      Math.sin(a) * k.radius + drift.x,
      PIVOT_Y + k.height + drift.y,
      Math.cos(a) * k.radius + drift.z,
    ],
    target: [k.target[0], PIVOT_Y + k.target[1], k.target[2]],
    fov: k.fov + drift.fov,
    roll: k.roll + drift.roll,
  };
};
