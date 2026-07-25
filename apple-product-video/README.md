# AURA — a 40-second Apple-style product film

A complete, self-contained cinematic product advertisement. 100% code-driven:
no After Effects project, no HDRI downloads, no 3D model files, no audio
samples. Clone it and it renders.

Built with **Remotion** (React + TypeScript) for the edit, timing and
typography, and **React Three Fiber / three.js** for a single continuous 3D
scene that runs for the whole film.

```
0:00 ─ 0:04   Cold open      particles resolve into the product's silhouette
0:04 ─ 0:12   Hero reveal    68° orbit + crane down, light sweep, wordmark
0:12 ─ 0:22   Features       three beats: material · architecture · presence
0:22 ─ 0:32   Lifestyle      one uninterrupted 10-second move, one sentence
0:32 ─ 0:40   Lockup         logo draws itself, statement, fade to black
```

---

## Quick start

```bash
cd apple-product-video
npm install          # also synthesises the placeholder audio stems
npm start            # opens Remotion Studio at http://localhost:3000
```

Scrub the timeline, edit any file, and the preview updates live.

### Rendering

```bash
# 1080p master (the usual one)
npx remotion render AuraFilm out/aura-1080p.mp4

# 4K master
npx remotion render AuraFilm4K out/aura-4k.mp4

# 9:16 social cutdown
npx remotion render AuraFilmVertical out/aura-vertical.mp4

# 4K poster frame (key art)
npx remotion still AuraPoster out/poster.png

# ProRes 4444 master for grading / an NLE
npx remotion render AuraFilm out/master.mov --codec=prores --prores-profile=4444
```

Shorthands are wired up as `npm run build`, `npm run build:4k` and
`npm run still`.

### Rendering on a machine without a GPU

three.js needs a real GL implementation in headless Chrome. `remotion.config.ts`
defaults to `angle`, which is right on macOS and on any machine with a GPU. On
a headless Linux box or in CI, use software rendering:

```bash
npx remotion render AuraFilm out/aura.mp4 --gl=swangle --concurrency=2
```

Expect roughly 3–10 seconds per frame under SwiftShader versus a fraction of a
second on a GPU. If you are rendering headlessly and hit a Chrome download
error, point Remotion at a browser you already have:

```bash
npx remotion render AuraFilm out/aura.mp4 --gl=swangle \
  --browser-executable=/path/to/chrome
```

### Requirements

Node 18+. Everything else installs from npm. Verified on Node 22 with
Remotion 4.0.499, three 0.180, React 19.

---

## Project structure

```
src/
├── index.ts                 registerRoot
├── Root.tsx                 compositions (1080p · 4K · vertical · still)
├── Film.tsx                 composite root: 3D layer + type layer + post layer
│
├── config/                  ← the three files you actually edit
│   ├── product.ts           name, tagline, feature copy, dimensions, model path
│   ├── theme.ts             colours, type scale, easing curves, look toggles
│   └── timeline.ts          the edit: every cut point, in one place
│
├── three/
│   ├── Stage.tsx            the canvas, lights, floor, camera rig
│   ├── cameraTimeline.ts    the shot list (polar keyframes per shot)
│   ├── grade.ts             lighting + product state as a function of frame
│   ├── Product.tsx          the procedural product (+ the GLTF branch)
│   ├── DisplaySurface.tsx   custom GLSL panel
│   ├── Backdrop.tsx         gradient cyclorama
│   ├── Particles.tsx        cold-open convergence + ambient dust
│   └── Effects.tsx          bloom + chromatic aberration
│
├── scenes/                  one file per act, typography only
│   ├── ColdOpen.tsx  HeroReveal.tsx  Features.tsx  Lifestyle.tsx  LogoLockup.tsx
│
├── components/
│   ├── Type.tsx             the one text animation, used everywhere
│   ├── DesignFrame.tsx      1920×1080 design canvas → any resolution
│   └── AudioBed.tsx         the mix
│
├── overlays/Post.tsx        grain · vignette · cut flares · grade · fade
└── lib/                     anim helpers, procedural textures, geometry
```

---

## How it works

