/**
 * ── SCENE 1 · 0–4s · COLD OPEN ─────────────────────────────────────────────
 *
 * No type. No logo. Nothing to read.
 *
 * The entire scene is carried by the 3D layer — 5,000 particles converging onto
 * the product's surface (see three/Particles.tsx) lit only by a hard rim, so
 * what resolves is a silhouette rather than an object.
 *
 * The one thing the DOM contributes is a soft central bloom that swells as the
 * particles land and then falls away. It does two jobs: it gives the cloud a
 * light *source* to be scattering from, and it hides the moment the particles
 * dissolve, so the product appears to have always been there.
 *
 * ── SOUND ────────────────────────────────────────────────────────────────
 * A single low sub-drone fading up from silence, plus a soft "granular"
 * shimmer that resolves as the particles land — see scripts/generate-audio.mjs
 * (`ambient-bed.wav` and `riser.wav`). Mix: −24 LUFS, no transient before 3.4s.
 */

import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {COLORS, EASE} from '../config/theme';
import {s} from '../config/timeline';
import {track} from '../lib/anim';

export const ColdOpen: React.FC = () => {
  const frame = useCurrentFrame();

  /* Bloom envelope: swells over 2.5s, peaks exactly as the particles arrive
   * (frame 105 ≈ 3.5s), then collapses. Slow in, fast out. */
  const bloom = track(
    frame,
    [
      [0, 0],
      [s(2.4), 0.5],
      [s(3.5), 1],
      [s(4.6), 0.12],
    ],
    EASE.glide,
  );

  /* A very slow scale on the bloom. Because it's a screen-blended radial, this
   * reads as the light source physically approaching the lens. */
  const scale = 0.82 + bloom * 0.5;

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <AbsoluteFill
        style={{
          mixBlendMode: 'screen',
          opacity: bloom,
          transform: `scale(${scale})`,
          background: `radial-gradient(ellipse 40% 34% at 50% 52%,
            ${COLORS.accent}3d 0%,
            ${COLORS.accent}14 38%,
            rgba(0,0,0,0) 68%)`,
        }}
      />

      {/* A second, tighter core with a touch of white. Two-layer glows read as
        * atmosphere; single-layer glows read as a Photoshop brush. */}
      <AbsoluteFill
        style={{
          mixBlendMode: 'screen',
          opacity: bloom * 0.7,
          transform: `scale(${0.9 + bloom * 0.25})`,
          background: `radial-gradient(ellipse 16% 13% at 50% 52%,
            rgba(255,255,255,0.22) 0%,
            rgba(255,255,255,0) 72%)`,
        }}
      />
    </AbsoluteFill>
  );
};
