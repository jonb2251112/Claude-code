/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE PRODUCT
 * ─────────────────────────────────────────────────────────────────────────────
 * A procedural stand-in built from ONE outline — a continuous-curvature rounded
 * square — extruded at four different scales and depths:
 *
 *      ┌───────────────┐  glass        (deep blue-black, clearcoat)
 *      │ ░░░░░░░░░░░░░ │  display      (custom GLSL panel)
 *      ├───────────────┤  chassis      (machined aluminium, chamfered)
 *      └───────────────┘  core         (dark internals, only seen exploded)
 *          ───────        seam         (hairline accent light around the edge)
 *
 * The whole assembly hovers ~6 cm off the floor with a slow bob. Hovering is a
 * deliberate choice: it removes the contact point, so the only thing grounding
 * the object is a soft shadow — which is precisely the look of a product shot
 * on infinite white with a floating rig.
 *
 * ── Swapping in a real model ──────────────────────────────────────────────
 * Set PRODUCT.model.type = 'gltf' in src/config/product.ts. See <GltfProduct>
 * at the bottom of this file.
 */

import React, {Suspense, useMemo} from 'react';
import * as THREE from 'three';
import {useGLTF} from '@react-three/drei';
import {continueRender, delayRender, staticFile} from 'remotion';
import {PRODUCT} from '../config/product';
import {COLORS_3D} from '../config/theme';
import {makeFaceGeometry, makeSlabGeometry} from '../lib/geometry';
import {createBrushedRoughness} from '../lib/textures';
import type {StageState} from './grade';
import {DisplaySurface} from './DisplaySurface';

const {size, cornerRadius, thickness, bevel} = PRODUCT.dimensions;

/** Resting height above the floor plane. Shared with the camera rig. */
export const HOVER_HEIGHT = PRODUCT.dimensions.hover;

