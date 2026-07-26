/**
 * ─────────────────────────────────────────────────────────────────────────────
 * DOM POST LAYER
 * ─────────────────────────────────────────────────────────────────────────────
 * Grain, vignette, flares and the final fade live here rather than in the WebGL
 * composer, for one reason: they need to sit over the TYPOGRAPHY as well as
 * over the render. Grain that stops at the edge of a title card is the classic
 * tell that the titles were comped on afterwards.
 */

import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, EASE, LOOK} from '../config/theme';
import {CUTS, DURATION, FADE_OUT, s} from '../config/timeline';
import {clamp, progress, track} from '../lib/anim';
import {getStageState} from '../three/grade';

/**
 * Film grain — animated SVG turbulence.
 *
 * The seed advances every frame, which is the whole point: static grain reads
 * as a dirty lens, moving grain reads as film stock. `overlay` blend keeps it
 * out of the deep blacks (real grain is least visible in the shadows of a
 * digital-intermediate print) and `baseFrequency` is high enough that the
 * structure stays sub-pixel-ish at 4K.
 */
export const FilmGrain: React.FC<{opacity?: number}> = ({opacity = 0.05}) => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  if (!LOOK.filmGrain) return null;

  return (
    <AbsoluteFill
      style={{
        mixBlendMode: 'overlay',
        opacity,
        pointerEvents: 'none',
      }}
    >
      <svg width={width} height={height} style={{display: 'block'}}>
        <filter id="grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.82"
            numOctaves={2}
            stitchTiles="stitch"
            // Cycling the seed over 24 values gives a natural-looking grain
            // loop without the pattern being legible.
            seed={frame % 24}
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};

/**
 * Vignette + a very slight corner cool-down.
 *
 * Two stacked gradients: a broad darkening that starts at 55% radius (any
 * earlier and it reads as a filter), and a much tighter corner falloff that
 * mimics mechanical vignetting on a fast prime.
 */
export const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      pointerEvents: 'none',
      background: `
        radial-gradient(ellipse 76% 68% at 50% 48%,
          rgba(0,0,0,0) 55%,
          rgba(0,0,0,0.28) 82%,
          rgba(0,0,0,0.62) 100%),
        radial-gradient(ellipse 120% 120% at 50% 50%,
          rgba(0,0,0,0) 70%,
          rgba(0,0,0,0.35) 100%)
      `,
    }}
  />
);

/**
 * Anamorphic light flare used to mask the hard cuts.
 *
 * Structure of a real anamorphic flare: a hot core, a horizontal streak roughly
 * 20× wider than it is tall, and a faint blue halation. It fires over 10 frames
 * — long enough to feel optical, short enough that you never resolve it.
 *
 * This is the trick that turns five separate camera setups into "one film":
 * the eye accepts an enormous jump in framing if it happens *behind* a burst
 * of light.
 */
