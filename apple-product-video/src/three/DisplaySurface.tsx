/**
 * The product's display: a custom GLSL surface sitting just under the glass.
 *
 * Why a shader and not an emissive texture? Because the interesting part is the
 * *gradient*: a real OLED panel showing an abstract wallpaper has a hot centre
 * that falls off into near-black at the bezel, plus slow low-frequency motion.
 * That's four lines of GLSL and it composites correctly with the bloom pass —
 * a texture would need to be re-authored for every accent-colour change.
 */

import React, {useMemo, useRef} from 'react';
import * as THREE from 'three';

const vertexShader = /* glsl */ `
  varying vec2 vPos;
  void main() {
    // The geometry is a flat rounded square lying in XZ, so we build UVs from
    // object space directly — no UV unwrap needed.
    vPos = vec2(position.x, position.z);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uIgnite;
  uniform float uHalf;
  uniform vec3  uAccent;
  varying vec2 vPos;

  void main() {
    vec2 p = vPos / uHalf;              // -1 … 1 across the panel
    float r = length(p);                // euclidean, for the radial core

    // Squircle distance field — matches the physical outline of the product,
    // so the panel fades into its own bezel instead of into a circle.
    float d = pow(pow(abs(p.x), 4.0) + pow(abs(p.y), 4.0), 0.25);

    // Base: near-black with a breath of accent lifted into the centre.
    vec3 col = mix(vec3(0.002, 0.003, 0.008), uAccent * 0.14, smoothstep(1.3, 0.0, r));

    // Two slow, non-repeating interference bands. Low frequency on purpose:
    // anything faster reads as a screensaver rather than as ambient light.
    float band = sin(p.x * 2.1 + uTime * 0.34) * cos(p.y * 1.6 - uTime * 0.21);
    col += uAccent * (0.055 + 0.045 * band) * smoothstep(1.05, 0.05, r);

    // Hot core. Cubed falloff keeps it tight enough for bloom to grab.
    col += uAccent * 0.55 * pow(smoothstep(0.95, 0.0, r), 3.0);

    // Fade out under the bezel.
    col *= smoothstep(1.0, 0.72, d);
    col *= uIgnite;

    gl_FragColor = vec4(col, 1.0);

    // Route the custom output through the renderer's ACES tone-mapping and
    // output colour-space conversion, so it grades identically to every
    // physically-based material in the scene.
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export const DisplaySurface: React.FC<{
  geometry: THREE.BufferGeometry;
  half: number;
  ignite: number;
  accent: string;
  frame: number;
  position: [number, number, number];
}> = ({geometry, half, ignite, accent, frame, position}) => {
  const material = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: {value: 0},
      uIgnite: {value: 0},
      uHalf: {value: half},
      uAccent: {value: new THREE.Color(accent)},
    }),
    [half, accent],
  );

  // Driven from the Remotion frame, never from a wall-clock delta — this is the
  // rule that makes the render deterministic and scrubbable in the Studio.
  uniforms.uTime.value = frame / 30;
  uniforms.uIgnite.value = ignite;

  return (
    <mesh geometry={geometry} position={position}>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  );
};
