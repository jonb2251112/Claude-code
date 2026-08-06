# Architecture Plan — Emoji Blitz Match-3

## 1. Design Principles

1. **Pure Model core** — Grid, match, gravity, specials, meters, and scoring are deterministic and testable without a renderer.
2. **Command → Resolve → Event** — Input emits intents; GameController validates; CascadeRunner mutates; RenderView reacts.
3. **Single source of truth** — `GridModel` is authoritative; sprites are projections keyed by `Tile.uid`.
4. **Frame-friendly resolves** — Long cascades yield between steps so mobile touch + rAF stay responsive.
5. **Data-driven characters** — Spells are registry entries, not hard-coded switch soup in the controller.

## 2. Directory Layout

```
emoji-blitz-match3/
├── docs/
│   ├── TECH_SPEC.md
│   └── ARCHITECTURE.md          ← this file
├── src/
│   ├── config/
│   │   ├── constants.ts         # 7×7, timers, meter rates, scores
│   │   └── balance.ts           # Tunable designer knobs
│   ├── types/
│   │   ├── tile.ts
│   │   ├── events.ts
│   │   └── round.ts
│   ├── core/
│   │   ├── model/
│   │   │   ├── GridModel.ts
│   │   │   ├── BlitzMeter.ts
│   │   │   ├── CharacterMeter.ts
│   │   │   ├── ScoreModel.ts
│   │   │   ├── RoundTimer.ts
│   │   │   └── TilePool.ts
│   │   ├── engine/
│   │   │   ├── MatchEngine.ts
│   │   │   ├── GravityEngine.ts
│   │   │   ├── SpecialResolver.ts
│   │   │   ├── CascadeRunner.ts
│   │   │   └── TileFactory.ts
│   │   └── systems/
│   │       └── GameController.ts
│   ├── characters/
│   │   ├── ICharacterSpell.ts
│   │   ├── SpellRegistry.ts
│   │   └── spells/
│   │       ├── PatternXSpell.ts
│   │       ├── GuaranteedStarsSpell.ts
│   │       ├── TimePauseSpell.ts
│   │       └── ColumnCrushSpell.ts
│   ├── controllers/
│   │   └── InputController.ts
│   ├── views/
│   │   ├── RenderView.ts        # PixiJS (or Unity Presenter port)
│   │   ├── BoardView.ts
│   │   ├── MeterView.ts
│   │   └── FxView.ts
│   └── index.ts
└── tests/
    ├── MatchEngine.test.ts
    ├── SpecialResolver.test.ts
    ├── GravityEngine.test.ts
    └── BlitzMeter.test.ts
```

## 3. Dependency Graph

```
views/* ──────────▶ types/events, types/tile
controllers/* ─────▶ types, GameController (intents only)
GameController ────▶ all model + engine
engine/* ──────────▶ model/GridModel, types, TileFactory
model/* ───────────▶ types, config
types, config ─────▶ (nothing)
```

**Forbidden edges:** `model` ↛ `views`, `engine` ↛ `views`, `model` ↛ `controllers`.

## 4. Round State Machine

```
                   selectHero()
PreMatch ──────────────────────────▶ Countdown
                                        │
                                   timer=0
                                        ▼
              power/swap ◄────────── Playing ◄──── Blitz timer end
                 │                     │  ▲
                 │              meter=100 │
                 ▼                     │  │
             Resolving ────────────────┘  │
                 │                        │
                 └──────▶ Blitz ──────────┘
                            │
                     (main timer frozen)

Playing ──(main timer=0, not resolving)──▶ RoundEnd
```

During `Resolving`, input is ignored except queued UI cancel is discarded.  
During `Blitz`, main `RoundTimer` is paused; Blitz sub-timer runs.

## 5. Sequence: Valid Swap with Cascade

```
Player                InputController       GameController         CascadeRunner        RenderView
  │ drag A→B               │                      │                      │                   │
  │───────────────────────▶│ SwapIntent(A,B)      │                      │                   │
  │                        │─────────────────────▶│                      │                   │
  │                        │                      │ grid.swap            │                   │
  │                        │                      │ Match/Special?       │                   │
  │                        │                      │── run(clearSet) ────▶│                   │
  │                        │                      │                      │ clear/score       │
  │                        │                      │                      │── events ────────▶│ pop FX
  │                        │                      │                      │ gravity           │
  │                        │                      │                      │── events ────────▶│ drop tween
  │                        │                      │                      │ refill+rematch    │
  │                        │                      │                      │── ... until idle  │
  │                        │                      │◀── done ─────────────│                   │
```