export const Product: React.FC<{frame: number; stage: StageState}> = ({frame, stage}) => {
  const {explode, ignite, seam, env} = stage;

  /* ── Geometry ───────────────────────────────────────────────────────────
   * Built once and shared. `curveSegments` is high (28) because the corner is
   * the single most scrutinised part of a product shot — any faceting on that
   * curve is immediately legible as "cheap CG". */
  const geo = useMemo(() => {
    const chassis = makeSlabGeometry(size, cornerRadius, thickness, bevel, 28);
    const glass = makeSlabGeometry(size - 0.16, cornerRadius - 0.08, 0.055, 0.012, 28);
    const core = makeSlabGeometry(size - 0.44, cornerRadius - 0.22, 0.15, 0.02, 24);
    const display = makeFaceGeometry(size - 0.3, cornerRadius - 0.15, 28);
    // The light seam is a razor-thin slab a hair wider than the chassis; seen
    // edge-on it's a 3-pixel accent line running the full perimeter.
    const seamGeo = makeSlabGeometry(size + 0.004, cornerRadius, 0.011, 0, 28);
    return {chassis, glass, core, display, seamGeo};
  }, []);

  const roughnessMap = useMemo(() => createBrushedRoughness(), []);

  /* ── Layer offsets ──────────────────────────────────────────────────────
   * The chassis is the anchor and never moves; everything else separates
   * around it. Different travel distances per layer (0.62 / 0.42 / -0.52)
   * create parallax within the explode, so it reads as depth rather than as
   * a single object being pulled apart. */
  const yGlass = 0.132 + 0.62 * explode;
  const yDisplay = 0.116 + 0.42 * explode;
  const yCore = -0.02 - 0.52 * explode;
  const ySeam = 0.074 + 0.05 * explode;

  /* Slow rotation + bob. The rotation is only 0.02 rad/s — far too slow to
   * register as "spinning", but fast enough that the specular highlights are
   * always crawling, which is what keeps metal alive between camera moves. */
  const spin = 0.2 + frame * 0.00042;
  const bob = Math.sin(frame / 52) * 0.018;

  if (PRODUCT.model.type === 'gltf') {
    return (
      <group position={[0, HOVER_HEIGHT + bob, 0]} rotation={[0, spin, 0]}>
        <Suspense fallback={null}>
          <GltfProduct envIntensity={env} />
        </Suspense>
      </group>
    );
  }

  return (
    <group position={[0, HOVER_HEIGHT + bob, 0]} rotation={[0, spin, 0]}>
      {/* ── Aluminium chassis ──────────────────────────────────────────────
        * metalness 1 / roughness 0.17 is the sweet spot for anodised aluminium:
        * rough enough that the softbox reflections have soft edges, tight
        * enough that the chamfer still throws a hard specular line.
        * The roughness map varies that by only ±0.04 — invisible as a texture,
        * essential as a break-up of the otherwise perfect reflection.
        *
        * metalness is 0.88 rather than a physically "correct" 1.0. At exactly 1
        * the material has no diffuse term at all, so on a dark set the body
        * goes black except where a softbox happens to reflect — technically
        * right, and it reads as black glass rather than as aluminium. Holding
        * back 12% gives the anodised finish a faint diffuse floor, which is
        * what makes it legible as metal. */}
      <mesh geometry={geo.chassis} castShadow receiveShadow>
        <meshStandardMaterial
          color={COLORS_3D.bodyMetal}
          metalness={0.88}
          roughness={0.24}
          roughnessMap={roughnessMap}
          envMapIntensity={env * 1.5}
        />
      </mesh>

      {/* ── Internal core ── only ever seen during the exploded beat. */}
      <mesh
        geometry={geo.core}
        position={[0, yCore, 0]}
        rotation={[0, -0.05 * explode, 0]}
        castShadow
      >
        <meshStandardMaterial
          color={COLORS_3D.chassis}
          metalness={0.85}
          roughness={0.42}
          envMapIntensity={env * 0.9}
        />
      </mesh>

      {/* ── Display ── custom GLSL panel, sits under the glass. */}
      <DisplaySurface
        geometry={geo.display}
        half={(size - 0.3) / 2}
        ignite={ignite}
        accent={COLORS_3D.accent}
        frame={frame}
        position={[0, yDisplay, 0]}
      />

      {/* ── Glass ──────────────────────────────────────────────────────────
        * Not `transmission` — a transmissive material would refract the
        * *backdrop*, which is empty black, so you'd pay a full extra render
        * pass for nothing. A clearcoat over a near-black base gives the same
        * read: a single mirror-sharp reflection layer floating over depth. */}
      <mesh
        geometry={geo.glass}
        position={[0, yGlass, 0]}
        rotation={[0, 0.03 * explode, 0]}
        castShadow
      >
        <meshPhysicalMaterial
          color={COLORS_3D.glass}
          metalness={0.15}
          roughness={0.055}
          clearcoat={1}
          clearcoatRoughness={0.02}
          reflectivity={0.9}
          envMapIntensity={env * 1.15}
        />
      </mesh>

      {/* ── Light seam ─────────────────────────────────────────────────────
        * toneMapped={false} keeps it above 1.0 in linear space so the bloom
        * pass treats it as an actual light source rather than a bright surface. */}
      <mesh geometry={geo.seamGeo} position={[0, ySeam, 0]}>
        <meshBasicMaterial
          color={COLORS_3D.accent}
          toneMapped={false}
          transparent
          opacity={Math.min(1, seam) * 0.62}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};

/**
 * ── GLTF branch ───────────────────────────────────────────────────────────
 * Drop your .glb into `public/models/`, point PRODUCT.model.path at it, and
 * switch `type` to 'gltf'.
 *
 * The delayRender()/continueRender() pair is the important bit: it tells
 * Remotion "do not screenshot this frame yet". Without it the first frames of
 * a render can be captured before the model has finished parsing, which shows
 * up as a few blank frames at the head of the file.
 */
const GltfProduct: React.FC<{envIntensity: number}> = ({envIntensity}) => {
  const [handle] = React.useState(() => delayRender('Loading product model'));
  const {scene} = useGLTF(staticFile(PRODUCT.model.path));

  const cloned = useMemo(() => {
    const copy = scene.clone(true);
    copy.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat && 'envMapIntensity' in mat) mat.envMapIntensity = envIntensity;
    });
    return copy;
  }, [scene, envIntensity]);

  React.useEffect(() => {
    continueRender(handle);
  }, [handle, cloned]);

  return (
    <primitive
      object={cloned}
      scale={PRODUCT.model.scale}
      position={PRODUCT.model.offset as unknown as [number, number, number]}
    />
  );
};