### One scene, seven shots

The 3D scene is mounted once and lives for all 1200 frames. It never unmounts,
the lights never reset, and the product never reloads. What changes is a single
state object (`three/grade.ts`) that every element reads from, plus the camera.

That is what makes the transitions work. At a cut, only the camera jumps — the
light, the reflections and the object carry through, so the eye reads five
setups as one continuous space rather than as five videos edited together.

Camera moves are authored in **polar coordinates** (angle, radius, height)
relative to the product, not in XYZ. Interpolating XYZ between two points on a
circle gives you a straight chord: the camera visibly cuts across the arc and
the move feels like a slide. Interpolating the angle gives a true orbit. Every
shot also pushes or pulls while it orbits — a pure orbit reads as a turntable
render, an orbit plus a push reads as a crane.

Where one shot's end key equals the next shot's start key, the join is
invisible (shots 5 → 6 share one uninterrupted 14-second arc). Everywhere else
the discontinuity is a deliberate hard cut.

### Cuts are masked with light

Each hard cut fires an anamorphic flare from `overlays/Post.tsx`: a hot core, a
horizontal streak, and a 4-frame full-frame lift, over 11 frames total. The eye
will accept an enormous jump in framing if it happens *behind* a burst of
light. The audio whooshes fire 4 frames early — sound leading picture by ~130 ms
is standard practice, and the cut lands harder for it.

### Lighting: the environment does the work

On a metal product roughly 90% of what you see is reflection, not shading. So
the important asset is not the light rig, it is the shape of the reflections —
big, soft, rectangular softboxes with clean edges gliding over the surface.

`lib/textures.ts` paints a virtual photography studio (key octabox, rim strip,
fill panel, kicker, floor bounce) into an equirectangular canvas at runtime.
three.js PMREM-filters it automatically, so one texture drives physically
plausible roughness-aware reflections on the aluminium, the glass and the floor
at once — with no HDRI file to download.

The **light sweep** in the hero reveal is `scene.environmentRotation` animating,
not a light moving. Rotating the environment keeps every reflective surface
consistent with every other one for free.

### Easing

`config/theme.ts` is the most important file in the project. Apple motion almost
never uses a symmetric ease-in-out; it uses curves with a confident start and a
very long decelerating settle — the object arrives, then keeps arriving for
another 400 ms.

```ts
cinematic: bezier(0.16, 1,    0.3,  1)   // the house curve, near-expo-out
settle:    bezier(0.22, 1,    0.28, 1)   // type
glide:     bezier(0.62, 0.02, 0.2,  1)   // continuous camera arcs
drift:     bezier(0.42, 0,    0.24, 1)   // the 10-second lifestyle move
exit:      bezier(0.7,  0,    0.84, 0)   // accelerating — fades to black
```

### Typography

There is exactly one text animation, used everywhere: opacity, a small
translateY (14–22px, never more), a blur that resolves, and a **letter-spacing
settle** from ~0.18em wider to the designed tracking.

The last one is the signature move. Because the word's *width* is animating,
the eye reads it as arriving from depth. At 3–4× this amplitude it looks cheap;
at 0.18em it just looks expensive. Everything rides `EASE.settle`, which has no
overshoot at all — type that bounces reads as a template.

Inter is bundled locally via `@fontsource`, so renders need no network and are
reproducible offline.

### Determinism

Every animated value is a pure function of `frame`. No velocity integration, no
`useFrame` deltas, no `Math.random()` anywhere — the seeded PRNG in
`lib/anim.ts` is used even for canvas textures, because Remotion renders frames
across several parallel browser instances and an unseeded texture would differ
between them, producing a flickering surface in the final file.

The practical upshot: scrub to any frame in the Studio and you are looking at
exactly what will be rendered.

---

## Making it yours

### Change the copy

Everything is in **`src/config/product.ts`** — brand, product name, tagline,
three feature blocks, the lifestyle line, the closing statement. Nothing is
duplicated anywhere else.

### Change the colour theme

**`src/config/theme.ts`**. The palette is deliberately tiny: three neutrals, two
metals, one accent. Change `COLORS.accent` and the light seam, the display
shader, the cut flares, the environment tint and the feature ticks all follow.

