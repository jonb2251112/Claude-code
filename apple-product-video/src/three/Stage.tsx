/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THE STAGE — one continuous 3D scene for the whole 40 seconds
 * ─────────────────────────────────────────────────────────────────────────────
 * Lighting philosophy, in order of importance:
 *
 *   1. ENVIRONMENT.  On a metal product, ~90% of what you see is reflection,
 *      not diffuse shading. The procedural studio map (lib/textures.ts) is
 *      doing the heavy lifting; the discrete lights below are refinement.
 *   2. RIM.  Separates the object from the background. In the cold open it is
 *      the *only* light, which is what produces the silhouette.
 *   3. KEY.  A single hard-ish source, high and camera-left, for the chamfer
 *      specular and the cast shadow.
 *   4. FILL.  Never above 20% of key. Its only job is stopping the shadow side
 *      from going to absolute black.
 *
 * All four are animated by `getStageState()` — see three/grade.ts.
 */

import React, {useMemo} from 'react';
import * as THREE from 'three';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import {ContactShadows, MeshReflectorMaterial} from '@react-three/drei';
import {COLORS_3D, LOOK} from '../config/theme';
import {rad} from '../lib/anim';
import {createLightPool, createStudioEnvironment} from '../lib/textures';
import {getCameraState} from './cameraTimeline';
import {getStageState, type StageState} from './grade';
import {Backdrop} from './Backdrop';
import {Effects} from './Effects';
import {DustMotes, FormingParticles} from './Particles';
import {Product} from './Product';

/** Cool studio white ⇄ warm domestic tungsten. */
const COOL = new THREE.Color('#dfe8ff');
const WARM = new THREE.Color('#ffcfa4');
const tint = (warmth: number) => COOL.clone().lerp(WARM, warmth);

/* ── Camera ────────────────────────────────────────────────────────────────
 * Driven imperatively rather than declaratively: we own the transform outright
 * each frame, which sidesteps every interpolation r3f might otherwise apply and
 * guarantees frame N looks the same whether you scrubbed to it or rendered to it.
 */
const CameraRig: React.FC<{frame: number}> = ({frame}) => {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const {position, target, fov, roll} = getCameraState(frame);

  camera.position.set(position[0], position[1], position[2]);
  camera.up.set(0, 1, 0);
  camera.lookAt(target[0], target[1], target[2]);
  // Dutch roll is applied *after* lookAt, around the camera's own view axis.
  camera.rotateZ(rad(roll));

  if (camera.fov !== fov) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }

  return null;
};

/* ── Environment + atmosphere ──────────────────────────────────────────────
 * `scene.environmentRotation` is the light sweep. Rotating the environment
 * rather than moving a light keeps every reflective surface — metal, glass,
 * floor — physically consistent with one another for free.
 */
const Atmosphere: React.FC<{stage: StageState}> = ({stage}) => {
  const scene = useThree((state) => state.scene);
  const gl = useThree((state) => state.gl);
  const envMap = useMemo(() => createStudioEnvironment(COLORS_3D.accent), []);

  scene.environment = envMap;
  scene.environmentIntensity = 1; // per-material envMapIntensity does the grading
  scene.environmentRotation = new THREE.Euler(0, stage.envRotation, 0);

  const fogColor = tint(stage.warmth).multiplyScalar(0.045);
  scene.fog = new THREE.FogExp2(fogColor.getHex(), stage.fog);

  // ACES + exposure. Printing the exposure down to 0 is what performs the
  // fade-to-black on the 3D layer at the end of the film.
  gl.toneMapping = THREE.ACESFilmicToneMapping;
  gl.toneMappingExposure = stage.exposure * LOOK.exposure;

  return null;
};

const Lights: React.FC<{stage: StageState}> = ({stage}) => {
  const warm = tint(stage.warmth);

  return (
    <>
      {/* KEY — high, camera-left. Shadow camera is deliberately tight (±5) so
        * a 2048 map lands ~200 texels per world unit under the product. */}
      <directionalLight
        position={[-6.5, 9, 4.5]}
        intensity={stage.key * 2.6}
        color={warm}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-camera-near={0.5}
        shadow-camera-far={26}
        shadow-bias={-0.0006}
        shadow-normalBias={0.02}
      />

      {/* FILL — opposite side, no shadow, deliberately weak. */}
      <directionalLight position={[7, 3.2, 6]} intensity={stage.fill * 1.4} color={warm} />

      {/* RIM — behind and slightly above. Carries the entire cold open. */}
      <directionalLight
        position={[2.5, 3.4, -9]}
        intensity={stage.rim * 2.2}
        color={stage.warmth > 0.5 ? warm : '#cfe0ff'}
      />

      {/* A whisper of hemisphere so the underside never reads as a void. */}
      <hemisphereLight args={['#22262e', '#000000', 0.18 + stage.fill * 0.3]} />
    </>
  );
};

