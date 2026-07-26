/**
 * ── SCENE 2 · 4–12s · HERO REVEAL ──────────────────────────────────────────
 *
 * The camera does the work here (a 68° orbit craning down from 2.7m to 1.15m —
 * see three/cameraTimeline.ts). This layer only has to introduce the name, and
 * the discipline is in *when*: nothing appears for the first 1.2 seconds, so
 * the audience gets a clean look at the object before they're given a word.
 *
 * Order of arrival: kicker → wordmark → rule → tagline. Each is 12–18 frames
 * behind the last. That cascade is deliberate — simultaneous type reads as a
 * slide; cascaded type reads as a reveal.
 *
 * ── SOUND ────────────────────────────────────────────────────────────────
 * Riser resolves into the pad on the first frame of this scene; a single soft
 * sub-hit lands with the wordmark (frame 42 local ≈ 5.4s).
 */

import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {PRODUCT} from '../config/product';
import {COLORS, TYPE} from '../config/theme';
import {fadeInOut} from '../lib/anim';
import {HairRule, RevealText} from '../components/Type';

export const HeroReveal: React.FC = () => {
  const frame = useCurrentFrame();

  /* One master opacity for the whole block. Entrances are per-element (below),
   * but the exit is unified — the type should leave as a single object. */
  const out = fadeInOut(frame, 0, 240, 0, 26);

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {/* Scrim. 22% at the very bottom, fully transparent by 55% height. Without
        * it, white type over a bright chamfer highlight loses its edges. */}
      <AbsoluteFill
        style={{
          opacity: out,
          background:
            'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.18) 26%, rgba(0,0,0,0) 52%)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 118,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 22,
        }}
      >
        <RevealText
          delay={30}
          duration={30}
          opacity={out}
          y={12}
          blur={5}
          trackingFrom={0.14}
          stagger="none"
          style={{...TYPE.kicker, color: COLORS.mist}}
        >
          {PRODUCT.kicker}
        </RevealText>

        {/* The wordmark. Longest travel, biggest blur, widest tracking settle —
          * it's the hero of the frame and it should arrive with the most weight. */}
        <RevealText
          delay={42}
          duration={42}
          opacity={out}
          y={26}
          blur={12}
          trackingFrom={0.2}
          stagger="none"
          as="h1"
          style={{
            ...TYPE.hero,
            color: COLORS.white,
            /* NOTE: a `background-clip: text` gradient is the obvious way to
             * give the wordmark a surface, and it does not work here — each
             * animated run carries a `filter: blur()`, which promotes it to
             * its own compositing layer and detaches it from the parent's
             * clipped background, rendering the type invisible. A soft glow
             * gets most of the same lift with none of the fragility. */
            textShadow: '0 0 60px rgba(160,190,255,0.18), 0 2px 30px rgba(0,0,0,0.5)',
          }}
        >
          {PRODUCT.name}
        </RevealText>

        <div style={{opacity: out}}>
          <HairRule delay={66} width={72} opacity={out} />
        </div>

        <RevealText
          delay={78}
          duration={34}
          opacity={out}
          y={14}
          blur={6}
          trackingFrom={0.06}
          stagger="none"
          style={{...TYPE.tagline, color: COLORS.mist, marginTop: 4}}
        >
          {PRODUCT.tagline}
        </RevealText>
      </div>
    </AbsoluteFill>
  );
};