For a warmer, gold-metal product: set `COLORS_3D.bodyMetal` to `#d8c4a0` and
`COLORS.accent` to `#e8b96a`. For white-on-white ("Apple Store" mode), raise
`COLORS_3D.backdropHorizon` and `floor` and drop `LOOK.exposure` to ~0.85.

### Swap in a real 3D model

1. Put your `.glb` in `public/models/product.glb`
2. In `src/config/product.ts`, set `model.type` to `'gltf'`
3. Tune `model.scale` and `model.offset` so the object sits at the origin

`src/three/Product.tsx` already contains the `<GltfProduct>` branch, including
the `delayRender()`/`continueRender()` pair that stops Remotion screenshotting
a frame before the model has parsed. You will want to revisit
`dimensions.hover`, `dimensions.size` and the exploded-view offsets to match
your geometry.

### Retime the film

**`src/config/timeline.ts`** holds every cut point, expressed in seconds via the
`s()` helper. Change `SECONDS` and the scene boundaries, and the camera, the
grade, the type and the audio all retime together — they all derive from these
same constants. Changing `FPS` to 24 or 60 works the same way.

### Trade render time for polish

**`src/config/theme.ts` → `LOOK`**

| Toggle | Cost | Effect |
|---|---|---|
| `postProcessing` | moderate | bloom + chromatic aberration |
| `reflectiveFloor` | high — one extra scene render per frame | the product's reflection under it |
| `filmGrain` | ~free | animated grain over picture *and* type |
| `letterbox` | free | 2.39:1 cinema bars (off — Apple ads run full-frame) |
| `exposure` | free | global density of the whole image |

---

## Sound

`scripts/generate-audio.mjs` **synthesises** four stems from pure maths — a
42-second pad, a riser, a whoosh and a struck bell — so the repo carries no
binary assets and the project makes sound the moment you clone it. It runs
automatically on `npm install`, or on demand with `npm run audio`.

They are placeholders with the right *shape*, not finished sound design. The
structure in `src/components/AudioBed.tsx` is the part worth keeping: the bed
ducks under each cut, the riser resolves on the picture cut at 4s, a whoosh
fires 4 frames ahead of every hard cut, and a bell lands as the logo mark
completes. Drop real stems into `public/audio/` with the same filenames and the
mix still works.

If you are cutting to music with a fixed tempo, set the cut points in
`config/timeline.ts` to land on the beat — every camera move and every text
entrance will follow automatically.

Set `PRODUCT.audio.enabled = false` for a silent master.

---

## Recommended next steps

Roughly in order of impact:

1. **Real depth of field.** The macro beat at 12–15s is the one shot that would
   gain most from actual bokeh. Add `DepthOfField` from
   `@react-three/postprocessing` in `three/Effects.tsx`, driven by a
   `focusDistance` keyed off the camera's distance to the product. It is
   expensive; consider enabling it only for `FEATURE_BEATS[0]`.
2. **A second accent state.** Right now the product's light seam is one colour
   for the whole film. Having it shift hue once — on the "it knows when the room
   changes" beat — would pay off the copy.
3. **Real sound design.** The single biggest perceived-quality jump available.
   The placeholders are structurally correct; a composer working to the existing
   cut points would transform the piece.
4. **A vertical master, properly.** `AuraFilmVertical` currently crops the 16:9
   framing. A real 9:16 cut wants its own keys in `cameraTimeline.ts` —
   tighter radii, higher targets — selected on composition width.
5. **Longer cut.** At 60 seconds, add a fourth feature beat and extend the
   lifestyle act rather than slowing anything down; the current pacing is
   already at the slow end.
6. **Colour variants.** Render the same film three times with different
   `COLORS_3D.bodyMetal` values for a "available in three finishes" end card.
7. **Motion blur.** Remotion has no native shutter simulation. For the fastest
   move (the exploded separation), rendering at 60fps and conforming to 30 in an
   NLE with frame blending gets most of the way there.

---

## Licence

MIT. The product, brand and copy are fictional.
