/**
 * ── SCENE 5 · 32–40s · LOGO LOCKUP + FADE ──────────────────────────────────
 *
 * The product recedes into the dark (camera pulls from 6.7 to 15.5 units while
 * the stage exposure prints down — see three/grade.ts), and the lockup takes
 * the frame it leaves behind.
 *
 * The mark is drawn, not faded: a stroked SVG ring revealed with
 * stroke-dashoffset. A logo that *draws* implies it was constructed; a logo
 * that fades in implies it was placed. Same asset, completely different read.
 *
 * The last 48 frames are an accelerating fade to black (see Post.tsx →
 * FadeToBlack). Nothing is on screen for the final 6 frames — an ad that ends
 * on black for a beat feels finished, one that cuts on the logo feels truncated.
 *
 * ── SOUND ────────────────────────────────────────────────────────────────
 * Single soft bell struck as the mark completes (`chime.wav`, ~34.2s), then the
 * pad decays to silence across the final 4 seconds. No stinger on the fade.
 */

import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {PRODUCT} from '../config/product';
import {COLORS, EASE, TYPE} from '../config/theme';
import {s} from '../config/timeline';
import {clamp, fadeInOut, track} from '../lib/anim';
import {HairRule, RevealText} from '../components/Type';

/**
 * The mark: two concentric arcs and a centre dot — an aperture, which is both
 * on-brief for a product about light and legible at 24px.
 *
 * Outer ring draws clockwise over 34 frames; inner ring follows 10 frames
 * later and draws the other way. Counter-rotation is what stops it looking
 * like a loading spinner.
 */
const Mark: React.FC<{delay: number; opacity: number}> = ({delay, opacity}) => {
  const frame = useCurrentFrame();
  const R_OUTER = 52;
  const R_INNER = 34;
  const cOuter = 2 * Math.PI * R_OUTER;
  const cInner = 2 * Math.PI * R_INNER;

  const drawOuter = track(frame, [[delay, 0], [delay + 38, 1]], EASE.cinematic);
  const drawInner = track(frame, [[delay + 10, 0], [delay + 46, 1]], EASE.cinematic);
  const dot = track(frame, [[delay + 30, 0], [delay + 52, 1]], EASE.settle);

  /* A 3° counter-rotation applied to the whole mark as it settles. Sub-degree
   * rotations are invisible; 3° over 50 frames is felt but not seen. */
  const spin = (1 - drawOuter) * 3;

  return (
    <svg
      width={132}
      height={132}
      viewBox="0 0 132 132"
      style={{
        opacity,
        transform: `rotate(${spin}deg)`,
        filter: `drop-shadow(0 0 18px ${COLORS.accent}33)`,
      }}
    >
      <defs>
        <linearGradient id="markGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={COLORS.white} />
          <stop offset="100%" stopColor="#9aa2ad" />
        </linearGradient>
      </defs>

      <circle
        cx={66}
        cy={66}
        r={R_OUTER}
        fill="none"
        stroke="url(#markGrad)"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeDasharray={cOuter}
        strokeDashoffset={cOuter * (1 - drawOuter)}
        transform="rotate(-90 66 66)"
      />
      <circle
        cx={66}
        cy={66}
        r={R_INNER}
        fill="none"
        stroke={COLORS.accent}
        strokeOpacity={0.85}
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeDasharray={cInner}
        strokeDashoffset={-cInner * (1 - drawInner)}
        transform="rotate(90 66 66)"
      />
      <circle cx={66} cy={66} r={4.5 * dot} fill={COLORS.white} opacity={dot} />
    </svg>
  );
};

export const LogoLockup: React.FC = () => {
  const frame = useCurrentFrame();
  const length = s(8);

  /* Everything holds until 6.6s, then leaves 20 frames ahead of the master
   * fade-to-black — so the type is gone *before* the picture is, which reads
   * as an ending rather than as a dissolve. */
  const out = fadeInOut(frame, 0, length - s(0.7), 0, 30);

  /* A slow bloom behind the lockup, peaking as the mark completes. */
  const halo = track(
    frame,
    [
      [s(0.3), 0],
      [s(2.2), 1],
      [s(6.4), 0.25],
    ],
    EASE.glide,
  );

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {/* Halo. Screen-blended so it lifts the black without greying it. */}
      <AbsoluteFill
        style={{
          mixBlendMode: 'screen',
          opacity: clamp(halo * out) * 0.75,
          background: `radial-gradient(ellipse 34% 42% at 50% 46%,
            rgba(190,214,255,0.16) 0%, rgba(0,0,0,0) 66%)`,
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 30,
          // Sits above true centre: the product is still receding through the
          // lower half of frame for the first two seconds of this scene.
          paddingBottom: 150,
        }}
      >
        <Mark delay={12} opacity={out} />

        {/* Brand wordmark. Very wide tracking (0.42em) at a modest size is the
          * standard luxury lockup proportion — the letters read as a shape
          * first and a word second. */}
        <RevealText
          delay={54}
          duration={42}
          opacity={out}
          y={14}
          blur={7}
          trackingFrom={0.22}
          stagger="none"
          style={{
            fontSize: 54,
            fontWeight: 300,
            letterSpacing: '0.42em',
            // Optical correction: wide tracking adds a trailing space after the
            // final letter, which pushes a centred wordmark visibly left.
            textIndent: '0.42em',
            color: COLORS.white,
          }}
        >
          {PRODUCT.brand}
        </RevealText>

        <HairRule delay={78} width={120} opacity={out * 0.45} duration={40} />

        <RevealText
          delay={92}
          duration={40}
          opacity={out}
          y={16}
          blur={7}
          trackingFrom={0.07}
          stagger="none"
          style={{...TYPE.statement, fontSize: 46, color: COLORS.softWhite, textAlign: 'center'}}
        >
          {PRODUCT.statement}
        </RevealText>

        <RevealText
          delay={118}
          duration={34}
          opacity={out * 0.6}
          y={10}
          blur={4}
          trackingFrom={0.1}
          stagger="none"
          style={{...TYPE.kicker, fontSize: 15, color: COLORS.mist, marginTop: 14}}
        >
          {PRODUCT.footnote}
        </RevealText>
      </div>
    </AbsoluteFill>
  );
};
