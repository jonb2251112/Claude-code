/**
 * ─────────────────────────────────────────────────────────────────────────────
 * STAGE STATE — lighting, grade and product behaviour over time
 * ─────────────────────────────────────────────────────────────────────────────
 * The whole 40 seconds runs on ONE continuous 3D scene: the product is never
 * unmounted, the lights never reset. What changes is this state object, which
 * every element in the scene reads from.
 *
 * Building it this way (rather than one <Canvas> per scene) is what produces
 * seamless transitions — at a cut, only the camera jumps. The light, the
 * reflections and the product carry through, so the eye reads it as one space.
 */

import {FEATURE_BEATS, SCENES, s} from '../config/timeline';
import {EASE} from '../config/theme';
import {track} from '../lib/anim';

export type StageState = {
  /** ACES tone-mapping exposure. Drives the overall "printed" density of the image. */
  exposure: number;
  /** Key softbox — the main modelling light. */
  key: number;
  /** Fill — keeps the shadow side alive. Always ≤ 20% of key. */
  fill: number;
  /** Rim/back light. High in the cold open (silhouette), low once the product is revealed. */
  rim: number;
  /** Environment map contribution. This is what the metal is actually *reflecting*. */
  env: number;
  /** Rotation of the environment in radians — the light sweep across the body. */
  envRotation: number;
  /** 0 = cool studio, 1 = warm domestic. Tints lights, backdrop and floor. */
  warmth: number;
  /** Exponential fog density — atmosphere / volumetric haze. */
  fog: number;
  /** How much the backdrop horizon is lifted out of black. */
  backdropLift: number;
  /** Airborne dust motes, 0–1. */
  dust: number;
  /** Cold-open particle system: 0 = scattered cloud, 1 = landed on the surface. */
  particleCollapse: number;
  /** Overall particle opacity — they dissolve away once they've drawn the form. */
  particleOpacity: number;
  /** Exploded view separation, 0–1. */
  explode: number;
  /** Display emissive intensity. */
  ignite: number;
  /** Accent light-seam around the chamfer. */
  seam: number;
  /** Bloom strength for the post pass. */
  bloom: number;
};

