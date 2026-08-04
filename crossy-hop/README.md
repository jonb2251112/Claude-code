# CROSSY HOP

A voxel road-crossing game in 3D, built mobile-first. One chicken, endless
traffic, and an eagle with no patience.

Everything lives in a single [`index.html`](index.html). There are no images,
models, fonts or audio files: the cars, chicken, trees, logs and trains are
assembled from boxes and cylinders at load time, the sky, lane markings and
river ripples are painted into a `<canvas>`, and every sound is synthesised with
the Web Audio API. The only external dependency is three.js, pulled from a CDN
through an import map.

## Play

Open `index.html` over HTTP — an import map needs a real origin, so `file://`
will not do:

```bash
cd crossy-hop
python3 -m http.server 8000
# then visit http://localhost:8000/
```

### Controls

| Input | Action |
| --- | --- |
| Tap | Hop forward |
| Swipe up / down / left / right | Hop that way |
| Arrow pad (bottom right) | Same, for thumbs that prefer buttons |
| `W` `A` `S` `D`, arrow keys, `Space` | Hop |
| `P` or `Esc` | Pause |
| `M` | Mute |

Score is the number of rows you get through. Coins persist between runs, as does
your best score, the mute setting and whether the arrow pad is showing.

## Rules of the road

- **Roads** carry cars, lorries and buses. Lanes come in groups of one to four,
  and the generator guarantees a gap big enough to cross — it just gets meaner
  about how big as your score climbs.
- **Rivers** can only be crossed on a log or a lily pad. Logs carry you sideways
  while you stand on them; ride one too far and the river takes you.
- **Railways** blink and sound a warning before the express arrives. Trains are
  much faster than anything on the road.
- **Trees, boulders and bushes** simply refuse to be hopped into.
- **The eagle** comes for you if you stop making progress for about seven
  seconds, or if you drift too far back from your high-water mark. A red banner
  warns you first.

## How it is put together

The script is divided into numbered sections; the short version:

**Rendering budget.** Roughly 15–20 draw calls and about 17 K triangles for a
full screen. That comes from batching aggressively:

- Every static prop in the world — ground tiles, trees, boulders, sleepers,
  rails, signal posts, grass patches — is a tinted unit cube in a *single*
  `InstancedMesh`, coloured per instance. One draw call renders the terrain.
- Vehicles, logs, coins, the chicken and the eagle are each merged into one
  vertex-coloured `BufferGeometry` by a small `Vox` builder, so a car's body,
  glass, wheels, lights and bumper cost one draw call rather than ten. Traffic of
  the same variant shares an instanced pool.
- Lane dashes and the river surface are two instanced planes with scrolling
  textures.

**World generation.** Rows are planned in *sections* — a run of road lanes, a
river, a railway, a grassy breather — rather than row by row, so the terrain
reads as places instead of noise. A window of rows around the camera lives in a
`Map`; scenery is flattened into the instanced batches only when that window
scrolls, and traffic is recycled from the front of a lane to the back rather than
being allocated.

**Framing.** An orthographic camera, yawed 20° so blocks show two faces and
pitched 34° so rows read as the shallow bands a toy diorama would have. The
frustum is solved from whichever screen axis is tighter, so a 9:19.5 phone and a
16:10 laptop both get a sensible amount of road ahead. The player is biased low
on screen, and the world dissolves into fog that matches the painted sky, which
is what produces the band of sky and clouds at the top without ever showing the
end of the generated world.

**Mobile.** Portrait-first layout with `env(safe-area-inset-*)` respected
throughout, gestures that fire the moment they clear the swipe threshold rather
than on release, haptics on hops and deaths, and device tiering that drops
antialiasing and halves the shadow map on low-core touch hardware. Pausing on
`visibilitychange` keeps a backgrounded tab from eating battery.

## Tuning

Every knob worth turning is in the `CFG` block at the top of the script: hop
timing, vehicle and train speeds, the minimum crossing gap, the eagle's patience,
camera framing and fog distance. `window.HOP` exposes the state, the world, the
player and `HOP.move('up' | 'down' | 'left' | 'right')` for poking at a live game
from the console.
