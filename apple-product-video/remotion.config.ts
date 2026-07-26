/**
 * Remotion configuration. Applies to the Studio and to `npx remotion render`
 * (CLI flags always win over anything set here).
 */

import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);

/* ── Encoding ──────────────────────────────────────────────────────────────
 * CRF 16 is visually lossless for this material and matters more here than in
 * most projects: the film is almost entirely smooth dark gradients, which is
 * precisely what H.264 bands. If you still see banding in the backdrop, drop to
 * 14, or render a ProRes master with:
 *     npx remotion render AuraFilm out/master.mov --codec=prores --prores-profile=4444
 */
Config.setCodec('h264');
Config.setCrf(16);
Config.setPixelFormat('yuv420p');

/* ── WebGL ─────────────────────────────────────────────────────────────────
 * three.js needs a real GL implementation in headless Chrome.
 *
 *   'angle'   — best on macOS and on Windows/Linux machines with a GPU.
 *   'swangle' — SwiftShader (software). Slower, but the correct choice on a
 *               headless Linux server or in CI where there is no GPU.
 *
 * Override per render without editing this file:
 *     npx remotion render AuraFilm out/aura.mp4 --gl=swangle
 */
Config.setChromiumOpenGlRenderer('angle');

/* Frames are rendered in parallel browser tabs. Each tab holds its own WebGL
 * context and its own copy of the scene, so this is memory-bound rather than
 * CPU-bound — 4 is a sane default, and lower is often faster at 4K. */
Config.setConcurrency(4);

/* The scene builds several canvas textures and a 512² reflection target on the
 * first frame; the default 30s timeout is enough on a GPU but not always under
 * SwiftShader. */
Config.setDelayRenderTimeoutInMilliseconds(120000);
