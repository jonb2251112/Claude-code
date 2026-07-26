/**
 * The cyclorama — an infinite studio wall.
 *
 * A 60-unit inverted sphere with a three-stop vertical gradient. The stop that
 * matters is the horizon lift: a faint band exactly at eye level. Real infinity
 * coves always have one (it's the seamless curve catching bounce off the floor),
 * and its absence is the main reason "product on black" renders look like they
 * were made in a void rather than in a room.
 *
 * `fog={false}` because this IS the far distance — letting scene fog composite
 * over it would just flatten the gradient we drew.
 */

import React, {useMemo} from 'react';
import * as THREE from 'three';
import {COLORS_3D} from '../config/theme';

const vertexShader = /* glsl */ `
  varying float vY;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vY = world.y;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3  uHorizon;
  uniform vec3  uTop;
  uniform float uLift;
  uniform float uWarmth;
  uniform vec3  uWarmTint;
  varying float vY;

  void main() {
    // Height above/below the horizon, normalised over the sphere radius.
    float h = vY / 60.0;

    // Sky: falls off above the horizon.
    float sky = smoothstep(0.62, -0.06, h);
    // The lift band itself: a broad glow pinned to eye level. Wide on purpose —
    // a tight band draws a visible line across the frame, which is the one
    // thing an infinity cove must never do.
    float band = exp(-pow(h * 4.2, 2.0)) * 0.8;
    // Floor side: rolls off below, but gently, so the join with the floor plane
    // is a gradient rather than an edge.
    float below = smoothstep(0.04, -0.7, h);

    vec3 col = mix(uTop, uHorizon, sky) * uLift;
    col += uHorizon * band * uLift * 1.4;
    col *= 1.0 - below * 0.62;

    // Domestic warmth for the lifestyle act.
    col = mix(col, col * uWarmTint, uWarmth);

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export const Backdrop: React.FC<{lift: number; warmth: number}> = ({lift, warmth}) => {
  const uniforms = useMemo(
    () => ({
      uHorizon: {value: new THREE.Color(COLORS_3D.backdropHorizon)},
      uTop: {value: new THREE.Color(COLORS_3D.backdropTop)},
      uLift: {value: 0},
      uWarmth: {value: 0},
      uWarmTint: {value: new THREE.Color('#ffb27a')},
    }),
    [],
  );

  uniforms.uLift.value = lift;
  uniforms.uWarmth.value = warmth;

  return (
    <mesh scale={[1, 1, 1]}>
      <sphereGeometry args={[60, 96, 64]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        side={THREE.BackSide}
        fog={false}
        depthWrite={false}
      />
    </mesh>
  );
};
