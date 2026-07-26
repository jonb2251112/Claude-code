/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE FILM — composite root
 * ─────────────────────────────────────────────────────────────────────────────
 * Three layers, bottom to top:
 *
 *   1. <Stage>        one continuous WebGL scene, live for all 1200 frames.
 *                     Never unmounts. This is what makes the transitions read
 *                     as camera cuts inside one space rather than as five
 *                     separate videos butted together.
 *
 *   2. <DesignFrame>  the typography, authored at 1920×1080 and scaled to the
 *                     composition. Each scene is a <Sequence>, so it gets a
 *                     frame counter that starts at 0 — every delay inside a
 *                     scene is local and stays correct if you retime the edit.
 *
 *   3. <PostStack>    grade, cut flares, grain, vignette, fade to black.
 *                     Sits over BOTH of the above, deliberately.
 */

import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS} from './config/theme';
import {SCENES} from './config/timeline';
import {Stage} from './three/Stage';
import {DesignFrame} from './components/DesignFrame';
import {AudioBed} from './components/AudioBed';
import {PostStack} from './overlays/Post';
import {ColdOpen} from './scenes/ColdOpen';
import {HeroReveal} from './scenes/HeroReveal';
import {Features} from './scenes/Features';
import {Lifestyle} from './scenes/Lifestyle';
import {LogoLockup} from './scenes/LogoLockup';

const span = (scene: {start: number; end: number}) => ({
  from: scene.start,
  durationInFrames: scene.end - scene.start,
});

export const Film: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();

  return (
    <AbsoluteFill style={{backgroundColor: COLORS.void}}>
      {/* ── 1 · 3D ───────────────────────────────────────────────────────── */}
      <AbsoluteFill>
        <Stage frame={frame} width={width} height={height} />
      </AbsoluteFill>

      {/* ── 2 · Typography ───────────────────────────────────────────────── */}
      <DesignFrame>
        <Sequence {...span(SCENES.coldOpen)} layout="none">
          <ColdOpen />
        </Sequence>
        <Sequence {...span(SCENES.hero)} layout="none">
          <HeroReveal />
        </Sequence>
        <Sequence {...span(SCENES.features)} layout="none">
          <Features />
        </Sequence>
        <Sequence {...span(SCENES.lifestyle)} layout="none">
          <Lifestyle />
        </Sequence>
        <Sequence {...span(SCENES.logo)} layout="none">
          <LogoLockup />
        </Sequence>
      </DesignFrame>

      {/* ── 3 · Post ─────────────────────────────────────────────────────── */}
      <PostStack />

      {/* ── Sound ────────────────────────────────────────────────────────── */}
      <AudioBed />
    </AbsoluteFill>
  );
};
