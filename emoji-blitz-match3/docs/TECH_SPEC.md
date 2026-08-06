# Emoji Blitz Match-3 — Technical Specification

**Version:** 1.0.0  
**Status:** Production-Ready Architecture Spec  
**Platform:** Mobile-first (portrait 9:16), hybrid web (PixiJS/TypeScript) or native (Unity/C#)  
**Round Duration:** 60 seconds + Blitz Mode overlays  
**Board:** Strict 7×7 grid  

---

## 1. Product Overview

A high-velocity Match-3 puzzle with a fixed 60-second blitz loop, special power tiles, a cascading Blitz Meter, and a selectable hero emoji whose matches charge a secondary power spell. Design goals:

| Goal | Target |
|------|--------|
| Frame budget | Stable 60 FPS on mid-tier mobile |
| Input latency | Drag→swap resolve ≤ 1 frame; invalid reverse ≤ 120 ms |
| Cascade resolve | Gravity + refill + re-match loop until quiescent |
| Session length | One round = 60s + optional Blitz extensions |
| Monetization hooks | Coins, character unlocks (out of scope for v1 core loop) |

Inspiration: Disney Emoji Blitz pacing and special-tile fantasy — original IP, original art direction.

---

## 2. Core Gameplay Loop

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│ Pre-Match   │───▶│ Round Start  │───▶│ Active Play │───▶│ Round End    │
│ Hero Select │    │ Board Fill   │    │ 60s Timer   │    │ Score/Coins  │
└─────────────┘    └──────────────┘    └──────┬──────┘    └──────────────┘
                                              │
                         ┌────────────────────┼────────────────────┐
                         ▼                    ▼                    ▼
                   Swap / Power         Cascade Resolve      Blitz Activation
                   Character Spell      Gravity + Refill     (timer pause 5s)
```

### 2.1 Round States

| State | Timer | Input | Notes |
|-------|-------|-------|-------|
| `PreMatch` | — | Hero select only | Board not interactive |
| `Countdown` | 3→0 | Locked | Soft start |
| `Playing` | Counting down | Swaps + character power | Standard rules |
| `Blitz` | Frozen | Swaps + character power | 5s duration, 3× score, pool−1 |
| `Resolving` | Frozen | Locked | Mid-cascade / power animation |
| `RoundEnd` | — | Results UI | Final score commit |

### 2.2 Board Matrix

- Dimensions: **ROWS = 7, COLS = 7** (immutable constants).
- Cell origin: `(0,0)` = top-left; row increases downward; column increases rightward.
- Every cell always holds exactly one tile after a resolve completes (no holes persist).
- Tile identity is an opaque `TileId` + `TileKind` (Normal | LightningCloud | SunKing | RainbowStar).

### 2.3 Matching Rules

1. Matches are **horizontal or vertical** contiguous runs of ≥3 identical **normal** emoji types.
2. Special tiles do **not** form standard color matches with normals unless activated by swap/trigger.
3. After any board mutation (swap clear, gravity, refill, power), the MatchEngine re-scans until no matches remain (cascade).
4. Scoring awards per cleared tile, with combo multipliers for cascade depth.

### 2.4 Swap Validation

1. Player drag/tap selects cell A; release/tap on orthogonal-adjacent cell B.
2. Tentative swap A↔B in GridModel (no animation commit yet).
3. MatchEngine evaluates matches **and** special-activation outcomes.
4. **Valid** if: creates Match-3+, creates Match-4/5 special spawn, or activates/combines specials.
5. **Invalid**: reverse swap immediately with interpolated animation (ease-out, ~100–120 ms). Model never commits invalid state.

### 2.5 Gravity & Refill

1. Cleared cells set to `Empty`.
2. Per column, non-empty tiles pack downward (stable order within column).
3. Empty cells at top receive newly spawned tiles from `TileSpawner` using the **active emoji pool** (5 normally; 4 during Blitz).
4. Spawned tiles animate from above the board (offset by spawn depth × cell size).
5. After refill, re-run match detection → clear → gravity → refill until stable.

**Physics-simulated fallback:** View-layer velocity uses ease-in gravity curve `y = y0 + 0.5 * g * t²` clamped per cell step; Model only stores discrete final positions. Stagger column drops by 16–24 ms for readability.

---

## 3. Tile Creation & Special Pieces

### 3.1 Match Classification

Given a cleared group of cells from a single match detection pass:

| Pattern | Size / Shape | Special Created | Spawn Cell |
|---------|--------------|-----------------|------------|
| Match-3 | Exactly 3 in a line | None | — |
| Match-4 | Exactly 4 in a straight line | **Lightning Cloud** | Swap destination (or center of match) |
| Match-5+ straight | ≥5 in a straight line | **Rainbow Star** | Swap destination |
| Match-5 L or T | 5 cells forming L/T (shared corner) | **Sun King** | Intersection / corner cell |

**Priority when multiple patterns overlap:** Star (straight-5) > Sun (L/T) > Cloud (4) > plain clear. Prefer spawning on the cell the player swapped into.

### 3.2 Special Activation

| Special | Trigger | Effect |
|---------|---------|--------|
| Lightning Cloud | Swap with any adjacent tile | Clears entire row **or** column based on original match orientation stored on the tile (`CrossAxis: Row \| Col`) |
| Sun King | Swap with any adjacent tile | Clears 3×3 centered on Sun King cell |
| Rainbow Star | Swap with adjacent **normal** emoji | Clears all board instances of that emoji type |

Specials are consumed on activation (cleared with their effect).

### 3.3 Power Combining (Special × Special Swap)

| Pair | Combined Wipe |
|------|---------------|
| Cloud + Cloud | Clears **3 full rows and 3 full columns** centered on the swap midpoint (clamped to board edges) |
| Cloud + Sun | Clears a **T-shaped blast**: 3-lane-wide vertical stem through swap column + 3-lane-wide horizontal bar through swap row (union of cells) |
| Star + Cloud | Find most common normal emoji on board → transform all instances into Clouds → trigger all of them (row/col alternating by column index) |
| Star + Sun | Same transform pipeline but into Sun Kings → trigger all 3×3 blasts (dedupe cells) |
| Star + Star | Clear **entire 7×7** board in one destructive phase |

Combine resolution is atomic in the Model: produce a `ClearSet`, apply once, then gravity/refill/cascade as usual.

### 3.4 Scoring (Base)

| Event | Points |
|-------|--------|
| Normal tile clear | 10 |
| Cloud activation clear (per cell) | 15 |
| Sun blast clear (per cell) | 20 |
| Star color clear (per cell) | 25 |
| Combined wipe (per cell) | 30 |
| Cascade depth `d` (d≥1) | ×(1 + 0.25·d) |
| Blitz Mode | ×3 flat on all score awards |
| Coins | `floor(score / 50)` granted at round end |

---

## 4. Blitz Meter Engine

### 4.1 Standard State

- Meter range: `0.0 … 100.0` (percent).
- Each cleared emoji (any kind that leaves the board) adds **+1.0**.
- Decay: **−2.0 per second** of player inactivity.
  - Inactivity = no successful swap commit and no character power fire.
  - Decay pauses during `Resolving`, `Blitz`, and `Countdown`.
- Cap at 100; overflow discarded (or optionally banks toward next Blitz — v1 discards).

### 4.2 Blitz Activation

When meter ≥ 100:

1. Transition to `Blitz` state.
2. **Halt** the primary 60s countdown.
3. Start Blitz timer = **5.0 seconds**.
4. Visual: high-contrast neon background, meter pulse, screen vignette (View only).
5. Gameplay modifiers:
   - Remove **one random emoji type** from the active spawn pool (5→4). Prefer a type that is **not** the active hero emoji.
   - Apply **3× score multiplier**.
6. On Blitz end: restore pool to 5, clear multiplier, reset meter to 0, resume main timer, return to `Playing`.

### 4.3 Blitz Edge Cases

- Cascades started during Blitz that finish after Blitz timer expires still use Blitz rules until that resolve chain completes (freeze Blitz end until `Resolving` clears).
- Meter does not fill during Blitz (already saturated / locked).
- Character power remains usable during Blitz.

---

## 5. Character Emoji Power System

### 5.1 Pre-Match Selection

Player selects one **Hero Emoji** from unlocked roster. That emoji type is **forced into** the match pool (counts as one of the 5 variants).

### 5.2 Character Power Meter

- Separate from Blitz Meter.
- Each cleared tile matching the hero type adds charge (default **+8%** per hero tile; designer-tunable per character).
- Full at 100%. Does not decay.
- UI: character icon beneath/ beside board; fill ring updates from Model events.

### 5.3 Power Execution

When charged, player taps the character icon:

1. Consume meter to 0.
2. Enter `Resolving`, run character `ICharacterSpell.execute(grid, ctx)`.
3. Example spells (data-driven):

| Spell ID | Effect |
|----------|--------|
| `pattern_x` | Clear both diagonals (X pattern) |
| `guaranteed_stars` | Convert 2 random normal tiles into Rainbow Stars |
| `time_pause` | Pause main timer for 3 seconds (non-Blitz) |
| `column_crush` | Clear two random columns |

Spells emit the same `BoardMutation` events as normal clears so RenderView and scoring stay unified.

---

## 6. Technical Stack

### 6.1 Recommended Stack (Primary Spec Target)

| Layer | Choice |
|-------|--------|
| Language | **TypeScript** (strict) |
| Renderer | **PixiJS v8** |
| Bundler | Vite |
| Mobile wrap | Capacitor (iOS/Android) optional |
| Audio | Howler or Pixi Sound |
| Tests | Vitest (Model/Engine pure logic) |

### 6.2 Alternate Stack (Parity Mapping)

| TS Module | Unity C# Equivalent |
|-----------|---------------------|
| `GridModel` | `GridModel` Scriptable/plain C# class |
| `MatchEngine` | `MatchEngine` (no MonoBehaviour) |
| `InputController` | `BoardInputController : MonoBehaviour` |
| `RenderView` | `BoardPresenter` + DOTween / Animation |
| `GameController` | `GameSessionController` |
| Events | C# `event` / UniRx / MessagePipe |

**Hard rule:** All match, gravity, spawn, and scoring logic lives in engine-agnostic Model/Engine modules with **zero** renderer imports.

---

## 7. MVC Architecture Separation

```
┌──────────────────────────────────────────────────────────┐
│                     GameController (C)                   │
│  owns state machine, wires Input → Model → Engine → View │
└───────────────┬───────────────────────┬──────────────────┘
                │                       │
        ┌───────▼────────┐      ┌───────▼────────┐
        │ InputController│      │   RenderView   │
        │  drag / tap    │      │  sprites, FX   │
        └───────┬────────┘      └───────▲────────┘
                │ commands              │ BoardEvents
        ┌───────▼────────────────────────┴───────┐
        │              MODEL LAYER               │
        │  GridModel · BlitzMeter · CharMeter    │
        │  ScoreModel · RoundTimer · TilePool    │
        └───────┬────────────────────────────────┘
                │ queries / mutations
        ┌───────▼────────────────────────────────┐
        │            ENGINE LAYER                │
        │  MatchEngine · GravityEngine           │
        │  SpecialResolver · CascadeRunner       │
        │  CharacterSpellRegistry                │
        └────────────────────────────────────────┘
```

### 7.1 Module Responsibilities

| Module | Responsibility | Must NOT |
|--------|----------------|----------|
| **GridModel** | 2D cell array, IDs, get/set/swap, empty flags | Render, input, audio |
| **MatchEngine** | Flood/scan horizontal+vertical runs, classify shapes, produce match groups | Mutate without CascadeRunner |
| **GravityEngine** | Column compaction plan + spawn requests | Animate |
| **SpecialResolver** | Cloud/Sun/Star/combine clear sets | UI |
| **CascadeRunner** | Loop: match→clear→special spawn→gravity→refill until stable | Block main thread >4ms without yielding |
| **InputController** | Map pointer to cells, emit SwapIntent / PowerTap | Change grid directly |
| **RenderView** | Subscribe to events; tween drops, pops, meters | Own gameplay truth |
| **GameController** | Round FSM, validate swaps, orchestrate resolve | Draw pixels |

### 7.2 Event Contract (Model → View)

```ts
type BoardEvent =
  | { type: 'TilesSwapped'; a: Cell; b: Cell }
  | { type: 'SwapRejected'; a: Cell; b: Cell }
  | { type: 'TilesCleared'; cells: Cell[]; reason: ClearReason }
  | { type: 'SpecialSpawned'; cell: Cell; kind: SpecialKind }
  | { type: 'TilesFell'; moves: FallMove[] }
  | { type: 'TilesSpawned'; spawns: SpawnSpec[] }
  | { type: 'BlitzChanged'; value: number; active: boolean }
  | { type: 'CharacterCharge'; value: number }
  | { type: 'ScoreChanged'; score: number; delta: number }
  | { type: 'TimerChanged'; remaining: number }
  | { type: 'RoundState'; state: RoundState };
```

Views are reactive: they never poll GridModel mid-frame except for debug overlays.

---

## 8. Algorithms

### 8.1 Match Detection (Scan + Group)

Not a free-form flood of arbitrary connectivity — Match-3 requires **axis-aligned runs**:

1. **Horizontal pass:** For each row, walk columns; group consecutive equal `emojiType` normals with length ≥ 3.
2. **Vertical pass:** For each column, walk rows; same.
3. **Merge overlapping groups** that share cells into composite shapes.
4. **Classify** each composite: straight-3, straight-4, straight-5+, L/T-5 via corner degree analysis.
5. Optional recursive flood is used only to gather **connected same-type cells that already belong to ≥3 runs** for clear-set building.

### 8.2 Swap Resolution Pseudocode

```
function trySwap(a, b):
  if not orthogonalAdjacent(a,b): return Reject
  if isResolving: return Reject
  grid.swap(a,b)
  result = SpecialResolver.tryCombineOrActivate(a,b,grid)
        ?? MatchEngine.findMatches(grid)
  if result.isEmpty:
    grid.swap(a,b)  // revert model immediately
    emit SwapRejected
    return Reject
  emit TilesSwapped
  CascadeRunner.run(result)
  markActivity()  // resets Blitz decay idle timer
```

### 8.3 Cascade Runner

```
function run(initialClear):
  state = Resolving
  pending = initialClear
  depth = 0
  while pending not empty:
    applyClears(pending)           // score, meters, remove tiles
    spawnSpecialsFromMatches()     // if match-created specials
    plan = GravityEngine.compact(grid)
    emit TilesFell(plan.moves)
    spawns = GravityEngine.refill(grid, pool)
    emit TilesSpawned(spawns)
    await view.animations(plan, spawns)  // or sync in headless tests
    pending = MatchEngine.findMatches(grid)
    depth++
  state = previous Playing|Blitz
```

Mobile note: for very deep cascades, yield to the frame loop between gravity steps so input thread stays alive; Model remains authoritative.

---

## 9. Performance Budgets (Mobile)

| Budget | Limit |
|--------|-------|
| Match scan | O(ROWS×COLS) ≈ 49 cells; < 0.2 ms |
| Cascade worst-case | Soft-cap depth 30; force stop + log if exceeded |
| Draw calls | Atlas all emoji; ≤ 3 batches for board |
| Particle pools | Prewarm 64 pop FX |
| GC | Avoid per-frame allocations in hot path; reuse ClearSet buffers |
| Touch sampling | 60 Hz; gesture threshold 0.3 × cellSize |

---

## 10. Data Model Summary

```ts
interface Tile {
  uid: number;           // unique instance id for animation tracking
  kind: TileKind;        // Normal | LightningCloud | SunKing | RainbowStar
  emojiType: EmojiType | null; // null for pure specials that lost color; Star may be colorless
  cloudAxis?: 'row' | 'col';
}

interface Cell { r: number; c: number }

interface GridModel {
  readonly rows: 7;
  readonly cols: 7;
  get(r,c): Tile | null;
  set(r,c, tile: Tile | null): void;
  swap(a: Cell, b: Cell): void;
  cloneBoard(): (Tile | null)[][];
}
```

Emoji pool default size 5 including hero. During Blitz, pool size 4.

---

## 11. UI Layout (Mobile Portrait)

```
┌────────────────────────────┐
│  Score          Timer 60.0 │
│  ┌──────────────────────┐  │
│  │                      │  │
│  │      7×7 BOARD       │  │
│  │                      │  │
│  └──────────────────────┘  │
│  [==== Blitz Meter ====]   │
│   (Hero)  Power Ring       │
└────────────────────────────┘
```

First viewport during play: board-dominant; meters secondary; no card clutter.

---

## 12. Testing Strategy

| Layer | Tests |
|-------|-------|
| MatchEngine | Fixtures for 3/4/5 straight, L, T, no false positives on diagonals |
| SpecialResolver | All combine pairs on 7×7 fixtures |
| GravityEngine | Holes pack; spawn count equals empties |
| BlitzMeter | Fill, decay, activate, resume timer |
| CascadeRunner | Deterministic RNG seed → golden board hashes |
| InputController | Adjacent vs diagonal rejection |

Headless Model tests run in Vitest without PixiJS.

---

## 13. File Map

See `docs/ARCHITECTURE.md` and `src/` for the reference TypeScript implementation of Model/Engine layers.

---

## 14. Out of Scope (v1 Spec Boundary)

- Live ops / seasons / gacha economy balancing
- Multiplayer / async PvP
- Full art/audio production pipeline
- Analytics vendor wiring (hooks stubbed)

---

## 15. Acceptance Criteria

1. 7×7 board; only valid Match-3+ swaps commit.
2. Invalid swaps reverse with smooth interpolation.
3. Gravity + refill keep board full; cascades resolve correctly.
4. Match-4/5 create Cloud / Sun / Star per rules.
5. All five special-combine recipes execute documented wipes.
6. Blitz Meter +1% per clear, −2%/s idle decay; at 100% enters 5s Blitz with pool 4 and 3× score; main timer paused.
7. Hero emoji in pool; character meter charges; tap fires spell.
8. GridModel/MatchEngine have zero view dependencies.
9. 60 FPS target on reference mid-tier Android/iOS device for board + FX.
