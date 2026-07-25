/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PRODUCT DATA — this is the file you edit to make the film about *your* product
 * ─────────────────────────────────────────────────────────────────────────────
 * Nothing here is referenced by more than one place at a time; every string,
 * colour and dimension flows out to the scenes automatically.
 */

export const PRODUCT = {
  /** Brand shown in the closing lockup. */
  brand: 'AURA',

  /** Big wordmark in the hero reveal (4–12s). */
  name: 'Aura One',

  /** Sits above the wordmark in small caps. */
  kicker: 'Introducing',

  /** One line under the wordmark. Keep it under ~40 characters. */
  tagline: 'Light, given form.',

  /**
   * The three feature beats (12–22s). Each gets ~3.3 seconds.
   * Order matters: material → interaction → context.
   */
  features: [
    {
      kicker: 'Unibody',
      headline: 'Machined from a\nsingle block of aluminium.',
      detail: 'A 0.4 mm diamond-cut chamfer, polished in six passes.',
    },
    {
      kicker: 'Architecture',
      headline: 'Every layer,\nengineered to disappear.',
      detail: 'Nine components. One continuous surface.',
    },
    {
      kicker: 'Presence',
      headline: 'It knows when\nthe room changes.',
      detail: 'Ambient sensing across the full spectrum of visible light.',
    },
  ],

  /** The emotional beat (22–32s). One quiet line, held for a long time. */
  lifestyleLine: 'It doesn’t ask\nfor your attention.',

  /** Closing statement in the logo lockup (32–40s). */
  statement: 'Presence, perfected.',

  /** Small legal/plate line under the logo. */
  footnote: 'Available in Titanium and Graphite.',

  /**
   * ── Swapping in a real 3D model ──────────────────────────────────────────
   * Leave `type: 'procedural'` to use the built-in geometric product.
   *
   * To use a GLTF/GLB instead:
   *   1. Drop the file in `public/models/product.glb`
   *   2. Set `type: 'gltf'` and `path: 'models/product.glb'`
   *   3. See the note in `src/three/Product.tsx` — there is a ready-made
   *      <GltfProduct> branch there; you only need to set `scale`/`offset`
   *      so the model sits on the floor plane at y = 0.
   */
  model: {
    type: 'procedural' as 'procedural' | 'gltf',
    path: 'models/product.glb',
    /** Uniform scale applied to the loaded GLTF. */
    scale: 1,
    /** Y offset so the model rests on the floor. */
    offset: [0, 0, 0] as [number, number, number],
  },

  /** Dimensions of the procedural product, in world units (1 unit ≈ 10 cm). */
  dimensions: {
    /** Width/depth of the square body. */
    size: 3.0,
    /** Corner radius in plan view. Large radii are what make it read as Apple. */
    cornerRadius: 0.86,
    /** Thickness of the aluminium chassis. */
    thickness: 0.3,
    /** Chamfer/bevel size on the top and bottom edges. */
    bevel: 0.055,
    /**
     * How far the product floats above the floor plane.
     *
     * Hovering is a deliberate choice, not a shortcut: removing the contact
     * point means the only thing grounding the object is a soft shadow, which
     * is exactly how a product is shot on a rig over infinite white. It is also
     * the pivot the camera orbits — every shot in three/cameraTimeline.ts is
     * authored relative to this height.
     */
    hover: 0.62,
  },

  /** Audio bed — see `scripts/generate-audio.mjs`. Set to false for a silent cut. */
  audio: {
    enabled: true,
    /** Master volume for the whole mix, 0–1. */
    masterVolume: 0.85,
  },
} as const;

export type Product = typeof PRODUCT;