const Flare: React.FC<{at: number}> = ({at}) => {
  const frame = useCurrentFrame();
  const life = 11;
  if (frame < at - 3 || frame > at + life) return null;

  const t = progress(frame, at - 3, at + life);
  // Fast attack (3 frames), slow-ish decay — the shape of an actual light hit.
  const intensity = t < 0.24 ? EASE.flash(t / 0.24) : Math.pow(1 - (t - 0.24) / 0.76, 2.4);
  const streak = clamp(intensity * 1.15);

  return (
    <AbsoluteFill style={{pointerEvents: 'none', mixBlendMode: 'screen'}}>
      {/* Horizontal streak */}
      <div
        style={{
          position: 'absolute',
          left: '-10%',
          top: '48%',
          width: '120%',
          height: 3,
          transform: `translateY(-50%) scaleY(${1 + streak * 26})`,
          background: `linear-gradient(90deg,
            rgba(120,170,255,0) 0%,
            rgba(180,210,255,${streak * 0.5}) 32%,
            rgba(255,255,255,${streak * 0.85}) 50%,
            rgba(180,210,255,${streak * 0.5}) 68%,
            rgba(120,170,255,0) 100%)`,
          filter: `blur(${8 + streak * 14}px)`,
        }}
      />
      {/* Core bloom */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse 44% 30% at 50% 48%,
            rgba(255,255,255,${streak * 0.34}) 0%,
            rgba(150,190,255,${streak * 0.12}) 42%,
            rgba(0,0,0,0) 72%)`,
        }}
      />
      {/* A full-frame lift, 4 frames only. Hides the geometry change entirely. */}
      <AbsoluteFill style={{backgroundColor: `rgba(226,238,255,${streak * 0.13})`}} />
    </AbsoluteFill>
  );
};

export const CutFlares: React.FC = () => (
  <>
    {CUTS.map((cut) => (
      <Flare key={cut} at={cut} />
    ))}
  </>
);

/**
 * Global colour grade. A single warm/cool wash driven by the same `warmth`
 * value the 3D lights use, so the DOM layer and the render never disagree
 * about what time of day it is.
 */
export const Grade: React.FC = () => {
  const frame = useCurrentFrame();
  const {warmth} = getStageState(frame);

  return (
    <>
      {/* Warm bounce, low-left — the "afternoon through a window" wash. */}
      <AbsoluteFill
        style={{
          pointerEvents: 'none',
          mixBlendMode: 'soft-light',
          opacity: warmth * 0.38,
          background: `radial-gradient(ellipse 90% 80% at 22% 78%,
            ${COLORS.warm}cc 0%, rgba(0,0,0,0) 62%)`,
        }}
      />
      {/* Cool counter-tint in the opposite corner. Warm *and* cool in one frame
        * is what gives a grade depth; a single tint just looks like a filter. */}
      <AbsoluteFill
        style={{
          pointerEvents: 'none',
          mixBlendMode: 'soft-light',
          opacity: 0.22,
          background: `radial-gradient(ellipse 80% 70% at 82% 12%,
            ${COLORS.accent}99 0%, rgba(0,0,0,0) 58%)`,
        }}
      />
    </>
  );
};

/** Optional 2.39:1 cinema bars. Off by default — Apple ads run full-frame. */
export const Letterbox: React.FC = () => {
  const frame = useCurrentFrame();
  if (!LOOK.letterbox) return null;

  // Bars slide in over the first second, so frame 0 is a clean full frame.
  const h = track(frame, [[0, 0], [s(1.2), 11.6]], EASE.cinematic);

  return (
    <>
      <div
        style={{position: 'absolute', top: 0, left: 0, right: 0, height: `${h}%`, background: '#000'}}
      />
      <div
        style={{position: 'absolute', bottom: 0, left: 0, right: 0, height: `${h}%`, background: '#000'}}
      />
    </>
  );
};

/**
 * Opening fade-up from black and the closing fade-out.
 *
 * The tail is 48 frames of EASE.exit — an accelerating curve, so the image
 * holds almost fully for a beat and then leaves quickly. A linear fade to black
 * always feels like the file ended; an accelerating one feels like a decision.
 */
export const FadeToBlack: React.FC = () => {
  const frame = useCurrentFrame();

  const opacity = track(
    frame,
    [
      [0, 1],
      [s(0.6), 0],
      [DURATION - FADE_OUT, 0],
      [DURATION - s(0.2), 1],
    ],
    EASE.exit,
  );

  return (
    <AbsoluteFill style={{backgroundColor: COLORS.void, opacity, pointerEvents: 'none'}} />
  );
};

/**
 * The complete DOM post stack, in composite order. Order is not arbitrary:
 * grade → flares → grain → vignette → fade. Grain must sit under the vignette
 * (grain is in the image, vignette is in the lens) and the fade must be last.
 */
export const PostStack: React.FC = () => (
  <>
    <Grade />
    <CutFlares />
    <FilmGrain opacity={0.05} />
    <Vignette />
    <Letterbox />
    <FadeToBlack />
  </>
);
