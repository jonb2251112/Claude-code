# NEON STRIKE — 3D Bowling

A mobile-first 3D bowling game with Cannon-es physics. Drag back to bowl, flick sideways to hook.

## Play

Open `index.html` in a modern browser (or serve the folder):

```bash
npx serve .
```

## Controls

- **Drag back** on the lane, then release to bowl
- **Longer / faster** pull = more power (ball lofts then lands)
- **Flick sideways** on release for spin — hooks on the dry backends
- **Stance** slider to shift your starting position
- Follow / Fixed camera toggle, mute, reset ball

## Physics highlights

- USBC-ish lane / pin / ball dimensions
- House-shot oil pattern (slick heads → dry backends)
- Skid → roll transition with live friction
- Spin hook that ramps with oil grip
- Soft loft at release
- Punchier first pocket hit + pin scatter
- Adaptive quality on low FPS / touch devices
- Haptics on supported phones

## Tuning

From the browser console:

```js
NEON.CFG.HOOK_ACCEL_MAX = 1.6
NEON.throwWith(0.85, 0.1, -0.7)  // power, aim, spin
```
