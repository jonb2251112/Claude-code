/**
 * ─────────────────────────────────────────────────────────────────────────────
 * PROCEDURAL TEXTURES
 * ─────────────────────────────────────────────────────────────────────────────
 * Every texture in the film is drawn with Canvas2D at runtime. No HDRI files,
 * no network fetches, no binary assets — the project clones and renders.
 *
 * The important one is `createStudioEnvironment()`. What actually makes a
 * product shot look like a $2M commercial is not the lighting *rig*, it's the
 * shape of the reflections: big, soft, rectangular softboxes with clean edges
 * gliding across the metal. So we paint a virtual photography studio into an
 * equirectangular map and let three.js do the rest.
 */

import * as THREE from 'three';
import {rand} from './anim';

const makeCanvas = (w: number, h: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
};

/**
 * Draws a soft-edged rectangle — our stand-in for a physical softbox.
 *
 * The falloff is what sells it: a hard rect reads as CGI, a gaussian blob reads
 * as fog. We want a rect with a feathered edge, on BOTH axes.
 *
 * Getting the second axis right matters more than it sounds. Feathering only
 * vertically and approximating the horizontal edge with a series of alpha
 * steps leaves quantisation in the gradient, and while that is invisible in
 * the environment map itself, a chamfer reflecting it at a grazing angle
 * stretches those steps into clearly visible bands of light along the edge.
 * So: draw the box on its own canvas and mask it with a real gradient.
 */
const softBox = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  intensity: number,
  feather = 0.35,
) => {
  const box = makeCanvas(Math.ceil(w), Math.ceil(h));
  const bctx = box.getContext('2d')!;

  const vertical = bctx.createLinearGradient(0, 0, 0, h);
  vertical.addColorStop(0, 'rgba(255,255,255,0)');
  vertical.addColorStop(feather * 0.5, `rgba(255,255,255,${intensity})`);
  vertical.addColorStop(1 - feather * 0.5, `rgba(255,255,255,${intensity})`);
  vertical.addColorStop(1, 'rgba(255,255,255,0)');
  bctx.fillStyle = vertical;
  bctx.fillRect(0, 0, w, h);

  // Horizontal feather applied as an alpha mask over the vertical gradient.
  const horizontal = bctx.createLinearGradient(0, 0, w, 0);
  horizontal.addColorStop(0, 'rgba(0,0,0,0)');
  horizontal.addColorStop(feather * 0.5, 'rgba(0,0,0,1)');
  horizontal.addColorStop(1 - feather * 0.5, 'rgba(0,0,0,1)');
  horizontal.addColorStop(1, 'rgba(0,0,0,0)');
  bctx.globalCompositeOperation = 'destination-in';
  bctx.fillStyle = horizontal;
  bctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(box, x, y);
  ctx.restore();
};

/**
 * The virtual studio, as a 2048×1024 equirectangular map.
 *
 * Layout (u = 0 is behind camera-left, v = 0 is the zenith):
 *   · a large key softbox high and slightly left
 *   · a long strip light raking across from the right (this is the one that
 *     produces the signature horizontal streak on the chamfer)
 *   · a dim fill panel low-front to keep the shadow side from going dead
 *   · a graduated floor bounce
 *
 * three.js automatically PMREM-filters anything assigned to `scene.environment`,
 * so this single texture gives physically-plausible roughness-aware reflections
 * on the aluminium *and* the glass.
 */
export const createStudioEnvironment = (accent = '#6fa8ff'): THREE.Texture => {
  const W = 2048;
  const H = 1024;
  const canvas = makeCanvas(W, H);
  const ctx = canvas.getContext('2d')!;

  // Base: a dark vertical gradient. Zenith is not pure black — a totally black
  // ceiling makes metal look like it was shot in a void, which is the classic
  // amateur-3D tell.
  const base = ctx.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0.0, '#1a1f27');
  base.addColorStop(0.34, '#2b323d'); // broad ceiling bounce — this is what
  base.addColorStop(0.48, '#39414e'); // gives the aluminium its base value
  base.addColorStop(0.54, '#12151b'); // horizon: sharp drop into the floor
  base.addColorStop(0.72, '#06070a');
  base.addColorStop(1.0, '#010102');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);

  // KEY — big overhead softbox, upper-left quadrant. Large solid angle: this
  // is a 2m octabox two metres from the subject, not a point light.
  softBox(ctx, W * 0.06, H * 0.0, W * 0.4, H * 0.34, 1.0, 0.45);

  // RIM / STRIP — long thin light from behind-right. Produces the sweep.
  softBox(ctx, W * 0.56, H * 0.2, W * 0.34, H * 0.075, 1.0, 0.22);

  // FILL — wide, dim, front-low.
  softBox(ctx, W * 0.16, H * 0.4, W * 0.5, H * 0.14, 0.3, 0.6);

  // KICKER — small hard-ish source for a single sparkle on the corner.
  softBox(ctx, W * 0.02, H * 0.3, W * 0.05, H * 0.05, 0.8, 0.3);

  // A whisper of the accent colour bounced into the environment. This is why
  // the metal picks up a faint blue in the shadow roll-off instead of grey.
  const tint = ctx.createRadialGradient(W * 0.82, H * 0.5, 0, W * 0.82, H * 0.5, W * 0.3);
  tint.addColorStop(0, accent + '30');
  tint.addColorStop(1, accent + '00');
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
};

/**
 * Radial falloff sprite, used for every glow in the film: particle points,
 * lens-flare cores, the light pool on the floor.
 * `power` controls the falloff curve — higher = tighter, hotter core.
 */
export const createRadialSprite = (power = 2.2, color = '#ffffff'): THREE.Texture => {
  const S = 256;
  const canvas = makeCanvas(S, S);
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(S, S);
  const c = new THREE.Color(color);

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = (x + 0.5) / S - 0.5;
      const dy = (y + 0.5) / S - 0.5;
      const d = Math.min(1, Math.hypot(dx, dy) * 2);
      const a = Math.pow(1 - d, power);
      const i = (y * S + x) * 4;
      img.data[i] = c.r * 255;
      img.data[i + 1] = c.g * 255;
      img.data[i + 2] = c.b * 255;
      img.data[i + 3] = a * 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
};

/**
 * Fine anisotropic scratch pattern for the brushed-metal roughness map.
 * Extremely subtle (roughness varies by ~0.04) but it's the difference between
 * "chrome" and "machined aluminium" — real metal is never uniformly rough.
 */
export const createBrushedRoughness = (): THREE.Texture => {
  const W = 1024;
  const H = 1024;
  const canvas = makeCanvas(W, H);
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, W, H);

  // Concentric micro-turning marks (like a lathe-finished surface).
  // NOTE: seeded RNG, never Math.random() — Remotion renders frames across
  // several parallel browser instances, and an unseeded texture would differ
  // between them, producing a flickering surface in the final file.
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 900; i++) {
    const r = (i / 900) * W * 0.72 + rand(i * 3 + 1) * 3;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${0.012 + rand(i * 3 + 2) * 0.02})`;
    ctx.lineWidth = 0.6 + rand(i * 3 + 3);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.NoColorSpace; // data texture, not colour
  texture.needsUpdate = true;
  return texture;
};

/** Soft elliptical pool of light on the floor beneath the product. */
export const createLightPool = (): THREE.Texture => {
  const S = 512;
  const canvas = makeCanvas(S, S);
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.30)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.10)');
  g.addColorStop(0.7, 'rgba(255,255,255,0.02)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
};
