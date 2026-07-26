/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SOUND DESIGN — placeholder mix
 * ─────────────────────────────────────────────────────────────────────────────
 * The four stems are SYNTHESISED, not sampled: `npm run audio` writes them from
 * pure maths (see scripts/generate-audio.mjs), so the repo carries no binary
 * assets and the project makes sound the moment you clone it. They run
 * automatically on `npm install`.
 *
 * They are placeholders with the right SHAPE, not finished sound design. The
 * structure below is the part worth keeping — swap the four files for real
 * stems and the mix still works:
 *
 *   BED     a low pad under the entire film, ducking −4 dB under each cut so
 *           the whooshes have somewhere to sit
 *   RISER   3s into the hero reveal, resolving exactly on the cut at 4s
 *   WHOOSH  one per hard cut (4s, 12s, 15.3s, 18.6s, 32s)
 *   CHIME   a single struck bell as the logo mark completes
 *
 * ── Adding real audio ────────────────────────────────────────────────────
 * Drop your files in `public/audio/` with the same names, or point the
 * `staticFile()` calls elsewhere. For music with a fixed tempo, set the cut
 * points in config/timeline.ts to land on the beat — every camera move and
 * every text entrance will follow automatically, because they all derive from
 * the same constants.
 */

import React from 'react';
import {Audio, Sequence, staticFile} from 'remotion';
import {PRODUCT} from '../config/product';
import {CUTS, SCENES, s} from '../config/timeline';
import {clamp, track} from '../lib/anim';
import {EASE} from '../config/theme';

const V = PRODUCT.audio.masterVolume;

export const AudioBed: React.FC = () => {
  if (!PRODUCT.audio.enabled) return null;

  return (
    <>
      {/* ── Bed ────────────────────────────────────────────────────────────
        * Fades up over 1.5s, opens out for the lifestyle act, decays to
        * silence across the final 4 seconds under the fade to black. */}
      <Audio
        src={staticFile('audio/ambient-bed.wav')}
        volume={(f) =>
          clamp(
            track(
              f,
              [
                [0, 0],
                [s(1.5), 0.5],
                [SCENES.hero.start, 0.72],
                [SCENES.features.start, 0.62],
                [SCENES.lifestyle.start, 0.8],
                [SCENES.logo.start, 0.68],
                [SCENES.logo.end - s(0.4), 0],
              ],
              EASE.glide,
            ) * V,
          )
        }
      />

      {/* ── Riser ──────────────────────────────────────────────────────────
        * Starts at 1s and resolves ON the cut to the hero reveal. A riser that
        * peaks a few frames *before* the cut and is already decaying when the
        * picture changes is what makes the cut feel inevitable. */}
      <Sequence from={s(1)} durationInFrames={s(3.2)} layout="none">
        <Audio
          src={staticFile('audio/riser.wav')}
          volume={(f) => clamp(track(f, [[0, 0], [s(2.6), 0.55], [s(3.2), 0.1]], EASE.glide) * V)}
        />
      </Sequence>

      {/* ── Whooshes ───────────────────────────────────────────────────────
        * Fired 4 frames early on every hard cut. Sound leading picture by
        * ~130ms is standard practice — the ear commits to the transition
        * fractionally before the eye does, and the cut lands harder for it. */}
      {CUTS.map((cut) => (
        <Sequence key={cut} from={Math.max(0, cut - 4)} durationInFrames={s(1.2)} layout="none">
          <Audio src={staticFile('audio/whoosh.wav')} volume={0.34 * V} />
        </Sequence>
      ))}

      {/* ── Chime ──────────────────────────────────────────────────────────
        * Struck as the logo mark finishes drawing (32s + 50 frames). */}
      <Sequence from={SCENES.logo.start + 50} durationInFrames={s(5)} layout="none">
        <Audio
          src={staticFile('audio/chime.wav')}
          volume={(f) => clamp(track(f, [[0, 0.42], [s(3.5), 0.42], [s(4.6), 0]], EASE.glide) * V)}
        />
      </Sequence>
    </>
  );
};
