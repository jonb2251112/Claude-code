/**
 * Resolution independence.
 *
 * Every overlay in the film is authored at exactly 1920×1080 — real pixel
 * values, no rem/vw arithmetic scattered through the scenes. This component
 * then scales that design canvas to whatever the composition actually is, so
 * the same code renders identically at 1080p, 4K, or a 1080×1920 vertical cut.
 *
 * Scaling a transform is also strictly better than recomputing type sizes:
 * the tracking, line-height and optical relationships you tuned at 1080p are
 * preserved exactly rather than re-rounded at the new size.
 */

import React from 'react';
import {AbsoluteFill, useVideoConfig} from 'remotion';

export const DESIGN_WIDTH = 1920;
export const DESIGN_HEIGHT = 1080;

export const DesignFrame: React.FC<{children: React.ReactNode}> = ({children}) => {
  const {width, height} = useVideoConfig();

  // `min` rather than `max` so nothing is ever cropped on a different aspect.
  const scale = Math.min(width / DESIGN_WIDTH, height / DESIGN_HEIGHT);

  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
      <div
        style={{
          width: DESIGN_WIDTH,
          height: DESIGN_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          position: 'relative',
          flexShrink: 0,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};
