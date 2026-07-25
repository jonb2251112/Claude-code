/**
 * ── SCENE 3 · 12–22s · FEATURE HIGHLIGHTS ──────────────────────────────────
 *
 * Three beats of 3⅓ seconds, joined by hard cuts masked with light flares.
 *
 *   1 · MATERIAL     macro on the chamfer, 18° lens, reflections doing everything
 *   2 · ARCHITECTURE the assembly separates and reassembles (an exploded view is
 *                    the single most "Apple" beat available — it says "we know
 *                    exactly what's inside because we made all of it")
 *   3 · CONTEXT      pull wide, light warms, dust comes up — this beat is
 *                    already the lifestyle act starting, which is why there is
 *                    no cut at 22s.
 *
 * Layout is one fixed editorial grid for all three: type anchored bottom-left
 * at the 120px margin. Moving the type per beat would fight the picture cuts;
 * pinning it makes the *image* the thing that changes.
 *
 * ── SOUND ────────────────────────────────────────────────────────────────
 * A short filtered whoosh on each cut (`whoosh.wav`), plus a soft mechanical
 * "seat" click when the exploded layers close at ~19.4s.
 */

import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame} from 'remotion';
import {PRODUCT} from '../config/product';
import {COLORS, EASE, TYPE} from '../config/theme';
import {FEATURE_BEATS} from '../config/timeline';
import {fadeInOut, track} from '../lib/anim';
import {HairRule, RevealText} from '../components/Type';

const Beat: React.FC<{index: number; length: number}> = ({index, length}) => {
  const frame = useCurrentFrame();
  const feature = PRODUCT.features[index];

  /* Type is on screen for ~2.6 of the beat's 3.3 seconds: in fast (it has to
   * survive the flare), out early (so the last 20 frames are pure picture,
   * which is what lets the next cut land cleanly). */
  const out = fadeInOut(frame, 0, length - 6, 0, 20);
  const tick = track(frame, [[8, 0], [26, 1]], EASE.cinematic);

  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <AbsoluteFill
        style={{
          opacity: out,
          background:
            'linear-gradient(105deg, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.28) 34%, rgba(0,0,0,0) 62%)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: 120,
          bottom: 120,
          maxWidth: 900,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 18,
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: 18}}>
          {/* The accent appears exactly once per beat, on a 2px tick. That is
            * the whole accent budget for these ten seconds.
            *
            * It draws vertically rather than fading, on the same delay as the
            * kicker beside it — a tick that simply switches on at full opacity
            * on the first frame of the beat pops out of the flare and reads as
            * a rendering glitch. */}
          <div
            style={{
              width: 2,
              height: 20 * tick,
              background: COLORS.accent,
              opacity: out * 0.9,
              boxShadow: `0 0 12px ${COLORS.accent}`,
            }}
          />
          <RevealText
            delay={8}
            duration={26}
            opacity={out}
            y={10}
            blur={4}
            trackingFrom={0.1}
            stagger="none"
            style={{...TYPE.kicker, color: COLORS.softWhite}}
          >
            {feature.kicker}
          </RevealText>
        </div>

        {/* Two-line headline, staggered by line. The second line arriving 6
          * frames late is the difference between "a caption" and "a thought". */}
        <RevealText
          delay={16}
          duration={38}
          opacity={out}
          y={22}
          blur={9}
          trackingFrom={0.05}
          stagger="line"
          staggerStep={6}
          as="h2"
          style={{...TYPE.headline, color: COLORS.softWhite}}
        >
          {feature.headline}
        </RevealText>

        <HairRule delay={34} width={54} opacity={out * 0.7} duration={30} />

        <RevealText
          delay={38}
          duration={32}
          opacity={out * 0.92}
          y={12}
          blur={5}
          trackingFrom={0.03}
          stagger="none"
          style={{...TYPE.body, color: COLORS.mist, maxWidth: 640}}
        >
          {feature.detail}
        </RevealText>
      </div>

      {/* Beat counter — three ticks, bottom right. A tiny piece of information
        * design that tells the viewer how long this section will last, which
        * makes a 10-second sequence feel deliberate rather than long. */}
      <div
        style={{
          position: 'absolute',
          right: 120,
          bottom: 132,
          display: 'flex',
          gap: 10,
          opacity: out * 0.8,
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: i === index ? 26 : 6,
              height: 2,
              borderRadius: 1,
              background: i === index ? COLORS.softWhite : 'rgba(255,255,255,0.28)',
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const Features: React.FC = () => (
  <>
    {FEATURE_BEATS.map((beat) => (
      <Sequence
        key={beat.index}
        // Offsets are relative to the parent Sequence, which starts at 12s.
        from={beat.start - FEATURE_BEATS[0].start}
        durationInFrames={beat.end - beat.start}
        layout="none"
      >
        <Beat index={beat.index} length={beat.end - beat.start} />
      </Sequence>
    ))}
  </>
);
