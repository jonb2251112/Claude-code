/**
 * Composition registry.
 *
 * All four entries render the exact same component — <DesignFrame> handles the
 * resolution change and the 3D layer is resolution-independent by nature, so
 * 4K is genuinely just a larger number here rather than a separate build.
 */

import React from 'react';
import {Composition, Sequence, Still} from 'remotion';
import {DURATION, FPS} from './config/timeline';
import {Film} from './Film';

/* Inter, bundled locally by @fontsource — no network request at render time,
 * which keeps renders reproducible offline and identical across machines.
 * Weights match the ones referenced in config/theme.ts. */
import '@fontsource/inter/200.css';
import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';

/**
 * Poster frame.
 *
 * A <Still> only ever renders frame 0, so we wrap the film in a Sequence with
 * a NEGATIVE offset — that rewinds the whole tree and puts any frame you like
 * at time zero. Useful for key art, thumbnails and checking a single frame at
 * full 4K without rendering the movie.
 */
const Poster: React.FC<{posterFrame: number}> = ({posterFrame}) => (
  <Sequence from={-posterFrame} layout="none">
    <Film />
  </Sequence>
);

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* ── Master · 1080p ──────────────────────────────────────────────── */}
      <Composition
        id="AuraFilm"
        component={Film}
        durationInFrames={DURATION}
        fps={FPS}
        width={1920}
        height={1080}
      />

      {/* ── Master · 4K ─────────────────────────────────────────────────── */}
      <Composition
        id="AuraFilm4K"
        component={Film}
        durationInFrames={DURATION}
        fps={FPS}
        width={3840}
        height={2160}
      />

      {/* ── Vertical cut · 9:16 ─────────────────────────────────────────────
        * The 3D camera framing is composed for 16:9, so this crops in on the
        * product. It is included because it costs nothing and social cutdowns
        * are always asked for; for a proper vertical master, add a second set
        * of camera keys in three/cameraTimeline.ts. */}
      <Composition
        id="AuraFilmVertical"
        component={Film}
        durationInFrames={DURATION}
        fps={FPS}
        width={1080}
        height={1920}
      />

      {/* ── Poster still ────────────────────────────────────────────────────
        * Frame 300 = 10s, the peak of the hero reveal. */}
      <Still
        id="AuraPoster"
        component={Poster}
        width={3840}
        height={2160}
        defaultProps={{posterFrame: 300}}
      />
    </>
  );
};
