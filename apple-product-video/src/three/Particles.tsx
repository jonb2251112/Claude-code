/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PARTICLE SYSTEMS
 * ─────────────────────────────────────────────────────────────────────────────
 * Two systems, both `THREE.Points` with a single additive sprite:
 *
 *   <FormingParticles> — the cold open. 5,000 points start scattered in a
 *                        volume and converge onto sampled points of the
 *                        product's surface, describing its silhouette in light
 *                        before the object itself is lit.
 *
 *   <DustMotes>        — ambient atmosphere for the lifestyle act. Slow,
 *                        near-invisible, and the single cheapest way to make a
 *                        CG frame feel photographed.
 *
 * Both write positions into a Float32Array every frame as a pure function of
 * `frame`. No velocity integration, no accumulated state — scrub anywhere in
 * the Studio timeline and you get the exact frame that will be rendered.
 */

import React, {useMemo, useRef} from 'react';
import * as THREE from 'three';
import {PRODUCT} from '../config/product';
import {COLORS_3D} from '../config/theme';
import {clamp, lerp, noise1D, rand} from '../lib/anim';
import {sampleProductSurface} from '../lib/geometry';
import {createRadialSprite} from '../lib/textures';
import {HOVER_HEIGHT} from './Product';

const COUNT = 5000;

export const FormingParticles: React.FC<{
  frame: number;
  collapse: number;
  opacity: number;
}> = ({frame, collapse, opacity}) => {
  const points = useRef<THREE.Points>(null);
  const sprite = useMemo(() => createRadialSprite(2.6), []);

  /* Start and end positions are computed once. `targets` are real points on the
   * product's shell; `origins` are a wide, flattened ellipsoid — flattened so
   * the cloud reads as a horizontal drift of dust rather than a ball. */
  const {origins, targets, delays} = useMemo(() => {
    const targetArr = sampleProductSurface(
      PRODUCT.dimensions.size,
      PRODUCT.dimensions.cornerRadius,
      PRODUCT.dimensions.thickness,
      COUNT,
      rand,
    );
    const originArr = new Float32Array(COUNT * 3);
    const delayArr = new Float32Array(COUNT);

    for (let i = 0; i < COUNT; i++) {
      const theta = rand(i * 11 + 1) * Math.PI * 2;
      const phi = Math.acos(rand(i * 11 + 2) * 2 - 1);
      const r = 5 + Math.pow(rand(i * 11 + 3), 0.6) * 11;
      originArr[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
      originArr[i * 3 + 1] = Math.cos(phi) * r * 0.34 + 0.7; // flattened
      originArr[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r;

      /* Staggered arrival. Particles closer to the camera land last, so the
       * form resolves from the inside out — the object appears to condense
       * rather than to be assembled. */
      delayArr[i] = Math.pow(rand(i * 11 + 4), 1.7) * 0.45;
    }
    return {origins: originArr, targets: targetArr, delays: delayArr};
  }, []);

  const positions = useMemo(() => new Float32Array(COUNT * 3), []);

  /* ── Per-frame solve ───────────────────────────────────────────────────── */
  for (let i = 0; i < COUNT; i++) {
    const d = delays[i];
    // Each particle runs its own remapped 0→1 over the remaining window.
    const t = clamp((collapse - d) / (1 - d));
    // Ease-out-quint per particle: fast approach, very long settle.
    const e = 1 - Math.pow(1 - t, 5);

    const ox = origins[i * 3];
    const oy = origins[i * 3 + 1];
    const oz = origins[i * 3 + 2];
    const tx = targets[i * 3];
    const ty = targets[i * 3 + 1] + HOVER_HEIGHT;
    const tz = targets[i * 3 + 2];

    /* An arc, not a straight line. The sine term peaks at t=0.5 and vanishes
     * at both ends, so particles curve into their landing point. Straight-line
     * convergence looks like a magnet; curved convergence looks like airflow. */
    const arc = Math.sin(e * Math.PI) * (1 - collapse * 0.55);
    const swirl = noise1D(i * 0.37, 7) * 2.4 * arc;
    const lift = noise1D(i * 0.61, 13) * 1.6 * arc;

    positions[i * 3] = lerp(ox, tx, e) + swirl;
    positions[i * 3 + 1] = lerp(oy, ty, e) + lift + arc * 0.5;
    positions[i * 3 + 2] = lerp(oz, tz, e) + swirl * 0.7;

    /* Once landed, a tiny amount of surface jitter keeps the cloud from
     * looking frozen in the two seconds before it dissolves. */
    if (e > 0.98) {
      const j = Math.sin(frame * 0.08 + i) * 0.006;
      positions[i * 3] += j;
      positions[i * 3 + 1] += Math.cos(frame * 0.07 + i) * 0.006;
    }
  }

  const geometry = points.current?.geometry;
  if (geometry) {
    const attr = geometry.getAttribute('position') as THREE.BufferAttribute;
    attr.needsUpdate = true;
  }

  if (opacity <= 0.001) return null;

  return (
    <points ref={points} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={sprite}
        color={COLORS_3D.accent}
        size={0.05}
        sizeAttenuation
        transparent
        opacity={opacity * 0.85}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
};

/**
 * Ambient dust. Motes drift on a slow noise field and are lit only by the key,
 * so they twinkle as they pass through the light. Population is small (900) and
 * the sprite is tiny — you should never consciously see a particle here, you
 * should just feel that the air has volume.
 */
export const DustMotes: React.FC<{frame: number; amount: number}> = ({frame, amount}) => {
  const points = useRef<THREE.Points>(null);
  const sprite = useMemo(() => createRadialSprite(3.2), []);
  const N = 900;

  const seeds = useMemo(() => {
    const arr = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      arr[i * 3] = (rand(i * 5 + 1) * 2 - 1) * 9;
      arr[i * 3 + 1] = rand(i * 5 + 2) * 4.5;
      arr[i * 3 + 2] = (rand(i * 5 + 3) * 2 - 1) * 9;
    }
    return arr;
  }, []);

  const positions = useMemo(() => new Float32Array(N * 3), []);

  for (let i = 0; i < N; i++) {
    const t = frame / 90;
    positions[i * 3] = seeds[i * 3] + noise1D(t + i * 0.13, i) * 0.55;
    // Constant slow updraft, wrapped — dust in a still room always rises.
    positions[i * 3 + 1] = ((seeds[i * 3 + 1] + frame * 0.0028 + i * 0.001) % 4.5) + 0.1;
    positions[i * 3 + 2] = seeds[i * 3 + 2] + noise1D(t + i * 0.17, i + 999) * 0.55;
  }

  const geometry = points.current?.geometry;
  if (geometry) {
    (geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
  }

  if (amount <= 0.001) return null;

  return (
    <points ref={points} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={sprite}
        color="#ffffff"
        size={0.021}
        sizeAttenuation
        transparent
        opacity={amount * 0.28}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
};