export const getStageState = (frame: number): StageState => {
  const f = frame;

  return {
    /* Exposure: open up out of the cold open, hold, then print down to black.
     * A 0.72 → 1.0 lift across the first four seconds is doing what a real
     * colourist would do — the image "blooms open" rather than cutting on. */
    exposure: track(
      f,
      [
        [0, 0.62],
        [SCENES.coldOpen.end, 1.0],
        [SCENES.logo.start, 1.0],
        [SCENES.logo.start + s(2.2), 0.72],
        [SCENES.logo.end - s(1.8), 0.0],
      ],
      EASE.glide,
    ),

    key: track(
      f,
      [
        [0, 0.0],
        [s(2.4), 0.15],
        [SCENES.hero.start, 0.75],
        [SCENES.hero.start + s(3), 1.15],
        [FEATURE_BEATS[0].start, 1.3], // macro shot wants a harder key for the chamfer
        [FEATURE_BEATS[1].start, 1.05],
        [SCENES.lifestyle.start, 0.85],
        [SCENES.lifestyle.end, 0.7],
        [SCENES.logo.start + s(2.6), 0.0],
      ],
      EASE.glide,
    ),

    fill: track(
      f,
      [
        [0, 0.0],
        [SCENES.hero.start, 0.1],
        [SCENES.features.start, 0.16],
        [SCENES.lifestyle.start, 0.24], // domestic light is softer / flatter
        [SCENES.logo.start + s(2.6), 0.0],
      ],
      EASE.glide,
    ),

    /* Rim starts hot: in the cold open it is the ONLY light, which is what
     * turns the product into a pure silhouette with a burning edge. */
    rim: track(
      f,
      [
        [0, 0.0],
        [s(1.2), 0.9],
        [s(3.4), 1.25],
        [SCENES.hero.start + s(1), 0.75],
        [FEATURE_BEATS[0].start, 1.0],
        [SCENES.lifestyle.start, 0.7],
        [SCENES.logo.start + s(2.6), 0.0],
      ],
      EASE.glide,
    ),

    env: track(
      f,
      [
        [0, 0.04],
        [SCENES.coldOpen.end, 0.5],
        [SCENES.hero.start + s(2), 1.25],
        [FEATURE_BEATS[0].start, 1.6], // reflections carry the macro shot
        [FEATURE_BEATS[1].start, 1.15],
        [SCENES.lifestyle.start, 0.95],
        [SCENES.logo.start + s(2.6), 0.0],
      ],
      EASE.glide,
    ),

    /* Two components: a constant slow drift, plus an accelerated sweep during
     * the hero reveal. The accelerated part is the "light sweep across the
     * surface" beat — it's a rotating *environment*, not a moving light, which
     * is how it stays physically coherent across metal, glass and floor at once. */
    envRotation:
      track(
        f,
        [
          [0, 0],
          [SCENES.hero.start, 0.18],
          [SCENES.hero.end, 1.5],
          [SCENES.features.end, 2.0],
          [SCENES.lifestyle.end, 2.55],
          [SCENES.logo.end, 3.0],
        ],
        EASE.glide,
      ) +
      // second, faster pass so a highlight crosses twice during the hero
      track(
        f,
        [
          [SCENES.hero.start + s(1.2), 0],
          [SCENES.hero.start + s(4.4), 0.9],
        ],
        EASE.glide,
      ),

    warmth: track(
      f,
      [
        [FEATURE_BEATS[2].start, 0],
        [FEATURE_BEATS[2].start + s(2), 0.55], // context beat pre-warms
        [SCENES.lifestyle.start + s(3), 0.8],
        [SCENES.lifestyle.end, 0.7],
        [SCENES.logo.start + s(2.5), 0.15], // back to neutral for the lockup
      ],
      EASE.glide,
    ),

    fog: track(
      f,
      [
        [0, 0.055], // heavy haze so the particles read volumetrically
        [SCENES.coldOpen.end, 0.03],
        [SCENES.hero.end, 0.018],
        [SCENES.lifestyle.start, 0.032],
        [SCENES.lifestyle.end, 0.04],
        [SCENES.logo.end, 0.07],
      ],
      EASE.glide,
    ),

    backdropLift: track(
      f,
      [
        [0, 0.05],
        [SCENES.hero.start + s(2), 0.55],
        [SCENES.features.end, 0.6],
        [SCENES.lifestyle.start + s(4), 0.55],
        [SCENES.logo.start + s(3), 0.0],
      ],
      EASE.glide,
    ),

    dust: track(
      f,
      [
        [SCENES.features.start, 0],
        [FEATURE_BEATS[2].start, 0.5],
        [SCENES.lifestyle.start + s(2), 1],
        [SCENES.logo.start, 0.6],
        [SCENES.logo.start + s(3), 0],
      ],
      EASE.glide,
    ),

    /* The cold open, in two movements: the cloud collapses onto the surface
     * (0 → 3.8s), then the particles themselves dissolve (3.6 → 5.4s), leaving
     * only the object they described.
     *
     * EASE.drift, not EASE.cinematic. The house curve front-loads its travel —
     * on a camera move that's the point, but applied to the particle collapse
     * it means the cloud is 95% resolved less than two seconds in, and the
     * remaining half of the cold open is just the finished product sitting
     * there. drift is closer to symmetric, so the form is still visibly
     * assembling at 3 seconds. */
    particleCollapse: track(
      f,
      [
        [0, 0],
        [s(3.8), 1],
      ],
      EASE.drift,
    ),

    particleOpacity: track(
      f,
      [
        [0, 0],
        [s(0.5), 1],
        [s(3.6), 1],
        [s(5.4), 0],
      ],
      EASE.glide,
    ),

    /* Exploded view: layers separate fast and confidently, hold for 20 frames
     * so the eye can read the stack, then close on a slow settle. */
    explode:
      track(
        f,
        [
          [FEATURE_BEATS[1].start + s(0.2), 0],
          [FEATURE_BEATS[1].start + s(1.5), 1],
        ],
        EASE.cinematic,
      ) *
      track(
        f,
        [
          [FEATURE_BEATS[1].end - s(1.5), 1],
          [FEATURE_BEATS[1].end - s(0.1), 0],
        ],
        EASE.settle,
      ),

    /* Display ignition. Comes up under the wordmark, holds low, then does the
     * "it responds to the room" pulse during the third feature beat. */
    ignite:
      track(
        f,
        [
          [SCENES.hero.start + s(1.6), 0],
          [SCENES.hero.start + s(3.2), 0.55],
          [FEATURE_BEATS[1].start, 0.35],
          [FEATURE_BEATS[1].start + s(1.6), 0.9],
          [FEATURE_BEATS[2].start, 0.6],
          [FEATURE_BEATS[2].start + s(1.4), 1.0],
          [SCENES.lifestyle.start, 0.7],
          [SCENES.logo.start, 0.55],
          [SCENES.logo.start + s(2.5), 0],
        ],
        EASE.glide,
      ) *
      // slow breathing pulse — 0.09 amplitude, ~7s period. Barely perceptible,
      // but it stops the product looking switched-off-but-glowing.
      (1 + Math.sin(f / 33) * 0.09),

    seam: track(
      f,
      [
        [SCENES.hero.start + s(2.4), 0],
        [SCENES.hero.end - s(1), 0.5],
        [FEATURE_BEATS[0].start + s(0.6), 0.6], // the accent line on the chamfer, macro
        [FEATURE_BEATS[1].start, 0.4],
        [FEATURE_BEATS[2].start + s(1.2), 1.0],
        [SCENES.lifestyle.start + s(1), 0.45],
        [SCENES.logo.start + s(2), 0],
      ],
      EASE.glide,
    ),

    bloom: track(
      f,
      [
        [0, 0.9], // hot bloom on the particle field
        [SCENES.hero.start, 0.42],
        [FEATURE_BEATS[0].start, 0.5],
        [SCENES.lifestyle.start, 0.38],
        [SCENES.logo.start, 0.55],
        [SCENES.logo.end, 0.8],
      ],
      EASE.glide,
    ),
  };
};
