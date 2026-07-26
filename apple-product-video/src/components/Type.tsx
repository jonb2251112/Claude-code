/**
 * ─────────────────────────────────────────────────────────────────────────────
 * TYPOGRAPHY IN MOTION
 * ─────────────────────────────────────────────────────────────────────────────
 * There is exactly one text animation in this film, used everywhere:
 *
 *      opacity  0 → 1
 *      translateY  +Δ → 0        (small: 14–22px at 1080p, never more)
 *      blur  8px → 0             (the expensive part)
 *      letter-spacing  wide → set (the *really* expensive part)
 *
 * The last two are what separate this from a generic fade-up.
 *
 * · The blur makes the type feel like it's coming into focus rather than
 *   appearing — it borrows the language of a lens, so it sits naturally on
 *   footage instead of on top of it.
 *
 * · The tracking settle is the signature Apple move. Letters start ~0.18em
 *   further apart and close to their designed tracking on the same curve as
 *   everything else. Because the word's *width* is animating, the eye reads it
 *   as the word arriving from depth. Done at 3–4× this amplitude it looks
 *   cheap; at 0.18em it just looks expensive.
 *
 * All of it rides EASE.settle — a curve with no overshoot whatsoever. Type that
 * bounces reads as a template. Type that decelerates for 600ms reads as film.
 */

import React from 'react';
import {useCurrentFrame} from 'remotion';
import {EASE, FONT_FAMILY} from '../config/theme';
import {clamp, track} from '../lib/anim';

/** Pulls the numeric em value out of a token like '0.34em' so we can animate it. */
const emOf = (value: React.CSSProperties['letterSpacing']): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.endsWith('em')) return parseFloat(value);
  return 0;
};

export type RevealTextProps = {
  children: string;
  /** Frames to wait before this block starts. */
  delay?: number;
  /** Length of the entrance. 26–34 frames at 30fps is the sweet spot. */
  duration?: number;
  /** Multiplied into the final opacity — scenes use this to fade blocks out. */
  opacity?: number;
  /** Vertical travel in design pixels. */
  y?: number;
  /** Starting blur in design pixels. */
  blur?: number;
  /** Extra letter-spacing (em) at the start of the entrance. */
  trackingFrom?: number;
  /** Stagger mode. 'line' animates each line of a multi-line string separately. */
  stagger?: 'none' | 'word' | 'line';
  /** Frames between staggered elements. */
  staggerStep?: number;
  style?: React.CSSProperties;
  as?: 'div' | 'span' | 'h1' | 'h2' | 'p';
};

/** One animated run of text. */
const Run: React.FC<{
  text: string;
  frame: number;
  start: number;
  duration: number;
  y: number;
  blur: number;
  trackingFrom: number;
  baseTracking: number;
  opacity: number;
  style?: React.CSSProperties;
  block?: boolean;
}> = ({text, frame, start, duration, y, blur, trackingFrom, baseTracking, opacity, style, block}) => {
  const t = track(frame, [[start, 0], [start + duration, 1]], EASE.settle);

  // Opacity resolves faster than movement — the type is fully visible while it
  // is still settling, which is what makes the settle feel like weight rather
  // than like a slow fade.
  const o = track(frame, [[start, 0], [start + duration * 0.62, 1]], EASE.cinematic);

  return (
    <span
      style={{
        display: block ? 'block' : 'inline-block',
        opacity: clamp(o * opacity),
        transform: `translate3d(0, ${(1 - t) * y}px, 0)`,
        filter: t < 0.999 ? `blur(${(1 - t) * blur}px)` : undefined,
        letterSpacing: `${baseTracking + (1 - t) * trackingFrom}em`,
        // Promote to its own layer so the blur is composited on the GPU.
        willChange: 'transform, opacity, filter',
        ...style,
      }}
    >
      {text}
    </span>
  );
};

export const RevealText: React.FC<RevealTextProps> = ({
  children,
  delay = 0,
  duration = 30,
  opacity = 1,
  y = 18,
  blur = 8,
  trackingFrom = 0.18,
  stagger = 'line',
  staggerStep = 5,
  style,
  as: Tag = 'div',
}) => {
  const frame = useCurrentFrame();
  const baseTracking = emOf(style?.letterSpacing);

  const shared = {
    frame,
    duration,
    y,
    blur,
    trackingFrom,
    baseTracking,
    opacity,
  };

  const wrapperStyle: React.CSSProperties = {
    fontFamily: FONT_FAMILY,
    margin: 0,
    // The animated letterSpacing lives on the runs, not here.
    ...style,
    letterSpacing: undefined,
  };

  if (stagger === 'none') {
    return (
      <Tag style={wrapperStyle}>
        <Run text={children} start={delay} {...shared} block />
      </Tag>
    );
  }

  if (stagger === 'word') {
    const words = children.split(' ');
    return (
      <Tag style={wrapperStyle}>
        {words.map((word, i) => (
          <React.Fragment key={`${word}-${i}`}>
            <Run text={word} start={delay + i * staggerStep} {...shared} />
            {i < words.length - 1 ? ' ' : null}
          </React.Fragment>
        ))}
      </Tag>
    );
  }

  // 'line' — split on \n. Each line gets its own delay, which is how you make a
  // two-line headline feel written rather than dropped in.
  const lines = children.split('\n');
  return (
    <Tag style={wrapperStyle}>
      {lines.map((line, i) => (
        <Run key={`${line}-${i}`} text={line} start={delay + i * staggerStep} {...shared} block />
      ))}
    </Tag>
  );
};

/**
 * A hairline rule that draws itself outward from the centre. Used under the
 * kickers. Costs nothing, and the eye reads a drawn line as "considered".
 */
export const HairRule: React.FC<{
  delay?: number;
  width?: number;
  opacity?: number;
  color?: string;
  duration?: number;
}> = ({delay = 0, width = 64, opacity = 1, color = 'rgba(255,255,255,0.34)', duration = 34}) => {
  const frame = useCurrentFrame();
  const t = track(frame, [[delay, 0], [delay + duration, 1]], EASE.cinematic);

  return (
    <div
      style={{
        width: width * t,
        height: 1,
        background: color,
        opacity: clamp(t * 1.4) * opacity,
        transformOrigin: 'center',
      }}
    />
  );
};
