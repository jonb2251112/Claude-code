/**
 * ─────────────────────────────────────────────────────────────────────────────
 * POST-PROCESSING
 * ─────────────────────────────────────────────────────────────────────────────
 * Two passes only. Restraint here matters more than anywhere else in the file —
 * heavy post is the fastest way to make premium CG look like a demo reel.
 *
 *  · BLOOM  — threshold sits at 0.72 so it only catches genuine highlights: the
 *             chamfer specular, the display core, the light seam, the particles.
 *             Large radius, low intensity: a wide, soft halo reads as an
 *             expensive lens; a tight bright one reads as a filter.
 *
 *  · CHROMATIC ABERRATION — 0.4px at the frame edge, zero at centre. You should
 *             not be able to see it. You should be able to see when it's gone:
 *             it's what stops the render looking mathematically clean.
 *
 * Film grain and the vignette are applied in the DOM overlay instead (see
 * src/overlays/), so they also sit over the typography — grain that stops at
 * the edge of the type is a dead giveaway that the titles were added later.
 */

import React, {useMemo} from 'react';
import {Bloom, ChromaticAberration, EffectComposer} from '@react-three/postprocessing';
import {BlendFunction, KernelSize} from 'postprocessing';
import * as THREE from 'three';

export const Effects: React.FC<{bloom: number}> = ({bloom}) => {
  // Offsets are in NDC-ish units; keep the Vector2 stable across frames so the
  // effect isn't rebuilt every time React re-renders.
  const aberration = useMemo(() => new THREE.Vector2(0.00042, 0.00034), []);

  return (
    <EffectComposer
      // Remotion renders one frame at a time into an offscreen buffer; disabling
      // multisampling here avoids a resolve step we don't need since the base
      // Canvas is already antialiased.
      multisampling={0}
      // No depth buffer required by either pass — skipping it is a measurable
      // saving at 4K.
      enableNormalPass={false}
    >
      <Bloom
        intensity={bloom}
        luminanceThreshold={0.72}
        luminanceSmoothing={0.28}
        kernelSize={KernelSize.LARGE}
        mipmapBlur
      />
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={aberration}
        radialModulation
        modulationOffset={0.42}
      />
    </EffectComposer>
  );
};