## 6. Sequence: Invalid Swap

```
GameController: swap → no match/special → swap back → emit SwapRejected(A,B)
RenderView: play forward swap 50% then reverse ease (or full swap+reverse); Model already restored.
```

## 7. GridModel Internals

- Storage: `Tile | null` in `Float64`-friendly flat array `cells[r * COLS + c]` (or 2D array — 7×7 either is fine; flat preferred for cache locality).
- `uid` monotonic counter for View diffing.
- Mutations always go through methods so optional debug hooks / checksums can run.
- `snapshot()` / `restore()` for speculative swap without cloning full object graphs twice (use struct copy of refs).

## 8. MatchEngine Detail

### Horizontal / Vertical Run Collection

```
for r in 0..6:
  runStart = 0
  for c in 1..7:
    if c==7 or type(r,c) != type(r,runStart) or not bothNormal:
      if c - runStart >= 3: record cells
      runStart = c
```

Same for columns.

### Shape Classification

After merging groups that share cells:

1. If all cells colinear horizontally or vertically:
   - len=3 → plain
   - len=4 → Cloud (axis = that orientation)
   - len≥5 → Star
2. Else if cell count ≥5 and forms L or T (one corner with degree 2 in both axes within the set):
   → Sun King at junction
3. Else → plain multi-clear (no special)

### Flood-Fill Role

Used to expand from seed cells that are members of valid runs, collecting the clear set when specials chain. Primary detection remains run-based for correctness (diagonals never match).

## 9. SpecialResolver

Input: two cells involved in a swap (post-swap positions).

```
ka, kb = kinds at A, B
if both special:
  return combine(ka,kb,A,B)
if one special:
  return activate(specialCell, otherCell)
return null  // defer to MatchEngine
```

Combine recipes produce `ClearPlan { cells: Set<Cell>, scoreTag, transformOps? }`  
`transformOps` used for Star+Cloud/Sun (mutate kinds in place, then expand clears).

## 10. BlitzMeter & CharacterMeter

Both are plain classes with `add`, `update(dt)`, `tryActivate`, `consume`.

`GameController.update(dt)`:

```
if state==Playing:
  roundTimer.tick(dt)
  blitzMeter.tickDecay(dt)  // only if idle
if state==Blitz:
  blitzTimer.tick(dt) → maybe endBlitz()
```

Activity flag set on successful swap commit and character spell fire.

## 11. InputController

- Pointer down → hit-test cell.
- Pointer move → if crossed into orthogonal neighbor past threshold, emit swap intent and lock gesture.
- Pointer up on same cell → deselect.
- Character HUD hit → `PowerTapIntent` if meter full.
- Coordinates: convert screen → board local using BoardView layout rect.

## 12. RenderView

- Maintains `Map<uid, Sprite>`.
- On `TilesFell`: tween world Y to target row.
- On `TilesCleared`: play particle, remove sprite, return to pool.
- On `TilesSpawned`: create sprite above board, tween into place.
- On Blitz: swap background color grade / bloom filter strength.
- Never reads future board state; only event payloads + occasional uid lookup.

### Animation Timings (defaults)

| Motion | Duration |
|--------|----------|
| Valid swap | 80 ms |
| Invalid reverse | 110 ms |
| Clear pop | 90 ms |
| Fall per cell | 40 ms + gravity ease |
| Spawn drop | 120 ms |

## 13. Unity Port Notes

| Concern | Approach |
|---------|----------|
| Update loop | `GameController.Tick(Time.deltaTime)` from a thin `GameSessionBehaviour` |
| Tweens | DOTween or custom; Presenter mirrors RenderView |
| Input | `IPointer` interfaces / Enhanced Touch |
| Addressables | Emoji atlases per character pack |
| Keep | Entire `core/` logic as asmdef without UnityEngine refs |

## 14. Determinism & Seeds

`TilePool` / `TileFactory` take an injected `Rng` (`mulberry32` or similar).  
Replay tests: seed + intent log → board hash after round.

## 15. Extensibility Checklist

- [ ] New emoji type → add to enum + atlas frame; pool config.
- [ ] New special → `TileKind` + SpecialResolver branch + FX.
- [ ] New character → JSON/TS spell config + icon.
- [ ] New meter modifier (events) → subscribe in GameController without touching GridModel.
