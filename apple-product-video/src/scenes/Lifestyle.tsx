/**
 * ── SCENE 4 · 22–32s · EMOTIONAL CLOSE ─────────────────────────────────────
 *
 * Ten seconds. One camera move. One sentence.
 *
 * This is the hardest scene to get right because the instinct is to add
 * something. Don't. Everything that happens here is atmospheric: the light
 * warms to domestic tungsten, dust comes up in the air, the fog thickens
 * slightly, and the camera makes a 60° arc so slow you can't see it moving —
 * you can only see that it has moved.
 *
 * The line is set at the same size as the feature headlines but centred and
 * held for 6.5 seconds — roughly four times longer than anything before it.
 * Duration is the entire mechanism: a sentence you're given time to finish
 * reading feels like a statement, the same sentence cut at 2s feels like a
 * caption.
 *
 * ── SOUND ────────────────────────────────────────────────────────────────
 * Bed only — the pad opens up a fifth and the sub falls away. No transients
 * anywhere in this scene. If you add room tone, this is where it goes.
 */

import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {PRODUCT} from '../config/product';
import {COLORS, EASE, TYPE} from '../config/theme';
import {s} from '../config/timeline';
import {fadeInOut, track} from '../lib/anim';
import {RevealText} from '../components/Type';

export const Lifestyle: React.FC = () => {
  const frame = useCurrentFrame();
  const length = s(10);

  /* On at 1.6s, off at 8.3s. The out-fade is 34 frames — more than a second —
   * because at this pace a quick cut on the type would feel like a jolt. */
  const out = fadeInOut(frame, s(1.2), length - s(0.6), 6, 34);

  /* The type drifts upward by 26px across its whole life, at a constant slow
   * rate. It's a parallax cue: the type sits in a different plane from the
   * product, so the frame gains depth without anything obviously moving. */
  const drift = track(frame, [[0, 0], [length, -26]], EASE.linear);

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          transform: `translateY(${drift}px)`,
        }}
      >
        {/* Pinned to the upper third. The camera's rising look-at target walks
          * the product down into the lower half across this scene, so the two
          * never share space — the frame is split cleanly into "words" above
          * and "object" below. */}
        <div style={{marginBottom: 560}}>
          <RevealText
            delay={s(1.2)}
            duration={46}
            opacity={out}
            y={20}
            blur={10}
            trackingFrom={0.08}
            stagger="line"
            staggerStep={8}
            style={{
              ...TYPE.statement,
              color: COLORS.softWhite,
              textAlign: 'center',
              textShadow: '0 2px 40px rgba(0,0,0,0.55)',
            }}
          >
            {PRODUCT.lifestyleLine}
          </RevealText>
        </div>
      </div>
    </AbsoluteFill>
  );
};
