# CROSSY HOP

A voxel road-crossing game in 3D, built mobile-first. Twenty critters, a
fever ladder, journey track, lucky spins, pets, power-ups — and an eagle with
no patience.

Everything lives in a single [`index.html`](index.html). There are no images,
models, fonts or audio files: the cars, critters, trees, logs and trains are
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

Score is the number of rows you get through. Coins, characters, awards, lifetime
stats, your best score, the mute setting and whether the arrow pad is showing all
persist in `localStorage`.

## Things to chase

- **Characters.** Twenty critters (fox, owl, pig, sheep, raccoon, wolf, unicorn,
  alien joined the roster) built by one parameterised voxel function. Each
  retunes the hop blip; frog hops higher, ghost floats, robot beeps.
- **Prize machine.** 40 coins for a random critter you do not own, weighted by
  rarity, revealed with a sunburst and worn immediately. The character sheet
  shows portraits rendered off-screen from the real geometry, viewed from the
  front — the only place in the game you get to see a critter's face.
- **Awards.** Twenty-nine of them, tracking distance, coins, log rows, railways,
  near misses, streaks, hops, runs, the size of your collection, the number of
  distinct ways you have died, revives, every fever tier, daily challenges and
  login streaks. Each announces itself as it lands, and the score card dangles
  whichever one you are closest to.
- **Streaks.** Hops that land within 1.15 s of the last one chain; every tenth
  link pays a coin. The chip under the score turns red at ten.
- **Fever ladder.** Six heat levels climb with your streak:
  - **Warm Up** (5) — the chip catches fire
  - **Fever** (10) — ×2 coins, magnet pulls adjacent coins
  - **Super Fever** (18) — ×3, traffic eases, snappier hops
  - **Mega Fever** (28) — ×4, magnet range 2, coin rain
  - **Ultra Fever** (40) — ×5, deeper slow-mo, lucky free coins
  - **Overdrive** (55) — ×7, magnet 3, rainbow chaos
  Each upgrade flashes, rains confetti, and pays a heat bonus. Break the chain
  and the heat dies.
- **Second chance.** Die with at least 25 coins and the score card offers one
  revive per run. You keep your score, blink back onto safe grass with a short
  free pass, and hop on.
- **Daily challenges.** Three seeded goals every calendar day — reach a score,
  pocket coins, ride rivers, cross rails, survive near misses, catch a fever.
  Finish one for a coin payout and a badge. Open them from **Today** on the
  title screen or the score card.
- **Login streak.** Come back tomorrow and the daily gift grows (capped at 50).
  Miss a day and it resets.
- **Near misses.** A vehicle that passes within a whisker prints `close!` and
  counts towards an award.
- **Milestones and the record gate.** Every 25th row pays a coin (multiplied in
  fever), and your previous best is drawn across the world as a gold stripe with
  flags either side. Cross it and the run announces itself.
- **Daily gift.** A handful of coins the first time you play on a given day.


## Retention systems (the "one more hop" engine)

Soft-currency only — no real-money purchases. Everything spends coins you earn.

- **XP & levels.** Every hop, coin, perfect and run feeds a level curve. Level
  rewards pay coins, chests and titles up to 100.
- **Ranks & titles.** Best-score ranks from Hatchling to Immortal. Twenty-five
  titles to unlock and wear on the menu.
- **Journey Pass.** Dual FREE + VIP battle-pass tracks engineered for "one more
  claim": 4-day FOMO clock, jackpot dangles, near-miss star bar, claim-heat
  streaks, fake live loot feed, pulsing unclaimed counters, VIP chicken ticket,
  tier skips / star packs / 2× boosters. Soft currency only — no real money.
- **Lucky Spin.** One free ticket a day (or 30 coins). Jackpots, chests, banked
  shields/magnets, XP.
- **Power-ups.** Shield, Magnet, Turbo, Midas, Chill and Fury spawn on grass.
  Bank shields/magnets from the spin and arm them before a run.
- **Run events.** Golden Road, Coin Storm, Stampede, Quiet Town, Fever Spark,
  Treasure Row and more — they interrupt the grind with a new rule for a stretch.
- **Chests.** Bronze / silver / gold loot tables from levels, journey and spins.
- **Pets.** Hatch companions that occasionally find spare coins.
- **Weekly goals.** Three seeded goals that reset each week.
- **Shop trails.** Cosmetic hop trails bought with coins.
- **Rest bonus.** Come back after four hours for a welcome-back pouch.
- **Combo callouts, rhythm bonuses, near-miss style pay, milestone board.**

## Feel

Every hop is tuned to land with a little dopamine hit:

- **Land squash** and expanding **rings** underfoot, with a soft thump.
- **Perfect** hops (forward, tight on the last) flash mint, sparkle, and pay a
  bonus coin every fifth one.
- **Combo banner** grows in the centre of the screen as the streak climbs.
- **Coins fly** into the purse; the chip spins and the score punches.
- **Camera kick** on milestones, fever, near misses and revives — a brief zoom
  punch, not a shake.
- **Confetti and colour flashes** when fever ignites, awards unlock, challenges
  clear, or you take a second chance.

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
- Vehicles, logs, coins, the player's critter and the eagle are each merged into one
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
camera framing, fog distance, revive cost and fever thresholds. The roster lives
in `CRITTERS`, the awards in `AWARDS` and the daily challenge pool in
`QUEST_POOL` — a new character is a spec object, a new award is a name, a goal
and a getter, a new challenge is the same shape plus a coin reward.

`window.HOP` exposes the state, the world, the player, the progression systems
and `HOP.move('up' | 'down' | 'left' | 'right')` for poking at a live game from
the console. Useful while tinkering:

```js
HOP.stats.coins = 500; HOP.save();   // fund the prize machine / second chance
HOP.equip('robot');                  // wear something else
HOP.openPanel('quests');             // open today's challenges
HOP.doRevive();                      // take the second chance if offered
```