/* ── Floor ─────────────────────────────────────────────────────────────────
 * A polished near-black surface — the "product on wet slate" look.
 *
 * The instinct with MeshReflectorMaterial is to blur the reflection heavily,
 * which is wrong here on two counts. A blurred reflection needs a large kernel
 * over a low-resolution buffer, and the artefacts of that are clearly visible
 * as soft blocking across an otherwise perfectly smooth dark gradient. And
 * physically, a *blurred* reflection means a rough floor, and a rough floor
 * lit by a bright environment goes milky grey — which destroys the black point
 * that the whole film depends on.
 *
 * So: a sharp mirror (blur 0) at 1024², on a base colour of near-black, with
 * the environment contribution turned almost off. The reflection is dark
 * because the scene is dark, which is exactly right.
 *
 * Toggle in config/theme.ts → LOOK.reflectiveFloor. It costs one extra render
 * of the scene per frame.
 */
const Floor: React.FC<{stage: StageState}> = ({stage}) => {
  const pool = useMemo(() => createLightPool(), []);
  const warm = tint(stage.warmth);

  return (
    <group>
      {/* 240 units across. Far bigger than anything the camera can frame, so
        * the plane's own edge never appears on the horizon — the floor simply
        * fades into fog, which is what an infinity cove does. */}
      {/* receiveShadow is deliberately OFF. The directional key's shadow camera
        * covers a ±5 unit box, and on a plane this large the boundary of that
        * box is plainly visible as a faint quadrilateral edge across the floor
        * — shadowed inside, unshadowed outside. Widening the frustum would fix
        * the seam at the cost of shadow-map resolution where it actually
        * matters. <ContactShadows> below already grounds the product far more
        * convincingly than a hard directional shadow would, so the floor simply
        * opts out. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[240, 240]} />
        {LOOK.reflectiveFloor ? (
          <MeshReflectorMaterial
            resolution={1024}
            blur={[0, 0]}
            mixBlur={0}
            mixStrength={0.9}
            mirror={0.78}
            depthScale={0}
            color={COLORS_3D.floor}
            metalness={0.12}
            roughness={0.34}
            envMapIntensity={stage.env * 0.03}
          />
        ) : (
          <meshStandardMaterial
            color={COLORS_3D.floor}
            metalness={0.35}
            roughness={0.22}
            envMapIntensity={stage.env * 0.12}
          />
        )}
      </mesh>

      {/* The pool of key light hitting the floor. Additive, so it lifts the
        * floor without lifting its black point. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.35, 0.004, 0.2]}>
        <planeGeometry args={[11, 11]} />
        <meshBasicMaterial
          map={pool}
          color={warm}
          transparent
          opacity={0.03 + stage.key * 0.055}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Soft grounding shadow. Because the product hovers, this is the only
        * thing telling you where the floor is — worth the render cost. */}
      <ContactShadows
        position={[0, 0.006, 0]}
        // Scale 14 rather than 10: the shadow plane's own border is faintly
        // visible where it crosses frame, so it is sized to sit outside the
        // camera's view of the floor in every shot.
        scale={14}
        far={2.4}
        blur={3.4}
        opacity={0.42 + stage.key * 0.34}
        resolution={1024}
        color="#000000"
        frames={Infinity}
      />
    </group>
  );
};

const SceneContent: React.FC<{frame: number}> = ({frame}) => {
  const stage = getStageState(frame);

  return (
    <>
      <Atmosphere stage={stage} />
      <CameraRig frame={frame} />
      <Lights stage={stage} />
      <Backdrop lift={stage.backdropLift} warmth={stage.warmth} />
      <Floor stage={stage} />
      <Product frame={frame} stage={stage} />
      <FormingParticles
        frame={frame}
        collapse={stage.particleCollapse}
        opacity={stage.particleOpacity}
      />
      <DustMotes frame={frame} amount={stage.dust} />
      {LOOK.postProcessing ? <Effects bloom={stage.bloom} /> : null}
    </>
  );
};

export const Stage: React.FC<{frame: number; width: number; height: number}> = ({
  frame,
  width,
  height,
}) => {
  return (
    <ThreeCanvas
      width={width}
      height={height}
      shadows="soft"
      dpr={1}
      camera={{fov: 30, near: 0.08, far: 200, position: [0, 1, 12]}}
      gl={{
        antialias: true,
        // Required so Remotion can reliably capture the WebGL surface.
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance',
      }}
      style={{position: 'absolute', top: 0, left: 0}}
    >
      <SceneContent frame={frame} />
    </ThreeCanvas>
  );
};
