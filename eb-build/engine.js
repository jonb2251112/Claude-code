/* =============================================================================
 * EMOJI RUSH — Match-3 Game Engine (IIFE body fragment)
 * -----------------------------------------------------------------------------
 * Embed this file inside a single HTML bundle. Outer scope MUST provide:
 *   CHARACTERS  — hero roster [{id,name,spell,desc,chargeBonus,...}]
 *   save        — persisted SAVE object (coins,gems,lives,unlocked,selected,levels{})
 *   $, toast, sfx, faceHTML, tileVisual — DOM / presentation helpers
 *   ROWS, COLS, ROUND, BLITZ_SEC, POOL_N, BLITZ_POOL — board constants
 *   FILL, DECAY, MULT, CHARGE — meter tuning (optional; defaults below)
 *   ANIM — animation ms map (optional)
 *   writeSave, grantXP, grantPassXP, bumpQuest, checkAchievements — meta hooks
 *   showScreen, refreshMenu, stopMusic, startMusic, ensureAudio — shell hooks
 *   BOOSTERS, REVIVE_COST, REVIVE_SCORE_MIN, XP_PER_LEVEL, passTier — economy
 *
 * Special tile kinds (canonical strings):
 *   "Normal" | "LightningCloud" | "Sunshine" | "RainbowStar"
 *
 * Disney Emoji Blitz–accurate rules implemented:
 *   • 7×7, 60s rounds, 5-type pool (hero + 4 random others)
 *   • Match-4 line → LightningCloud (row if horizontal swipe, col if vertical)
 *   • Match-5+ line → RainbowStar
 *   • L/T shape 5+ → Sunshine (full row + col cross through junction, NOT 3×3)
 *   • Special combines (cloud+cloud, cloud+sunshine, star+star, star+cloud/sun)
 *   • Blitz meter → 5s ×3 score, reduced emoji pool
 *   • Hero power meter from clearing hero emoji; tap hero to cast spell
 *   • Valid swaps only; gravity + cascades; race-safe resolving lock
 * ============================================================================= */

"use strict";

/* -------------------------------------------------------------------------- */
/* Tunables (use outer constants when present)                                 */
/* -------------------------------------------------------------------------- */
const ENGINE_FILL   = (typeof FILL   !== "undefined") ? FILL   : 1;
const ENGINE_DECAY  = (typeof DECAY  !== "undefined") ? DECAY  : 2;
const ENGINE_MULT   = (typeof MULT   !== "undefined") ? MULT   : 3;
const ENGINE_CHARGE = (typeof CHARGE !== "undefined") ? CHARGE : 8;
const ENGINE_ANIM   = (typeof ANIM   !== "undefined") ? ANIM   : { swap:80, reject:110, clear:90, spawn:120, special:140, transform:110 };

/* MAX_LIVES from shell.js */
const LIFE_REGEN_MS    = 30 * 60 * 1000;   /* 30 minutes per life */
const LIFE_REGEN_CAP   = MAX_LIVES;
const SCORE_BASE_MATCH = 10;
const SCORE_PER_LEVEL  = 4;                /* extra points per emoji upgrade level */
const CASCADE_BONUS    = 0.25;             /* per cascade depth */
const BLITZ_FILL_MULT  = 1.0;
const MAX_CASCADE_DEPTH = 32;

const SPECIAL_KINDS = Object.freeze({
  NORMAL: "Normal",
  CLOUD:  "LightningCloud",
  SUN:    "Sunshine",
  STAR:   "RainbowStar",
});

const CLEAR_REASON = Object.freeze({
  MATCH:     "match",
  CASCADE:   "cascade",
  CLOUD:     "cloud",
  SUN:       "sun",
  STAR:      "star",
  COMBINE:   "combine",
  CHARACTER: "character",
  BLITZ:     "blitz",
});

/* -------------------------------------------------------------------------- */
/* Runtime state                                                               */
/* -------------------------------------------------------------------------- */
let rng = () => Math.random();

/** @type {object} active hero character row from CHARACTERS */
let hero = CHARACTERS[0];

/** Flat ROWS*COLS grid of tile objects or null */
let grid = [];

/** Monotonic tile uid allocator */
let nextUid = 1;

/** Map<uid, HTMLElement> — DOM sprites for tiles */
let sprites = new Map();

/** High-level round state machine label */
let state = "idle";

/** Current round score */
let score = 0;

/** Blitz meter 0–100 (also used as blitz timer fill during Blitz) */
let blitz = 0;

/** True while Blitz mode active */
let blitzOn = false;

/** Seconds remaining in Blitz window */
let blitzLeft = 0;

/** Hero power charge 0–100 */
let charge = 0;

/** Seconds remaining in standard round timer */
let timeLeft = (typeof ROUND !== "undefined") ? ROUND : 60;

/** Clock frozen by hero spell or Blitz */
let timePaused = false;

/** Remaining hero time-freeze seconds */
let pauseLeft = 0;

/** User paused via pause modal */
let paused = false;

/** True when no clears happened recently — enables blitz decay */
let idle = true;

/** Mutex: true while swap/cascade resolution in flight */
let resolving = false;

/** Selected cell for tap-tap swap */
let selected = null;

/** Last animation frame timestamp */
let lastTs = 0;

/** Combo banner hide timer */
let comboT = 0;

/** Best combo depth this round */
let bestCombo = 0;

/** Tiles cleared this round (for missions) */
let roundClears = 0;

/** Emoji type ids currently spawning on board */
let pool = [];

/** Original 5-type pool before Blitz shrink */
let basePool = [];

/** Counters for mission / results tracking */
let roundBlitzes = 0;
let roundPowers = 0;
let roundCoinsEarned = 0;
let scoreMult = 1;
let coinMult = 1;
let revived = false;
let pendingFinish = false;
let activeBooster = null;

/**
 * Detailed per-round statistics surfaced to missions / analytics.
 * Updated throughout play; copied into finishRound reporting.
 */
const roundStats = {
  score: 0,
  clears: 0,
  powers: 0,
  blitzes: 0,
  cloudsMade: 0,
  sunsMade: 0,
  starsMade: 0,
  combos: 0,
  specialsTriggered: 0,
  heroClears: 0,
  maxCombo: 0,
};

/** Last swap axis hint for LightningCloud orientation: "row" | "col" */
let lastSwapAxis = "row";

/** Pointer gesture state */
let pointerDown = null;
let pointerLocked = false;

/* DOM refs — resolved lazily so engine can load before DOM ready */
let boardEl = null;
let fxEl = null;

function resolveDomRefs() {
  if (!boardEl) boardEl = $("board");
  if (!fxEl)     fxEl     = $("fx");
  return boardEl && fxEl;
}

/* -------------------------------------------------------------------------- */
/* Small utilities                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Seeded PRNG (mulberry32 variant) for reproducible rounds when desired.
 * @param {number} seed
 * @returns {() => number}
 */
function createRng(seed) {
  let t = seed >>> 0;
  return function rngSeeded() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pack row/col into a single int key for sets/maps */
const cellKey = (r, c) => r * 8 + c;

/** Orthogonal adjacency */
const isOrtho = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;

/** Promise sleep for animation pacing */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Safe promise wrapper — logs rejections instead of silent failures */
function safeRun(promise, label) {
  return Promise.resolve(promise).catch((err) => {
    console.error("[EmojiRush engine]", label || "async", err);
  });
}

/* -------------------------------------------------------------------------- */
/* Lives system hooks                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Ensure save.lives exists and apply any offline regen based on lifeRegenAt.
 * Call on boot and before displaying hub lives UI.
 */
function ensureLivesState() {
  if (save.lives == null) save.lives = MAX_LIVES;
  if (save.lifeRegenAt == null) save.lifeRegenAt = 0;
  tickLivesRegen();
}

/**
 * Apply life regeneration based on elapsed time since lifeRegenAt.
 * Each LIFE_REGEN_MS restores one life up to MAX_LIVES.
 */
function tickLivesRegen() {
  if (save.lives >= MAX_LIVES) {
    save.lifeRegenAt = 0;
    return save.lives;
  }
  const now = Date.now();
  if (!save.lifeRegenAt) {
    save.lifeRegenAt = now + LIFE_REGEN_MS;
    return save.lives;
  }
  while (save.lives < MAX_LIVES && now >= save.lifeRegenAt) {
    save.lives++;
    save.lifeRegenAt += LIFE_REGEN_MS;
  }
  if (save.lives >= MAX_LIVES) save.lifeRegenAt = 0;
  return save.lives;
}

/** Milliseconds until next free life, or 0 if full */
function livesRegenRemainingMs() {
  tickLivesRegen();
  if (save.lives >= MAX_LIVES || !save.lifeRegenAt) return 0;
  return Math.max(0, save.lifeRegenAt - Date.now());
}

/** Human-readable regen timer for HUD */
function formatLivesRegen() {
  const ms = livesRegenRemainingMs();
  if (!ms) return "Full";
  const m = Math.ceil(ms / 60000);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

/** Whether player can start a round (has lives or unlimited mode flag) */
function canSpendLife() {
  ensureLivesState();
  if (save.unlimitedLives) return true;
  return save.lives > 0;
}

/**
 * Consume one life when a round begins.
 * @returns {boolean} false if no life available
 */
function consumeLifeOnStart() {
  ensureLivesState();
  if (save.unlimitedLives) return true;
  if (save.lives <= 0) {
    toast("No lives! Wait " + formatLivesRegen());
    return false;
  }
  save.lives--;
  if (save.lives < MAX_LIVES && !save.lifeRegenAt) {
    save.lifeRegenAt = Date.now() + LIFE_REGEN_MS;
  }
  writeSave();
  return true;
}

/* -------------------------------------------------------------------------- */
/* Emoji level → score                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Upgrade level for a character emoji type (1-based).
 * Stored in save.levels[id] by the meta layer.
 */
function getEmojiLevel(typeId) {
  if (!save.levels) return 1;
  const lv = save.levels[typeId];
  return (typeof lv === "number" && lv > 0) ? lv : 1;
}

/**
 * Points awarded per cleared normal tile of this emoji type.
 * Higher collection level = higher score (EB-style progression).
 */
function scoreValueForEmoji(typeId) {
  const lv = getEmojiLevel(typeId);
  return SCORE_BASE_MATCH + (lv - 1) * SCORE_PER_LEVEL;
}

/**
 * Weighted score for a batch of cleared cells.
 * @param {{cell:object,tile:object}[]} snapshots — tiles captured before removal
 */
function computeClearScore(snapshots, reason, depth) {
  let total = 0;
  const depthMult = 1 + CASCADE_BONUS * Math.max(0, depth);
  const blitzMult = blitzOn ? ENGINE_MULT : 1;
  for (const { tile } of snapshots) {
    if (!tile) continue;
    let base;
    if (tile.kind === SPECIAL_KINDS.NORMAL) {
      base = tile.emojiType != null ? scoreValueForEmoji(tile.emojiType) : baseScoreForReason(reason);
    } else {
      base = baseScoreForReason(reason);
    }
    total += base;
  }
  return Math.floor(total * depthMult * blitzMult * scoreMult);
}

function baseScoreForReason(reason) {
  const table = {
    [CLEAR_REASON.CLOUD]: 15,
    [CLEAR_REASON.SUN]: 20,
    [CLEAR_REASON.STAR]: 25,
    [CLEAR_REASON.COMBINE]: 30,
    [CLEAR_REASON.CHARACTER]: 12,
    [CLEAR_REASON.MATCH]: 10,
    [CLEAR_REASON.CASCADE]: 10,
    [CLEAR_REASON.BLITZ]: 12,
  };
  return table[reason] || SCORE_BASE_MATCH;
}

/* -------------------------------------------------------------------------- */
/* Tile model — makeNormal / makeSpecial                                       */
/* -------------------------------------------------------------------------- */

function allocUid() {
  return nextUid++;
}

/**
 * Create a standard matchable emoji tile.
 * @param {number} [typeId] — index into active pool; random if omitted
 */
function makeNormal(typeId) {
  const type = typeId != null
    ? typeId
    : (pool.length ? pool[Math.floor(rng() * pool.length)] : 0);
  return {
    uid: allocUid(),
    kind: SPECIAL_KINDS.NORMAL,
    emojiType: type,
    cloudAxis: null,
  };
}

/**
 * Create a special tile.
 * @param {"LightningCloud"|"Sunshine"|"RainbowStar"} kind
 * @param {"row"|"col"} [cloudAxis] — LightningCloud clear orientation
 */
function makeSpecial(kind, cloudAxis) {
  return {
    uid: allocUid(),
    kind,
    emojiType: null,
    cloudAxis: kind === SPECIAL_KINDS.CLOUD ? (cloudAxis || "row") : null,
  };
}

function isSpecialTile(t) {
  return !!(t && t.kind && t.kind !== SPECIAL_KINDS.NORMAL);
}

function cloneTileVisual(tile) {
  return {
    uid: tile.uid,
    kind: tile.kind,
    emojiType: tile.emojiType,
    cloudAxis: tile.cloudAxis,
  };
}

/* -------------------------------------------------------------------------- */
/* Grid accessors — get / set / swap                                           */
/* -------------------------------------------------------------------------- */

function get(r, c) {
  if (r < 0 || c < 0 || r >= ROWS || c >= COLS) return null;
  return grid[r * COLS + c];
}

function set(r, c, tile) {
  grid[r * COLS + c] = tile;
}

function swapCells(a, b) {
  const ta = get(a.r, a.c);
  const tb = get(b.r, b.c);
  set(a.r, a.c, tb);
  set(b.r, b.c, ta);
}

function forEachCell(fn) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      fn(r, c, get(r, c));
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Board layout — cell size, positions, gap                                    */
/* -------------------------------------------------------------------------- */

function readGapPx() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--gap").trim();
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 3;
}

function cellPx() {
  if (!boardEl) return Math.min(window.innerWidth * 0.118, 48);
  const rect = boardEl.getBoundingClientRect();
  const g = readGapPx();
  if (rect.width > 1) return (rect.width - g * (COLS - 1)) / COLS;
  return Math.min(window.innerWidth * 0.118, 48);
}

/** Top-left pixel position for cell (r,c) */
function pos(r, c) {
  const s = cellPx();
  const g = readGapPx();
  return { x: c * (s + g), y: r * (s + g) };
}

/** Convert client coords to board cell */
function hitCell(clientX, clientY) {
  if (!boardEl) return null;
  const rect = boardEl.getBoundingClientRect();
  const s = cellPx();
  const g = readGapPx();
  const c = Math.floor((clientX - rect.left) / (s + g));
  const r = Math.floor((clientY - rect.top) / (s + g));
  if (r < 0 || c < 0 || r >= ROWS || c >= COLS) return null;
  return { r, c };
}

/* -------------------------------------------------------------------------- */
/* Sprite layer — ensureSprite / syncSprites / FX                              */
/* -------------------------------------------------------------------------- */

/**
 * Attach or update DOM node for a tile at grid position.
 * @param {object} tile
 * @param {number} r
 * @param {number} c
 * @param {number} [fromAboveRows] — spawn drop distance for refill animation
 */
function ensureSprite(tile, r, c, fromAboveRows) {
  if (!boardEl || !tile) return null;
  let el = sprites.get(tile.uid);
  const isSpec = isSpecialTile(tile);
  if (!el) {
    el = document.createElement("div");
    el.className = "tile" + (isSpec ? " special" : "");
    el.dataset.uid = String(tile.uid);
    el.dataset.kind = tile.kind;
    boardEl.appendChild(el);
    sprites.set(tile.uid, el);
  } else {
    el.className = "tile" + (isSpec ? " special" : "");
    el.dataset.kind = tile.kind;
  }
  el.innerHTML = tileVisual(tile);
  const p = pos(r, c);
  const drop = fromAboveRows || 0;
  el.style.left = p.x + "px";
  el.style.top = (p.y - drop * (cellPx() + readGapPx())) + "px";
  el.style.transition = "none";
  if (drop > 0) {
    requestAnimationFrame(() => {
      el.style.transition = `top ${ENGINE_ANIM.spawn + drop * 18}ms cubic-bezier(.2,.8,.2,1)`;
      el.style.top = p.y + "px";
    });
  }
  return el;
}

/**
 * Reconcile DOM sprites with grid state.
 * @param {boolean} animate — tween position changes (gravity)
 */
function syncSprites(animate) {
  if (!boardEl) return;
  const alive = new Set();
  forEachCell((r, c, t) => {
    if (!t) return;
    alive.add(t.uid);
    const el = sprites.get(t.uid) || ensureSprite(t, r, c);
    const p = pos(r, c);
    el.style.transition = animate
      ? `left 80ms ease, top 120ms cubic-bezier(.2,.9,.3,1)`
      : "none";
    el.style.left = p.x + "px";
    el.style.top = p.y + "px";
    el.classList.toggle("selected", !!(selected && selected.r === r && selected.c === c));
    if (isSpecialTile(t)) el.classList.add("special");
  });
  for (const [uid, el] of sprites) {
    if (!alive.has(uid)) {
      el.remove();
      sprites.delete(uid);
    }
  }
}

/** Particle burst at cleared cells */
function burstFx(cells) {
  if (!fxEl || !cells.length) return;
  const s = cellPx();
  cells.slice(0, 14).forEach((cell) => {
    const p = pos(cell.r, cell.c);
    for (let i = 0; i < 5; i++) {
      const sp = document.createElement("div");
      sp.className = "spark";
      const ang = Math.random() * Math.PI * 2;
      const dist = 18 + Math.random() * 28;
      sp.style.left = (p.x + s / 2) + "px";
      sp.style.top = (p.y + s / 2) + "px";
      sp.style.setProperty("--dx", (Math.cos(ang) * dist) + "px");
      sp.style.setProperty("--dy", (Math.sin(ang) * dist) + "px");
      sp.style.background = ["#ffd166", "#ff6b4a", "#2ec4b6", "#fff", "#c44bff"][i % 5];
      fxEl.appendChild(sp);
      setTimeout(() => sp.remove(), 560);
    }
  });
}

function shakeBoard() {
  if (!save.shake) return;
  const root = $("root");
  if (!root) return;
  root.classList.remove("shake");
  void root.offsetWidth;
  root.classList.add("shake");
}

function popScoreFx(cells, delta) {
  if (!boardEl || !cells.length || delta <= 0) return;
  const mid = cells[Math.floor(cells.length / 2)];
  const p = pos(mid.r, mid.c);
  const el = document.createElement("div");
  el.className = "score-pop";
  el.textContent = "+" + delta;
  el.style.left = (p.x + cellPx() * 0.15) + "px";
  el.style.top = p.y + "px";
  boardEl.appendChild(el);
  setTimeout(() => el.remove(), 700);
}

function showComboBanner(depth) {
  if (depth < 1) return;
  const comboEl = $("combo");
  if (!comboEl) return;
  bestCombo = Math.max(bestCombo, depth + 1);
  roundStats.maxCombo = bestCombo;
  roundStats.combos++;
  let label = "COMBO x" + (depth + 1);
  if (depth >= 4) label = "ULTRA CASCADE!";
  else if (depth >= 3) label = "MEGA CASCADE!";
  comboEl.textContent = label;
  comboEl.classList.add("show");
  clearTimeout(comboT);
  comboT = setTimeout(() => comboEl.classList.remove("show"), 520);
}

/* -------------------------------------------------------------------------- */
/* Match detection — findMatches / classify                                    */
/* -------------------------------------------------------------------------- */

/**
 * Scan board for horizontal and vertical runs of 3+ normal tiles.
 * Union overlapping runs (L/T shapes) into connected groups.
 * @returns {{groups:object[], clearCells:object[], specialSpawns:object[]}}
 */
function findMatches() {
  const runs = [];
  const parent = new Map();
  const cellMap = new Map();

  function findRoot(k) {
    let p = parent.get(k) ?? k;
    while (p !== (parent.get(p) ?? p)) p = parent.get(p);
    parent.set(k, p);
    return p;
  }
  function union(a, b) {
    const ra = findRoot(a);
    const rb = findRoot(b);
    if (ra !== rb) parent.set(ra, rb);
  }

  /* Horizontal runs */
  for (let r = 0; r < ROWS; r++) {
    let s = 0;
    while (s < COLS) {
      const seed = get(r, s);
      if (!seed || seed.kind !== SPECIAL_KINDS.NORMAL) { s++; continue; }
      let e = s + 1;
      while (e < COLS) {
        const t = get(r, e);
        if (!t || t.kind !== SPECIAL_KINDS.NORMAL || t.emojiType !== seed.emojiType) break;
        e++;
      }
      if (e - s >= 3) {
        const cells = [];
        for (let c = s; c < e; c++) cells.push({ r, c });
        runs.push(cells);
      }
      s = e;
    }
  }

  /* Vertical runs */
  for (let c = 0; c < COLS; c++) {
    let s = 0;
    while (s < ROWS) {
      const seed = get(s, c);
      if (!seed || seed.kind !== SPECIAL_KINDS.NORMAL) { s++; continue; }
      let e = s + 1;
      while (e < ROWS) {
        const t = get(e, c);
        if (!t || t.kind !== SPECIAL_KINDS.NORMAL || t.emojiType !== seed.emojiType) break;
        e++;
      }
      if (e - s >= 3) {
        const cells = [];
        for (let rr = s; rr < e; rr++) cells.push({ r: rr, c });
        runs.push(cells);
      }
      s = e;
    }
  }

  if (!runs.length) {
    return { groups: [], clearCells: [], specialSpawns: [] };
  }

  /* Union runs that share cells (L/T detection) */
  for (const run of runs) {
    let prev = null;
    for (const cell of run) {
      const k = cellKey(cell.r, cell.c);
      cellMap.set(k, cell);
      if (!parent.has(k)) parent.set(k, k);
      if (prev != null) union(prev, k);
      prev = k;
    }
  }

  const buckets = new Map();
  for (const [k, cell] of cellMap) {
    const root = findRoot(k);
    if (!buckets.has(root)) buckets.set(root, []);
    buckets.get(root).push(cell);
  }

  const groups = [];
  const specialSpawns = [];
  const clearKeys = new Set();
  const reserved = new Set();

  for (const cells of buckets.values()) {
    const cl = classifyMatchGroup(cells);
    groups.push({ cells, ...cl });
    if (cl.special) {
      specialSpawns.push({
        cell: cl.spawnAt,
        kind: cl.special,
        cloudAxis: cl.axis,
      });
      reserved.add(cellKey(cl.spawnAt.r, cl.spawnAt.c));
      trackSpecialCreated(cl.special);
    }
    for (const cell of cells) {
      const k = cellKey(cell.r, cell.c);
      if (!reserved.has(k)) clearKeys.add(k);
    }
  }

  const clearCells = [];
  for (const k of clearKeys) {
    if (reserved.has(k)) continue;
    const c = k % 8;
    const r = (k - c) / 8;
    clearCells.push({ r, c });
  }

  return { groups, clearCells, specialSpawns };
}

/**
 * Decide special spawn for a connected match group.
 * Priority: L/T Sunshine (5+) > line RainbowStar (5+) > line LightningCloud (4) > plain match
 */
function classifyMatchGroup(cells) {
  const rows = new Set(cells.map((c) => c.r));
  const cols = new Set(cells.map((c) => c.c));
  const spawnAt = cells[Math.floor(cells.length / 2)];

  /* Pure horizontal line */
  if (rows.size === 1) {
    if (cells.length >= 5) return { axis: "row", spawnAt, special: SPECIAL_KINDS.STAR };
    if (cells.length === 4) return { axis: "row", spawnAt, special: SPECIAL_KINDS.CLOUD };
    return { axis: "row", spawnAt };
  }

  /* Pure vertical line */
  if (cols.size === 1) {
    if (cells.length >= 5) return { axis: "col", spawnAt, special: SPECIAL_KINDS.STAR };
    if (cells.length === 4) return { axis: "col", spawnAt, special: SPECIAL_KINDS.CLOUD };
    return { axis: "col", spawnAt };
  }

  /* L or T shape — junction cell has both horizontal and vertical neighbors in group */
  const ks = new Set(cells.map((c) => cellKey(c.r, c.c)));
  let junction = null;
  for (const cell of cells) {
    const h = ks.has(cellKey(cell.r, cell.c - 1)) || ks.has(cellKey(cell.r, cell.c + 1));
    const v = ks.has(cellKey(cell.r - 1, cell.c)) || ks.has(cellKey(cell.r + 1, cell.c));
    if (h && v) { junction = cell; break; }
  }
  if (junction && cells.length >= 5) {
    return { spawnAt: junction, special: SPECIAL_KINDS.SUN };
  }

  return { spawnAt };
}

function trackSpecialCreated(kind) {
  if (kind === SPECIAL_KINDS.CLOUD) roundStats.cloudsMade++;
  else if (kind === SPECIAL_KINDS.SUN) roundStats.sunsMade++;
  else if (kind === SPECIAL_KINDS.STAR) roundStats.starsMade++;
}

/* -------------------------------------------------------------------------- */
/* Cell collections for clears                                                 */
/* -------------------------------------------------------------------------- */

function uniqCells(cells) {
  const seen = new Set();
  const out = [];
  for (const cell of cells) {
    if (cell.r < 0 || cell.c < 0 || cell.r >= ROWS || cell.c >= COLS) continue;
    const k = cellKey(cell.r, cell.c);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(cell);
  }
  return out;
}

const rowCells = (r) => Array.from({ length: COLS }, (_, c) => ({ r, c }));
const colCells = (c) => Array.from({ length: ROWS }, (_, r) => ({ r, c }));

/** Sunshine: full row + full column through center (cross/plus), NOT 3×3 */
function sunshineCross(center) {
  const cells = [];
  for (let c = 0; c < COLS; c++) cells.push({ r: center.r, c });
  for (let r = 0; r < ROWS; r++) {
    if (r !== center.r) cells.push({ r, c: center.c });
  }
  return uniqCells(cells);
}

/** Both diagonals through center cell */
function diagonalCross(center) {
  const cells = [];
  for (let i = 0; i < ROWS; i++) {
    cells.push({ r: i, c: i });
    cells.push({ r: i, c: COLS - 1 - i });
  }
  return uniqCells(cells);
}

function allBoardCells() {
  const cells = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) cells.push({ r, c });
  }
  return cells;
}

/** Count normal tiles per emoji type; return type id with highest count */
function mostCommonEmojiType() {
  const counts = new Map();
  forEachCell((r, c, t) => {
    if (t && t.kind === SPECIAL_KINDS.NORMAL && t.emojiType != null) {
      counts.set(t.emojiType, (counts.get(t.emojiType) || 0) + 1);
    }
  });
  let best = null;
  let n = -1;
  for (const [k, v] of counts) {
    if (v > n) { best = k; n = v; }
  }
  return best;
}

/* -------------------------------------------------------------------------- */
/* Special activation & combines — resolveSpecial                                */
/* -------------------------------------------------------------------------- */

/**
 * Activate a single special at `sc` swapped with partner tile `other`.
 * @param {{r,c}} sc — special cell
 * @param {object} sp — special tile object
 * @param {object} other — partner tile at swap target
 */
function activateSpecial(sc, sp, other) {
  if (sp.kind === SPECIAL_KINDS.CLOUD) {
    const axis = sp.cloudAxis || "row";
    const cells = axis === "row" ? rowCells(sc.r) : colCells(sc.c);
    return { cells: uniqCells(cells), reason: CLEAR_REASON.CLOUD };
  }

  if (sp.kind === SPECIAL_KINDS.SUN) {
    return { cells: sunshineCross(sc), reason: CLEAR_REASON.SUN };
  }

  if (sp.kind === SPECIAL_KINDS.STAR) {
    if (!other || other.kind !== SPECIAL_KINDS.NORMAL || other.emojiType == null) {
      return { cells: uniqCells([sc]), reason: CLEAR_REASON.STAR };
    }
    const cells = [sc];
    forEachCell((r, c, t) => {
      if (t && t.kind === SPECIAL_KINDS.NORMAL && t.emojiType === other.emojiType) {
        cells.push({ r, c });
      }
    });
    return { cells: uniqCells(cells), reason: CLEAR_REASON.STAR };
  }

  return { cells: [], reason: CLEAR_REASON.MATCH };
}

/**
 * Combine two specials at cells a and b.
 * EB rules:
 *   Cloud+Cloud → 3 rows + 3 cols around midpoint
 *   Cloud+Sunshine → row + col bands + both diagonals
 *   Star+Star → clear entire board
 *   Star + (Cloud|Sunshine) → transform most common type into that special, then fire
 */
function combineSpecials(a, ta, b, tb) {
  /* Cloud + Cloud */
  if (ta.kind === SPECIAL_KINDS.CLOUD && tb.kind === SPECIAL_KINDS.CLOUD) {
    const midR = Math.round((a.r + b.r) / 2);
    const midC = Math.round((a.c + b.c) / 2);
    const cells = [];
    for (const r of [midR - 1, midR, midR + 1]) cells.push(...rowCells(r));
    for (const c of [midC - 1, midC, midC + 1]) cells.push(...colCells(c));
    return { cells: uniqCells(cells), reason: CLEAR_REASON.COMBINE };
  }

  const kinds = new Set([ta.kind, tb.kind]);

  /* Cloud + Sunshine */
  if (kinds.has(SPECIAL_KINDS.CLOUD) && kinds.has(SPECIAL_KINDS.SUN)) {
    const midR = Math.round((a.r + b.r) / 2);
    const midC = Math.round((a.c + b.c) / 2);
    const cells = [];
    for (let r = 0; r < ROWS; r++) {
      for (let dc = -1; dc <= 1; dc++) cells.push({ r, c: midC + dc });
    }
    for (let c = 0; c < COLS; c++) {
      for (let dr = -1; dr <= 1; dr++) cells.push({ r: midR + dr, c });
    }
    cells.push(...diagonalCross({ r: midR, c: midC }));
    return { cells: uniqCells(cells), reason: CLEAR_REASON.COMBINE };
  }

  /* Star + Star → board wipe */
  if (ta.kind === SPECIAL_KINDS.STAR && tb.kind === SPECIAL_KINDS.STAR) {
    return { cells: allBoardCells(), reason: CLEAR_REASON.COMBINE };
  }

  /* Star + Cloud or Star + Sunshine → mass transform then trigger */
  if (kinds.has(SPECIAL_KINDS.STAR) &&
      (kinds.has(SPECIAL_KINDS.CLOUD) || kinds.has(SPECIAL_KINDS.SUN))) {
    const into = kinds.has(SPECIAL_KINDS.CLOUD) ? SPECIAL_KINDS.CLOUD : SPECIAL_KINDS.SUN;
    const common = mostCommonEmojiType();
    const transforms = [];
    const triggers = [];
    let toggle = 0;
    if (common != null) {
      forEachCell((r, c, t) => {
        if (t && t.kind === SPECIAL_KINDS.NORMAL && t.emojiType === common) {
          transforms.push({
            cell: { r, c },
            kind: into,
            cloudAxis: into === SPECIAL_KINDS.CLOUD ? (toggle++ % 2 ? "col" : "row") : undefined,
          });
          triggers.push({ r, c });
        }
      });
    }
    transforms.push(
      { cell: a, kind: into, cloudAxis: "row" },
      { cell: b, kind: into, cloudAxis: "col" },
    );
    triggers.push(a, b);
    return {
      cells: [],
      reason: CLEAR_REASON.COMBINE,
      transforms,
      triggerAfterTransform: uniqCells(triggers),
    };
  }

  /* Fallback: activate both independently */
  const ca = activateSpecial(a, ta, tb);
  const cb = activateSpecial(b, tb, ta);
  return { cells: uniqCells([...ca.cells, ...cb.cells]), reason: CLEAR_REASON.COMBINE };
}

/**
 * Resolve effect of swapping a and b (may include 0, 1, or 2 specials).
 * @returns {object|null} clear plan
 */
function resolveSpecial(a, b) {
  const ta = get(a.r, a.c);
  const tb = get(b.r, b.c);
  if (!ta || !tb) return null;
  const aSpec = isSpecialTile(ta);
  const bSpec = isSpecialTile(tb);
  if (aSpec && bSpec) return combineSpecials(a, ta, b, tb);
  if (aSpec) return activateSpecial(a, ta, tb);
  if (bSpec) return activateSpecial(b, tb, ta);
  return null;
}

/** Expand specials placed on board into their blast cells (for chained triggers) */
function expandSpecialTriggers(triggers) {
  const cells = [];
  for (const cell of triggers) {
    const t = get(cell.r, cell.c);
    if (!t) continue;
    if (t.kind === SPECIAL_KINDS.CLOUD) {
      const axis = t.cloudAxis || "row";
      cells.push(...(axis === "row" ? rowCells(cell.r) : colCells(cell.c)));
    } else if (t.kind === SPECIAL_KINDS.SUN) {
      cells.push(...sunshineCross(cell));
    } else {
      cells.push(cell);
    }
  }
  return uniqCells(cells);
}

/* -------------------------------------------------------------------------- */
/* Scoring, meters, HUD helpers                                                */
/* -------------------------------------------------------------------------- */

function addScore(delta) {
  score += delta;
  roundStats.score = score;
  const sc = $("score");
  if (sc) sc.textContent = String(score);
  syncWalletHud();
}

function addBlitzMeter(amount) {
  if (blitzOn) return;
  blitz = Math.min(100, blitz + amount * ENGINE_FILL * BLITZ_FILL_MULT);
  const fill = $("blitzBar");
  const top = $("boardTopBar");
  if (fill) fill.style.width = blitz + "%";
  if (top) top.style.width = blitz + "%";
}

function setHeroCharge(value) {
  charge = Math.max(0, Math.min(100, value));
  const ring = $("heroRing");
  const fill = $("heroPowerFill");
  const btn = $("heroBtn");
  if (ring) ring.style.setProperty("--p", charge + "%");
  if (fill) fill.style.width = charge + "%";
  const ready = charge >= 100 && (state === "Playing" || state === "Blitz") && !resolving && !paused;
  if (btn) {
    btn.disabled = !ready;
    btn.classList.toggle("ready", ready);
  }
}

function syncWalletHud() {
  const c = $("hudCoins");
  const g = $("hudGems");
  const c2 = $("coins");
  if (c) c.textContent = String(save.coins | 0);
  if (g) g.textContent = String(save.gems | 0);
  if (c2) c2.textContent = String(Math.floor(score / 50));
}

function updateHud() {
  const sc = $("score");
  if (sc) sc.textContent = String(score);
  syncWalletHud();

  const t = blitzOn ? blitzLeft : timeLeft;
  const sec = Math.max(0, Math.ceil(t));
  const tim = $("timer");
  if (tim) {
    tim.textContent = ":" + String(sec).padStart(2, "0");
    tim.classList.toggle("warn", !blitzOn && timeLeft <= 10);
  }

  const pct = blitzOn ? (blitzLeft / BLITZ_SEC) * 100 : blitz;
  const fill = $("blitzBar");
  const top = $("boardTopBar");
  if (fill) fill.style.width = pct + "%";
  if (top) {
    top.style.width = (blitzOn ? pct : Math.min(100, ((ROUND - timeLeft) / ROUND) * 100)) + "%";
  }
  setHeroCharge(charge);
}

/* -------------------------------------------------------------------------- */
/* Clear pipeline — clearCells / gravity / applyMatch / applyPlan              */
/* -------------------------------------------------------------------------- */

/**
 * Remove tiles at cells, award score, update meters, play FX.
 */
async function clearCells(cells, reason, depth) {
  if (!cells || !cells.length) return 0;

  /* Snapshot tiles before nulling grid for scoring */
  const snapshots = cells.map((cell) => ({
    cell,
    tile: get(cell.r, cell.c),
  })).filter((x) => x.tile);

  if (!snapshots.length) return 0;

  let heroClears = 0;
  const uids = [];

  for (const { cell, tile } of snapshots) {
    if (tile.kind === SPECIAL_KINDS.NORMAL && tile.emojiType === hero.id) heroClears++;
    uids.push(tile.uid);
    const el = sprites.get(tile.uid);
    if (el) el.classList.add("pop");
    set(cell.r, cell.c, null);
  }

  roundClears += snapshots.length;
  roundStats.clears += snapshots.length;
  save.clears = (save.clears || 0) + snapshots.length;

  const delta = computeClearScore(snapshots, reason, depth);
  addScore(delta);
  addBlitzMeter(snapshots.length);

  const bonus = hero.chargeBonus || 0;
  setHeroCharge(charge + heroClears * (ENGINE_CHARGE + bonus));
  roundStats.heroClears += heroClears;

  popScoreFx(snapshots.map((s) => s.cell), delta);
  burstFx(snapshots.map((s) => s.cell));
  shakeBoard();

  const loud = [CLEAR_REASON.COMBINE, CLEAR_REASON.STAR, CLEAR_REASON.CLOUD, CLEAR_REASON.SUN].includes(reason);
  sfx(loud ? "special" : "clear");

  idle = false;
  await sleep(ENGINE_ANIM.clear);

  for (const uid of uids) {
    sprites.get(uid)?.remove();
    sprites.delete(uid);
  }
  return delta;
}

/** Drop tiles down each column; spawn new normals at top */
async function gravity() {
  const spawns = [];
  for (let c = 0; c < COLS; c++) {
    const surviving = [];
    for (let r = ROWS - 1; r >= 0; r--) {
      const t = get(r, c);
      if (t) surviving.push(t);
    }
    for (let r = 0; r < ROWS; r++) set(r, c, null);
    let dest = ROWS - 1;
    for (const tile of surviving) set(dest--, c, tile);
    let depth = 1;
    for (let r = dest; r >= 0; r--) {
      const tile = makeNormal();
      set(r, c, tile);
      spawns.push({ tile, r, c, depth: depth++ });
    }
  }
  syncSprites(true);
  for (const s of spawns) ensureSprite(s.tile, s.r, s.c, s.depth);
  await sleep(ENGINE_ANIM.spawn + 70);
}

async function applyPlan(plan, depth) {
  if (plan.transforms && plan.transforms.length) {
    for (const tr of plan.transforms) {
      const old = get(tr.cell.r, tr.cell.c);
      const tile = makeSpecial(tr.kind, tr.cloudAxis);
      if (old) {
        const el = sprites.get(old.uid);
        if (el) {
          sprites.delete(old.uid);
          tile.uid = old.uid;
          sprites.set(tile.uid, el);
        }
      }
      set(tr.cell.r, tr.cell.c, tile);
      ensureSprite(tile, tr.cell.r, tr.cell.c);
    }
    await sleep(ENGINE_ANIM.transform);
  }

  let cells = plan.cells || [];
  if (plan.triggerAfterTransform && plan.triggerAfterTransform.length) {
    cells = expandSpecialTriggers(plan.triggerAfterTransform);
    roundStats.specialsTriggered += plan.triggerAfterTransform.length;
  }

  await clearCells(cells, plan.reason || CLEAR_REASON.MATCH, depth);
  await gravity();
}

async function applyMatch(match, depth) {
  const cells = (match && match.clearCells) ? match.clearCells : [];
  const spawns = (match && match.specialSpawns) ? match.specialSpawns : [];

  await clearCells(cells, depth > 0 ? CLEAR_REASON.CASCADE : CLEAR_REASON.MATCH, depth);

  for (const spawn of spawns) {
    if (!spawn || !spawn.cell) continue;
    const old = get(spawn.cell.r, spawn.cell.c);
    if (old) {
      sprites.get(old.uid)?.remove();
      sprites.delete(old.uid);
    }
    /* Prefer swap axis for cloud orientation when available */
    let axis = spawn.cloudAxis;
    if (spawn.kind === SPECIAL_KINDS.CLOUD && lastSwapAxis) axis = lastSwapAxis;
    const tile = makeSpecial(spawn.kind, axis);
    set(spawn.cell.r, spawn.cell.c, tile);
    ensureSprite(tile, spawn.cell.r, spawn.cell.c);
    sfx("special");
  }

  if (spawns.length) await sleep(ENGINE_ANIM.special);
  await gravity();
}

/**
 * Main cascade resolver — processes initial match or plan, then chains.
 * @param {{type:"match",match?:object}|{type:"plan",plan?:object}|null} initial
 */
async function cascadeFrom(initial) {
  resolving = true;
  const prev = state;
  state = "Resolving";

  try {
    if (!initial) return;

    if (initial.type === "plan") {
      await applyPlan(initial.plan || { cells: [], reason: CLEAR_REASON.MATCH }, 0);
    } else {
      await applyMatch(initial.match || { clearCells: [], specialSpawns: [], groups: [] }, 0);
    }

    let depth = 1;
    while (depth <= MAX_CASCADE_DEPTH) {
      const match = findMatches();
      if (!match || !match.groups || !match.groups.length) break;
      showComboBanner(depth);
      await applyMatch(match, depth);
      depth++;
    }
  } catch (err) {
    console.error("cascadeFrom", err);
    try { syncSprites(false); } catch (_) { /* ignore */ }
  } finally {
    resolving = false;
  }

  if (blitzOn) state = "Blitz";
  else if (timeLeft <= 0) {
    offerReviveOrFinish();
    return;
  } else {
    state = prev === "Blitz" ? "Blitz" : "Playing";
  }

  if (!blitzOn && blitz >= 100) enterBlitz();
  updateHud();
}

/* -------------------------------------------------------------------------- */
/* Board generation — fillBoard / avoid auto-match                               */
/* -------------------------------------------------------------------------- */

/**
 * Pick a normal tile type that won't create an immediate 3-in-a-row at (r,c).
 */
function avoidImmediateMatch(r, c) {
  const forbidden = new Set();
  if (c >= 2) {
    const a = get(r, c - 1);
    const b = get(r, c - 2);
    if (a && b && a.kind === SPECIAL_KINDS.NORMAL && b.kind === SPECIAL_KINDS.NORMAL && a.emojiType === b.emojiType) {
      forbidden.add(a.emojiType);
    }
  }
  if (r >= 2) {
    const a = get(r - 1, c);
    const b = get(r - 2, c);
    if (a && b && a.kind === SPECIAL_KINDS.NORMAL && b.kind === SPECIAL_KINDS.NORMAL && a.emojiType === b.emojiType) {
      forbidden.add(a.emojiType);
    }
  }
  const opts = pool.filter((t) => !forbidden.has(t));
  const pick = opts.length ? opts : pool;
  return makeNormal(pick[Math.floor(rng() * pick.length)]);
}

/** Build a fresh 7×7 with no starting matches */
function fillBoard() {
  if (!resolveDomRefs()) return;
  grid = new Array(ROWS * COLS).fill(null);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      set(r, c, avoidImmediateMatch(r, c));
    }
  }
  let guard = 0;
  while (guard++ < 24 && findMatches().groups.length) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        set(r, c, avoidImmediateMatch(r, c));
      }
    }
  }
  boardEl.innerHTML = "";
  fxEl.innerHTML = "";
  sprites.clear();
  forEachCell((r, c, t) => ensureSprite(t, r, c));
}

/* -------------------------------------------------------------------------- */
/* Blitz mode                                                                  */
/* -------------------------------------------------------------------------- */

function enterBlitz() {
  blitzOn = true;
  blitz = 100;
  blitzLeft = BLITZ_SEC;
  timePaused = true;
  state = "Blitz";
  document.body.classList.add("blitz");
  save.blitzes = (save.blitzes || 0) + 1;
  roundBlitzes++;
  roundStats.blitzes++;
  sfx("blitz");
  toast("BLITZ MODE! ×" + ENGINE_MULT + " score!");

  const candidates = basePool.filter((t) => t !== hero.id);
  const removed = candidates[Math.floor(rng() * candidates.length)];
  pool = basePool.filter((t) => t !== removed).slice(0, BLITZ_POOL);
  updateHud();
}

function exitBlitz() {
  blitzOn = false;
  blitz = 0;
  blitzLeft = 0;
  pool = [...basePool];
  document.body.classList.remove("blitz");
  if (pauseLeft <= 0) timePaused = false;
  state = timeLeft <= 0 ? "RoundEnd" : "Playing";
  updateHud();
  if (state === "RoundEnd") offerReviveOrFinish();
}

/* -------------------------------------------------------------------------- */
/* Hero powers — firePower                                                     */
/* -------------------------------------------------------------------------- */

async function firePower() {
  if (charge < 100 || resolving || paused) return;
  if (state !== "Playing" && state !== "Blitz") return;

  try {
    setHeroCharge(0);
    idle = false;
    sfx("power");
    toast(hero.name + "!");
    roundPowers++;
    roundStats.powers++;
    save.stats = save.stats || {};
    save.stats.powers = (save.stats.powers || 0) + 1;

    const handler = SPELL_HANDLERS[hero.spell];
    if (handler) await handler();
    else console.warn("[EmojiRush] Unknown spell:", hero.spell);
  } catch (err) {
    console.error("firePower", err);
    resolving = false;
  }
}

/* -------------------------------------------------------------------------- */
/* Swap handling — trySwap                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Attempt orthogonal swap. Valid only if creates match or activates special.
 * Sets resolving lock immediately to prevent gesture races.
 */
async function trySwap(a, b) {
  if (resolving || paused) return;
  if (state !== "Playing" && state !== "Blitz") return;
  if (!isOrtho(a, b)) return;

  resolving = true;
  idle = false;
  selected = null;
  syncSprites();

  /* Infer cloud axis from swipe direction: horizontal swap → row clear */
  lastSwapAxis = (a.r === b.r) ? "row" : "col";

  try {
    const ta = get(a.r, a.c);
    const tb = get(b.r, b.c);
    if (!ta || !tb) {
      resolving = false;
      return;
    }

    const ea = sprites.get(ta.uid);
    const eb = sprites.get(tb.uid);
    const pa = pos(a.r, a.c);
    const pb = pos(b.r, b.c);

    if (ea && eb) {
      const tr = `left ${ENGINE_ANIM.swap}ms ease, top ${ENGINE_ANIM.swap}ms ease`;
      ea.style.transition = tr;
      eb.style.transition = tr;
      ea.style.left = pb.x + "px";
      ea.style.top = pb.y + "px";
      eb.style.left = pa.x + "px";
      eb.style.top = pa.y + "px";
    }

    sfx("swap");
    await sleep(ENGINE_ANIM.swap);
    swapCells(a, b);

    const plan = resolveSpecial(a, b);
    if (plan) {
      roundStats.specialsTriggered++;
      await cascadeFrom({ type: "plan", plan });
      return;
    }

    const match = findMatches();
    if (!match.groups.length) {
      /* Invalid swap — animate reject */
      swapCells(a, b);
      sfx("reject");
      if (ea && eb) {
        const tr = `left ${ENGINE_ANIM.reject}ms ease, top ${ENGINE_ANIM.reject}ms ease`;
        ea.style.transition = tr;
        eb.style.transition = tr;
        ea.style.left = pa.x + "px";
        ea.style.top = pa.y + "px";
        eb.style.left = pb.x + "px";
        eb.style.top = pb.y + "px";
      }
      await sleep(ENGINE_ANIM.reject);
      syncSprites();
      resolving = false;
      return;
    }

    syncSprites();
    await cascadeFrom({ type: "match", match });
  } catch (err) {
    console.error("trySwap", err);
    resolving = false;
    try { syncSprites(false); } catch (_) { /* ignore */ }
    if (state === "Resolving") state = "Playing";
  }
}

/* -------------------------------------------------------------------------- */
/* Pointer input                                                               */
/* -------------------------------------------------------------------------- */

let boardInputBound = false;
function bindBoardInput() {
  if (!boardEl) return;
  if (boardInputBound) return;
  boardInputBound = true;

  boardEl.addEventListener("pointerdown", (e) => {
    if (paused) return;
    try { boardEl.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    pointerDown = hitCell(e.clientX, e.clientY);
    pointerLocked = false;
    if (!pointerDown) return;

    if (selected && isOrtho(selected, pointerDown)) {
      const a = selected;
      const b = pointerDown;
      selected = null;
      pointerDown = null;
      safeRun(trySwap(a, b), "trySwap");
      return;
    }
    selected = pointerDown;
    syncSprites();
    sfx("tap");
  });

  boardEl.addEventListener("pointermove", (e) => {
    if (!pointerDown || pointerLocked || resolving || paused) return;
    const rect = boardEl.getBoundingClientRect();
    const s = cellPx();
    const g = readGapPx();
    const cx = rect.left + pointerDown.c * (s + g) + s / 2;
    const cy = rect.top + pointerDown.r * (s + g) + s / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const thresh = s * 0.3;
    if (Math.abs(dx) < thresh && Math.abs(dy) < thresh) return;

    const target = Math.abs(dx) > Math.abs(dy)
      ? { r: pointerDown.r, c: pointerDown.c + (dx > 0 ? 1 : -1) }
      : { r: pointerDown.r + (dy > 0 ? 1 : -1), c: pointerDown.c };

    if (target.r < 0 || target.c < 0 || target.r >= ROWS || target.c >= COLS) return;

    pointerLocked = true;
    const a = pointerDown;
    pointerDown = null;
    selected = null;
    safeRun(trySwap(a, target), "trySwap");
  });

  boardEl.addEventListener("pointerup", () => {
    pointerDown = null;
    pointerLocked = false;
  });

  boardEl.addEventListener("pointercancel", () => {
    pointerDown = null;
    pointerLocked = false;
  });
}

function bindHeroButton() {
  const btn = $("heroBtn");
  if (btn) btn.onclick = () => safeRun(firePower(), "firePower");
}

/* -------------------------------------------------------------------------- */
/* Game loop tick                                                              */
/* -------------------------------------------------------------------------- */

function tick(ts) {
  if (state === "RoundEnd" || state === "idle") return;

  if (paused) {
    lastTs = ts;
    requestAnimationFrame(tick);
    return;
  }

  const dt = Math.min(0.05, (ts - lastTs) / 1000);
  lastTs = ts;

  if (state === "Playing") {
    if (idle && !resolving && blitz > 0) {
      blitz = Math.max(0, blitz - ENGINE_DECAY * dt);
    }
    idle = true;

    if (!timePaused) {
      timeLeft = Math.max(0, timeLeft - dt);
      if (timeLeft <= 0 && !resolving) {
        updateHud();
        offerReviveOrFinish();
        return;
      }
    } else if (pauseLeft > 0) {
      pauseLeft = Math.max(0, pauseLeft - dt);
      if (pauseLeft <= 0 && !blitzOn) timePaused = false;
    }

    if (!blitzOn && blitz >= 100 && !resolving) enterBlitz();
  } else if (state === "Blitz") {
    blitzLeft -= dt;
    if (blitzLeft <= 0) {
      if (resolving) blitzLeft = 0.001;
      else exitBlitz();
    }
  } else if (state === "Resolving" && blitzOn) {
    if (blitzLeft > 0) blitzLeft -= dt;
  }

  updateHud();
  requestAnimationFrame(tick);
}

/* -------------------------------------------------------------------------- */
/* Round lifecycle                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Start a new 60-second round with the given hero.
 * Consumes a life and optional equipped booster from save.
 */
function beginRound(character) {
  ensureLivesState();
  if (!consumeLifeOnStart()) return;

  hero = character || CHARACTERS.find((c) => c.id === save.selected) || CHARACTERS[0];
  rng = createRng((Date.now() ^ (Math.random() * 1e9)) >>> 0);

  basePool = [
    hero.id,
    ...CHARACTERS
      .filter((c) => c.id !== hero.id)
      .sort(() => rng() - 0.5)
      .slice(0, POOL_N - 1)
      .map((c) => c.id),
  ];
  pool = [...basePool];

  score = 0;
  blitz = 0;
  blitzOn = false;
  blitzLeft = 0;
  charge = 0;
  bestCombo = 0;
  roundClears = 0;
  roundBlitzes = 0;
  roundPowers = 0;
  roundCoinsEarned = 0;
  revived = false;
  pendingFinish = false;
  scoreMult = 1;
  coinMult = 1;
  activeBooster = null;

  Object.assign(roundStats, {
    score: 0, clears: 0, powers: 0, blitzes: 0,
    cloudsMade: 0, sunsMade: 0, starsMade: 0,
    combos: 0, specialsTriggered: 0, heroClears: 0, maxCombo: 0,
  });

  timeLeft = ROUND;
  timePaused = false;
  pauseLeft = 0;
  paused = false;
  idle = true;
  selected = null;
  nextUid = 1;
  resolving = false;
  state = "Playing";

  document.body.classList.remove("blitz");
  const pauseModal = $("pauseModal");
  const reviveModal = $("reviveModal");
  if (pauseModal) pauseModal.classList.remove("show");
  if (reviveModal) reviveModal.classList.remove("show");

  if (save.equippedBooster && (save.boosters[save.equippedBooster] || 0) > 0) {
    activeBooster = save.equippedBooster;
    save.boosters[activeBooster]--;
    if (activeBooster === "score2") scoreMult = 2;
    if (activeBooster === "time10") timeLeft = ROUND + 10;
    if (activeBooster === "blitz50") blitz = 50;
    if (activeBooster === "magnet") coinMult = 1.5;
    save.equippedBooster = null;
    writeSave();
    const b = (typeof BOOSTERS !== "undefined") ? BOOSTERS.find((x) => x.id === activeBooster) : null;
    toast("Booster: " + (b ? b.name : activeBooster));
  }

  const heroGlyph = $("heroGlyph");
  const heroName = $("heroName");
  const heroDesc = $("heroDesc");
  if (heroGlyph) heroGlyph.innerHTML = faceHTML(hero.id);
  if (heroName) heroName.textContent = hero.name;
  if (heroDesc) heroDesc.textContent = hero.desc;

  resolveDomRefs();
  fillBoard();
  bindBoardInput();
  bindHeroButton();
  wireRoundModals();
  showScreen("game");

  updateHud();
  lastTs = performance.now();
  requestAnimationFrame(tick);
}

function offerReviveOrFinish() {
  if (pendingFinish) return;
  if (!revived && score >= REVIVE_SCORE_MIN && save.coins >= REVIVE_COST) {
    pendingFinish = true;
    paused = true;
    const sub = $("reviveSub");
    if (sub) sub.textContent = `Add +15s for 🪙 ${REVIVE_COST}`;
    const modal = $("reviveModal");
    if (modal) modal.classList.add("show");
    return;
  }
  finishRound();
}

function finishRound() {
  state = "RoundEnd";
  paused = false;
  pendingFinish = false;
  document.body.classList.remove("blitz");
  const pauseModal = $("pauseModal");
  const reviveModal = $("reviveModal");
  if (pauseModal) pauseModal.classList.remove("show");
  if (reviveModal) reviveModal.classList.remove("show");

  let earned = Math.max(5, Math.floor((score / 50) * coinMult));
  roundCoinsEarned = earned;
  save.coins += earned;
  save.games = (save.games || 0) + 1;
  const isBest = score > (save.best || 0);
  if (isBest) save.best = score;
  save.stats = save.stats || {};
  save.stats.bestCombo = Math.max(save.stats.bestCombo || 0, bestCombo);

  roundStats.score = score;

  const xpGain = Math.max(10, Math.floor(score / 40) + roundBlitzes * 8 + Math.floor(bestCombo * 3));
  const passGain = Math.max(8, Math.floor(score / 60) + roundBlitzes * 5);
  grantXP(xpGain);
  grantPassXP(passGain);

  bumpQuest("score", score, true);
  bumpQuest("clears", roundClears);
  bumpQuest("blitz", roundBlitzes);
  bumpQuest("power", roundPowers);
  bumpQuest("combo", bestCombo, true);
  bumpQuest("coins", earned);

  writeSave();
  checkAchievements();

  const stars = score >= 2500 ? 3 : score >= 1200 ? 2 : score >= 400 ? 1 : 0;
  const resStars = $("resStars");
  const resTitle = $("resTitle");
  const resSub = $("resSub");
  const resScore = $("resScore");
  const resCoins = $("resCoins");
  const resBest = $("resBest");
  const resCombo = $("resCombo");
  const resXpLab = $("resXpLab");
  const resXpBar = $("resXpBar");
  const resPassLab = $("resPassLab");
  const resPassBar = $("resPassBar");
  const resQuestNote = $("resQuestNote");

  if (resStars) resStars.textContent = ["☆☆☆", "★☆☆", "★★☆", "★★★"][stars];
  if (resTitle) resTitle.textContent = isBest ? "New Best!" : stars === 3 ? "Legendary!" : stars === 2 ? "Great Run!" : "Nice!";
  if (resSub) resSub.textContent = `+${earned} coins · +${xpGain} XP · +${passGain}★ pass`;
  if (resScore) resScore.textContent = String(score);
  if (resCoins) resCoins.textContent = "+" + earned;
  if (resBest) resBest.textContent = String(save.best);
  if (resCombo) resCombo.textContent = String(bestCombo);

  const need = XP_PER_LEVEL(save.level);
  if (resXpLab) resXpLab.textContent = `XP +${xpGain} · Lv ${save.level}`;
  if (resXpBar) {
    resXpBar.style.width = "0%";
    requestAnimationFrame(() => {
      resXpBar.style.width = Math.min(100, (save.xp / need) * 100) + "%";
    });
  }

  const into = save.pass.xp % PASS_XP_PER_TIER;
  if (resPassLab) resPassLab.textContent = `Pass +${passGain}★ · Tier ${passTier()}`;
  if (resPassBar) {
    resPassBar.style.width = "0%";
    requestAnimationFrame(() => {
      resPassBar.style.width = (into / PASS_XP_PER_TIER) * 100 + "%";
    });
  }

  if (resQuestNote) {
    const qDone = (save.quests && save.quests.list)
      ? save.quests.list.filter((q) => q.progress >= q.target && !q.claimed).length
      : 0;
    resQuestNote.textContent = qDone ? `${qDone} quest ready to claim!` : "Keep chasing daily quests.";
  }

  sfx(isBest || stars >= 2 ? "unlock" : "coin");
  showScreen("result");
  refreshMenu();
}

/* -------------------------------------------------------------------------- */
/* Board analysis — validation, hints, shuffle                                   */
/* -------------------------------------------------------------------------- */

/** Return true if any immediate match exists on board (should be false after fill) */
function boardHasMatches() {
  return findMatches().groups.length > 0;
}

/** Serialize tile at cell for logging */
function describeTile(r, c) {
  const t = get(r, c);
  if (!t) return "empty";
  if (t.kind !== SPECIAL_KINDS.NORMAL) return t.kind + (t.cloudAxis ? ":" + t.cloudAxis : "");
  const ch = CHARACTERS.find((x) => x.id === t.emojiType);
  return (ch ? ch.name : "type" + t.emojiType);
}

/** Dump ASCII board to console (debug) */
function debugPrintBoard() {
  const lines = [];
  for (let r = 0; r < ROWS; r++) {
    let row = "";
    for (let c = 0; c < COLS; c++) {
      const t = get(r, c);
      if (!t) row += ". ";
      else if (t.kind !== SPECIAL_KINDS.NORMAL) row += t.kind[0] + " ";
      else row += String(t.emojiType % 10) + " ";
    }
    lines.push(row);
  }
  console.log(lines.join("\n"));
}

/**
 * Simulate swap without mutating grid — returns match plan or null.
 * Used for hint finder and valid-move detection.
 */
function previewSwap(a, b) {
  if (!isOrtho(a, b)) return null;
  const ta = get(a.r, a.c);
  const tb = get(b.r, b.c);
  if (!ta || !tb) return null;
  swapCells(a, b);
  const plan = resolveSpecial(a, b);
  let result = null;
  if (plan) {
    result = { type: "plan", plan };
  } else {
    const match = findMatches();
    if (match.groups.length) result = { type: "match", match };
  }
  swapCells(a, b);
  return result;
}

/** Find first valid swap on board (for hint UI / stalemate recovery) */
function findValidMove() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const here = { r, c };
      const right = { r, c: c + 1 };
      const down = { r: r + 1, c };
      if (c + 1 < COLS && previewSwap(here, right)) return { a: here, b: right };
      if (r + 1 < ROWS && previewSwap(here, down)) return { a: here, b: down };
    }
  }
  return null;
}

function hasValidMoves() {
  return findValidMove() != null;
}

/**
 * Shuffle normals in place when no moves exist (rare). Preserves specials.
 * Called only from debug or future stalemate handler.
 */
async function shuffleBoard() {
  if (resolving) return false;
  resolving = true;
  try {
    const normals = [];
    const positions = [];
    forEachCell((r, c, t) => {
      if (t && t.kind === SPECIAL_KINDS.NORMAL) {
        normals.push(t.emojiType);
        positions.push({ r, c });
      }
    });
    for (let i = normals.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = normals[i];
      normals[i] = normals[j];
      normals[j] = tmp;
    }
    positions.forEach((pos, i) => {
      const tile = get(pos.r, pos.c);
      if (tile) tile.emojiType = normals[i];
    });
    let guard = 0;
    while ((!hasValidMoves() || boardHasMatches()) && guard++ < 30) {
      for (let i = normals.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const tmp = normals[i];
        normals[i] = normals[j];
        normals[j] = tmp;
      }
      positions.forEach((pos, i) => {
        const tile = get(pos.r, pos.c);
        if (tile) tile.emojiType = normals[i];
      });
    }
    syncSprites(true);
    await sleep(ENGINE_ANIM.spawn);
    return true;
  } finally {
    resolving = false;
  }
}

/** Active pool emoji ids with hero always first */
function getActivePool() {
  return [...pool];
}

/** Character names currently on the spawn table */
function getPoolLabels() {
  return pool.map((id) => {
    const ch = CHARACTERS.find((c) => c.id === id);
    return ch ? ch.name : String(id);
  });
}

/** Mission-friendly export at round end or mid-round snapshot */
function exportRoundSummary() {
  return {
    score,
    clears: roundStats.clears,
    powers: roundStats.powers,
    blitzes: roundStats.blitzes,
    cloudsMade: roundStats.cloudsMade,
    sunsMade: roundStats.sunsMade,
    starsMade: roundStats.starsMade,
    combos: roundStats.combos,
    maxCombo: roundStats.maxCombo,
    heroClears: roundStats.heroClears,
    specialsTriggered: roundStats.specialsTriggered,
    coinsEarned: roundCoinsEarned,
    heroId: hero.id,
    heroName: hero.name,
    blitzActive: blitzOn,
    timeLeft,
    charge,
  };
}

/** Reset transient engine fields without touching save */
function resetEngineState() {
  state = "idle";
  resolving = false;
  paused = false;
  pendingFinish = false;
  selected = null;
  pointerDown = null;
  pointerLocked = false;
  grid = [];
  sprites.clear();
  blitzOn = false;
  document.body.classList.remove("blitz");
}

/**
 * Wire pause / revive / quit buttons if present in DOM.
 * Safe to call multiple times; outer shell may also bind these.
 */
function wireRoundModals() {
  const btnPause = $("btnPause");
  const btnResume = $("btnResume");
  const btnQuit = $("btnQuit");
  const btnRevive = $("btnRevive");
  const btnSkipRevive = $("btnSkipRevive");

  if (btnPause && !btnPause.dataset.engineBound) {
    btnPause.dataset.engineBound = "1";
    btnPause.onclick = () => {
      if (state !== "Playing" && state !== "Blitz" && state !== "Resolving") return;
      paused = true;
      $("pauseModal")?.classList.add("show");
      sfx("tap");
    };
  }

  if (btnResume && !btnResume.dataset.engineBound) {
    btnResume.dataset.engineBound = "1";
    btnResume.onclick = () => {
      paused = false;
      $("pauseModal")?.classList.remove("show");
      lastTs = performance.now();
      sfx("tap");
    };
  }

  if (btnQuit && !btnQuit.dataset.engineBound) {
    btnQuit.dataset.engineBound = "1";
    btnQuit.onclick = () => {
      paused = false;
      state = "idle";
      resolving = false;
      pendingFinish = false;
      document.body.classList.remove("blitz");
      $("pauseModal")?.classList.remove("show");
      $("reviveModal")?.classList.remove("show");
      if (typeof stopMusic === "function") stopMusic();
      refreshMenu();
      showScreen("menu");
      sfx("tap");
    };
  }

  if (btnRevive && !btnRevive.dataset.engineBound) {
    btnRevive.dataset.engineBound = "1";
    btnRevive.onclick = () => {
      if (save.coins < REVIVE_COST) { toast("Need more coins"); return; }
      save.coins -= REVIVE_COST;
      writeSave();
      revived = true;
      pendingFinish = false;
      paused = false;
      timeLeft = 15;
      timePaused = false;
      $("reviveModal")?.classList.remove("show");
      state = "Playing";
      lastTs = performance.now();
      sfx("power");
      toast("+15 seconds!");
      requestAnimationFrame(tick);
    };
  }

  if (btnSkipRevive && !btnSkipRevive.dataset.engineBound) {
    btnSkipRevive.dataset.engineBound = "1";
    btnSkipRevive.onclick = () => {
      $("reviveModal")?.classList.remove("show");
      pendingFinish = false;
      finishRound();
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Spell registry — maps spell id → executor (extensible)                        */
/* -------------------------------------------------------------------------- */

const SPELL_HANDLERS = {
  time_pause: async () => {
    if (!blitzOn) {
      timePaused = true;
      pauseLeft = hero.pauseSec || 3;
      toast("Time frozen!");
    }
    updateHud();
  },

  guaranteed_stars: async () => {
    const n = hero.starCount || 2;
    const normals = [];
    forEachCell((r, c, t) => {
      if (t && t.kind === SPECIAL_KINDS.NORMAL) normals.push({ r, c });
    });
    for (let i = 0; i < n && normals.length; i++) {
      const cell = normals.splice(Math.floor(rng() * normals.length), 1)[0];
      const old = get(cell.r, cell.c);
      if (old) { sprites.get(old.uid)?.remove(); sprites.delete(old.uid); }
      const tile = makeSpecial(SPECIAL_KINDS.STAR);
      set(cell.r, cell.c, tile);
      ensureSprite(tile, cell.r, cell.c);
      trackSpecialCreated(SPECIAL_KINDS.STAR);
    }
  },

  sun_storm: async () => {
    const normals = [];
    for (let r = 1; r < ROWS - 1; r++) {
      for (let c = 1; c < COLS - 1; c++) {
        if (get(r, c)?.kind === SPECIAL_KINDS.NORMAL) normals.push({ r, c });
      }
    }
    const triggers = [];
    for (let i = 0; i < 2 && normals.length; i++) {
      const cell = normals.splice(Math.floor(rng() * normals.length), 1)[0];
      const old = get(cell.r, cell.c);
      if (old) { sprites.get(old.uid)?.remove(); sprites.delete(old.uid); }
      const tile = makeSpecial(SPECIAL_KINDS.SUN);
      set(cell.r, cell.c, tile);
      ensureSprite(tile, cell.r, cell.c);
      trackSpecialCreated(SPECIAL_KINDS.SUN);
      triggers.push(cell);
    }
    await sleep(100);
    await cascadeFrom({
      type: "plan",
      plan: { cells: expandSpecialTriggers(triggers), reason: CLEAR_REASON.CHARACTER },
    });
  },

  color_bomb: async () => {
    const common = mostCommonEmojiType();
    if (common == null) return;
    const cells = [];
    forEachCell((r, c, t) => {
      if (t && t.kind === SPECIAL_KINDS.NORMAL && t.emojiType === common) cells.push({ r, c });
    });
    await cascadeFrom({
      type: "plan",
      plan: { cells: uniqCells(cells), reason: CLEAR_REASON.CHARACTER },
    });
  },

  pattern_x: async () => {
    const cells = [];
    for (let i = 0; i < ROWS; i++) {
      cells.push({ r: i, c: i }, { r: i, c: COLS - 1 - i });
    }
    await cascadeFrom({
      type: "plan",
      plan: { cells: uniqCells(cells), reason: CLEAR_REASON.CHARACTER },
    });
  },

  column_crush: async () => {
    const cols = [0, 1, 2, 3, 4, 5, 6];
    const n = hero.crushCount || 2;
    const chosen = [];
    for (let i = 0; i < n && cols.length; i++) {
      chosen.push(cols.splice(Math.floor(rng() * cols.length), 1)[0]);
    }
    const cells = [];
    for (const c of chosen) {
      for (let r = 0; r < ROWS; r++) cells.push({ r, c });
    }
    await cascadeFrom({
      type: "plan",
      plan: { cells: uniqCells(cells), reason: CLEAR_REASON.CHARACTER },
    });
  },

  row_sweep: async () => {
    const n = hero.crushCount || 3;
    const rows = [0, 1, 2, 3, 4, 5, 6];
    const chosen = [];
    for (let i = 0; i < n && rows.length; i++) {
      chosen.push(rows.splice(Math.floor(rng() * rows.length), 1)[0]);
    }
    const cells = [];
    for (const r of chosen) {
      for (let c = 0; c < COLS; c++) cells.push({ r, c });
    }
    await cascadeFrom({
      type: "plan",
      plan: { cells: uniqCells(cells), reason: CLEAR_REASON.CHARACTER },
    });
  },

  board_pulse: async () => {
    const cells = [];
    forEachCell((r, c) => {
      const edge = r === 0 || c === 0 || r === ROWS - 1 || c === COLS - 1;
      const ring2 = hero.doubleRing && (r === 1 || c === 1 || r === ROWS - 2 || c === COLS - 2);
      if (edge || ring2) cells.push({ r, c });
    });
    await cascadeFrom({
      type: "plan",
      plan: { cells: uniqCells(cells), reason: CLEAR_REASON.CHARACTER },
    });
  },
};

/* -------------------------------------------------------------------------- */
/* Debug API — window.RUSH                                                     */
/* -------------------------------------------------------------------------- */

window.RUSH = Object.assign(window.RUSH || {}, {
  /** @returns {object} live save reference */
  save: () => save,

  /** @returns {object} current round stats snapshot */
  roundStats: () => ({ ...roundStats }),

  /** @returns {object[]} current grid tiles (serialized) */
  grid: () => grid.map((t) => (t ? cloneTileVisual(t) : null)),

  /** @returns {string} state machine label */
  state: () => state,

  /** Force-fill blitz meter */
  fillBlitz: () => { blitz = 100; updateHud(); },

  /** Force hero charge */
  fillPower: () => { setHeroCharge(100); },
  setCharge: (v) => { setHeroCharge(v); },

  /** Grant lives (debug) */
  grantLives: (n) => {
    ensureLivesState();
    save.lives = Math.min(MAX_LIVES, (save.lives || 0) + (n | 0));
    writeSave();
  },

  livesRegenRemainingMs,
  formatLivesRegen,
  tickLivesRegen,

  /** Exposed engine fns for automated tests */
  findMatches,
  resolveSpecial,
  cascadeFrom,
  fillBoard,
  trySwap,
  beginRound,
  firePower,
  finishRound,
  updateHud,
  exportRoundSummary,
  findValidMove,
  hasValidMoves,
  shuffleBoard,
  previewSwap,
  debugPrintBoard,
  getActivePool,
  getPoolLabels,
  resetEngineState,
  getEmojiLevel,
  scoreValueForEmoji,
  consumeLifeOnStart,
  ensureLivesState,

  grantCoins: (n) => { if (typeof grantCoins === "function") grantCoins(n | 0); },
  grantXP: (n) => { if (typeof grantXP === "function") { grantXP(n | 0); refreshMenu(); } },
  grantGems: (n) => { if (typeof grantGems === "function") grantGems(n | 0); },
  grantPassXP: (n) => { if (typeof grantPassXP === "function") { grantPassXP(n | 0); refreshMenu(); } },
  openScreen: (name) => { if (typeof openScreen === "function") openScreen(name); },
});

/* -------------------------------------------------------------------------- */
/* Engine init hook (optional — call from outer boot if needed)                */
/* -------------------------------------------------------------------------- */
ensureLivesState();


/* =============================================================================
 * APPENDIX A — Match-3 design notes (engine reference)
 * =============================================================================
 *
 * A1. Valid swap rule
 *     Swaps that neither create a match of 3+ nor involve a special activation
 *     are rejected with a bounce animation. This prevents random board churn.
 *
 * A2. Special spawn cell
 *     When multiple runs merge (T/L), the junction tile becomes Sunshine.
 *     For pure lines, the median cell of the matched run receives the special.
 *
 * A3. LightningCloud axis
 *     Horizontal player swipe → cloudAxis "row" → clears entire row on activate.
 *     Vertical player swipe   → cloudAxis "col" → clears entire column.
 *     Line-created clouds inherit line orientation when no swipe context exists.
 *
 * A4. Sunshine vs 3×3
 *     Sunshine is NOT an area blast. It is a full row plus full column through
 *     the sunshine tile (intersection cleared once). This matches Emoji Blitz Sun.
 *
 * A5. RainbowStar
 *     Swap star with a normal emoji to delete all tiles of that emoji type.
 *     Swapping star with star clears the board.
 *
 * A6. Cascade depth cap
 *     MAX_CASCADE_DEPTH prevents infinite loops from board generation bugs.
 *
 * A7. Race safety
 *     `resolving` is set synchronously at trySwap entry before any await.
 *     Pointer handlers bail when resolving is true. Promises use safeRun().
 *
 * A8. Blitz decay
 *     When idle (no clears), blitz meter drains at ENGINE_DECAY per second until
 *     player makes matches again or hits 100% to enter Blitz mode.
 *
 * A9. Emoji levels
 *     save.levels[charId] drives per-tile score via scoreValueForEmoji().
 *     Meta layer should increment levels when player upgrades collection.
 *
 * A10. Lives
 *     consumeLifeOnStart() on beginRound; tickLivesRegen() on hub refresh.
 *     save.unlimitedLives bypasses consumption for debug / VIP hooks.
 */

/* Spell slot 00 — see CHARACTERS[0].spell in outer data bundle.
 * Engine handles: pattern_x, column_crush, row_sweep, time_pause,
 * guaranteed_stars, sun_storm, color_bomb, board_pulse
 * Extend firePower() switch when adding new spell ids.
 */
/* Spell slot 01 — see CHARACTERS[1].spell in outer data bundle.
 * Engine handles: pattern_x, column_crush, row_sweep, time_pause,
 * guaranteed_stars, sun_storm, color_bomb, board_pulse
 * Extend firePower() switch when adding new spell ids.
 */
/* Spell slot 02 — see CHARACTERS[2].spell in outer data bundle.
 * Engine handles: pattern_x, column_crush, row_sweep, time_pause,
 * guaranteed_stars, sun_storm, color_bomb, board_pulse
 * Extend firePower() switch when adding new spell ids.
 */
/* Spell slot 03 — see CHARACTERS[3].spell in outer data bundle.
 * Engine handles: pattern_x, column_crush, row_sweep, time_pause,
 * guaranteed_stars, sun_storm, color_bomb, board_pulse
 * Extend firePower() switch when adding new spell ids.
 */
/* Spell slot 04 — see CHARACTERS[4].spell in outer data bundle.
 * Engine handles: pattern_x, column_crush, row_sweep, time_pause,
 * guaranteed_stars, sun_storm, color_bomb, board_pulse
 * Extend firePower() switch when adding new spell ids.
 */
/* Spell slot 05 — see CHARACTERS[5].spell in outer data bundle.
 * Engine handles: pattern_x, column_crush, row_sweep, time_pause,
 * guaranteed_stars, sun_storm, color_bomb, board_pulse
 * Extend firePower() switch when adding new spell ids.
 */
/* Spell slot 06 — see CHARACTERS[6].spell in outer data bundle.
 * Engine handles: pattern_x, column_crush, row_sweep, time_pause,
 * guaranteed_stars, sun_storm, color_bomb, board_pulse
 * Extend firePower() switch when adding new spell ids.
 */
/* Spell slot 07 — see CHARACTERS[7].spell in outer data bundle.
 * Engine handles: pattern_x, column_crush, row_sweep, time_pause,
 * guaranteed_stars, sun_storm, color_bomb, board_pulse
 * Extend firePower() switch when adding new spell ids.
 */
/* Spell slot 08 — see CHARACTERS[8].spell in outer data bundle.
 * Engine handles: pattern_x, column_crush, row_sweep, time_pause,
 * guaranteed_stars, sun_storm, color_bomb, board_pulse
 * Extend firePower() switch when adding new spell ids.
 */
/* Spell slot 09 — see CHARACTERS[9].spell in outer data bundle.
 * Engine handles: pattern_x, column_crush, row_sweep, time_pause,
 * guaranteed_stars, sun_storm, color_bomb, board_pulse
 * Extend firePower() switch when adding new spell ids.
 */
/* Spell slot 10 — see CHARACTERS[10].spell in outer data bundle.
 * Engine handles: pattern_x, column_crush, row_sweep, time_pause,
 * guaranteed_stars, sun_storm, color_bomb, board_pulse
 * Extend firePower() switch when adding new spell ids.
 */
/* Spell slot 11 — see CHARACTERS[11].spell in outer data bundle.
 * Engine handles: pattern_x, column_crush, row_sweep, time_pause,
 * guaranteed_stars, sun_storm, color_bomb, board_pulse
 * Extend firePower() switch when adding new spell ids.
 */
/* Spell slot 12 — see CHARACTERS[12].spell in outer data bundle.
 * Engine handles: pattern_x, column_crush, row_sweep, time_pause,
 * guaranteed_stars, sun_storm, color_bomb, board_pulse
 * Extend firePower() switch when adding new spell ids.
 */
/* Spell slot 13 — see CHARACTERS[13].spell in outer data bundle.
 * Engine handles: pattern_x, column_crush, row_sweep, time_pause,
 * guaranteed_stars, sun_storm, color_bomb, board_pulse
 * Extend firePower() switch when adding new spell ids.
 */
/* Cell (0,0) index 0 — row-major storage in grid[] */
/* Cell (0,1) index 1 — row-major storage in grid[] */
/* Cell (0,2) index 2 — row-major storage in grid[] */
/* Cell (0,3) index 3 — row-major storage in grid[] */
/* Cell (0,4) index 4 — row-major storage in grid[] */
/* Cell (0,5) index 5 — row-major storage in grid[] */
/* Cell (0,6) index 6 — row-major storage in grid[] */
/* Cell (1,0) index 7 — row-major storage in grid[] */
/* Cell (1,1) index 8 — row-major storage in grid[] */
/* Cell (1,2) index 9 — row-major storage in grid[] */
/* Cell (1,3) index 10 — row-major storage in grid[] */
/* Cell (1,4) index 11 — row-major storage in grid[] */
/* Cell (1,5) index 12 — row-major storage in grid[] */
/* Cell (1,6) index 13 — row-major storage in grid[] */
/* Cell (2,0) index 14 — row-major storage in grid[] */
/* Cell (2,1) index 15 — row-major storage in grid[] */
/* Cell (2,2) index 16 — row-major storage in grid[] */
/* Cell (2,3) index 17 — row-major storage in grid[] */
/* Cell (2,4) index 18 — row-major storage in grid[] */
/* Cell (2,5) index 19 — row-major storage in grid[] */
/* Cell (2,6) index 20 — row-major storage in grid[] */
/* Cell (3,0) index 21 — row-major storage in grid[] */
/* Cell (3,1) index 22 — row-major storage in grid[] */
/* Cell (3,2) index 23 — row-major storage in grid[] */
/* Cell (3,3) index 24 — row-major storage in grid[] */
/* Cell (3,4) index 25 — row-major storage in grid[] */
/* Cell (3,5) index 26 — row-major storage in grid[] */
/* Cell (3,6) index 27 — row-major storage in grid[] */
/* Cell (4,0) index 28 — row-major storage in grid[] */
/* Cell (4,1) index 29 — row-major storage in grid[] */
/* Cell (4,2) index 30 — row-major storage in grid[] */
/* Cell (4,3) index 31 — row-major storage in grid[] */
/* Cell (4,4) index 32 — row-major storage in grid[] */
/* Cell (4,5) index 33 — row-major storage in grid[] */
/* Cell (4,6) index 34 — row-major storage in grid[] */
/* Cell (5,0) index 35 — row-major storage in grid[] */
/* Cell (5,1) index 36 — row-major storage in grid[] */
/* Cell (5,2) index 37 — row-major storage in grid[] */
/* Cell (5,3) index 38 — row-major storage in grid[] */
/* Cell (5,4) index 39 — row-major storage in grid[] */
/* Cell (5,5) index 40 — row-major storage in grid[] */
/* Cell (5,6) index 41 — row-major storage in grid[] */
/* Cell (6,0) index 42 — row-major storage in grid[] */
/* Cell (6,1) index 43 — row-major storage in grid[] */
/* Cell (6,2) index 44 — row-major storage in grid[] */
/* Cell (6,3) index 45 — row-major storage in grid[] */
/* Cell (6,4) index 46 — row-major storage in grid[] */
/* Cell (6,5) index 47 — row-major storage in grid[] */
/* Cell (6,6) index 48 — row-major storage in grid[] */
/* Level  1 emoji clear value: 10 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level  2 emoji clear value: 14 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level  3 emoji clear value: 18 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level  4 emoji clear value: 22 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level  5 emoji clear value: 26 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level  6 emoji clear value: 30 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level  7 emoji clear value: 34 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level  8 emoji clear value: 38 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level  9 emoji clear value: 42 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level 10 emoji clear value: 46 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level 11 emoji clear value: 50 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level 12 emoji clear value: 54 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level 13 emoji clear value: 58 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level 14 emoji clear value: 62 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level 15 emoji clear value: 66 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level 16 emoji clear value: 70 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level 17 emoji clear value: 74 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level 18 emoji clear value: 78 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level 19 emoji clear value: 82 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level 20 emoji clear value: 86 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level 21 emoji clear value: 90 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level 22 emoji clear value: 94 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level 23 emoji clear value: 98 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level 24 emoji clear value: 102 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level 25 emoji clear value: 106 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level 26 emoji clear value: 110 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level 27 emoji clear value: 114 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level 28 emoji clear value: 118 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level 29 emoji clear value: 122 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level 30 emoji clear value: 126 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level 31 emoji clear value: 130 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level 32 emoji clear value: 134 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level 33 emoji clear value: 138 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level 34 emoji clear value: 142 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level 35 emoji clear value: 146 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level 36 emoji clear value: 150 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level 37 emoji clear value: 154 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level 38 emoji clear value: 158 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level 39 emoji clear value: 162 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level 40 emoji clear value: 166 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level 41 emoji clear value: 170 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level 42 emoji clear value: 174 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level 43 emoji clear value: 178 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level 44 emoji clear value: 182 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level 45 emoji clear value: 186 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level 46 emoji clear value: 190 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level 47 emoji clear value: 194 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level 48 emoji clear value: 198 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level 49 emoji clear value: 202 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */
/* Level 50 emoji clear value: 206 pts (SCORE_BASE_MATCH + (lv-1)*SCORE_PER_LEVEL) */

/* =============================================================================
 * APPENDIX B — Special combine matrix
 * =============================================================================
 * Lightning + Lightning  → 3×3 row/col band blast around swap midpoint
 * Lightning + Sunshine   → row/col bands + both diagonals through midpoint
 * Rainbow   + Rainbow    → entire board cleared
 * Rainbow   + Lightning  → all most-common normals → Lightning, then trigger
 * Rainbow   + Sunshine   → all most-common normals → Sunshine, then trigger
 * =============================================================================
 */

/* =============================================================================
 * APPENDIX C — Round stats field guide (roundStats object)
 * =============================================================================
 * score            — mirrors live score counter
 * clears           — tiles removed this round
 * powers           — hero spell activations
 * blitzes          — blitz modes entered
 * cloudsMade       — LightningCloud specials created from matches
 * sunsMade         — Sunshine specials created from L/T matches
 * starsMade        — RainbowStar specials created from 5+ lines
 * combos           — cascade combo banners shown (depth >= 1)
 * specialsTriggered— special activations via swap (not creation)
 * heroClears       — normal tiles of hero emoji type cleared
 * maxCombo         — deepest cascade chain this round
 * =============================================================================
 */

/* ANIM.swap easing @ 0% progress — default 80ms total duration */
/* ANIM.swap easing @ 10% progress — default 80ms total duration */
/* ANIM.swap easing @ 20% progress — default 80ms total duration */
/* ANIM.swap easing @ 30% progress — default 80ms total duration */
/* ANIM.swap easing @ 40% progress — default 80ms total duration */
/* ANIM.swap easing @ 50% progress — default 80ms total duration */
/* ANIM.swap easing @ 60% progress — default 80ms total duration */
/* ANIM.swap easing @ 70% progress — default 80ms total duration */
/* ANIM.swap easing @ 80% progress — default 80ms total duration */
/* ANIM.swap easing @ 90% progress — default 80ms total duration */
/* ANIM.swap easing @ 100% progress — default 80ms total duration */
/* ANIM.reject easing @ 0% progress — default 110ms total duration */
/* ANIM.reject easing @ 10% progress — default 110ms total duration */
/* ANIM.reject easing @ 20% progress — default 110ms total duration */
/* ANIM.reject easing @ 30% progress — default 110ms total duration */
/* ANIM.reject easing @ 40% progress — default 110ms total duration */
/* ANIM.reject easing @ 50% progress — default 110ms total duration */
/* ANIM.reject easing @ 60% progress — default 110ms total duration */
/* ANIM.reject easing @ 70% progress — default 110ms total duration */
/* ANIM.reject easing @ 80% progress — default 110ms total duration */
/* ANIM.reject easing @ 90% progress — default 110ms total duration */
/* ANIM.reject easing @ 100% progress — default 110ms total duration */
/* ANIM.clear easing @ 0% progress — default 90ms total duration */
/* ANIM.clear easing @ 10% progress — default 90ms total duration */
/* ANIM.clear easing @ 20% progress — default 90ms total duration */
/* ANIM.clear easing @ 30% progress — default 90ms total duration */
/* ANIM.clear easing @ 40% progress — default 90ms total duration */
/* ANIM.clear easing @ 50% progress — default 90ms total duration */
/* ANIM.clear easing @ 60% progress — default 90ms total duration */
/* ANIM.clear easing @ 70% progress — default 90ms total duration */
/* ANIM.clear easing @ 80% progress — default 90ms total duration */
/* ANIM.clear easing @ 90% progress — default 90ms total duration */
/* ANIM.clear easing @ 100% progress — default 90ms total duration */
/* ANIM.spawn easing @ 0% progress — default 120ms total duration */
/* ANIM.spawn easing @ 10% progress — default 120ms total duration */
/* ANIM.spawn easing @ 20% progress — default 120ms total duration */
/* ANIM.spawn easing @ 30% progress — default 120ms total duration */
/* ANIM.spawn easing @ 40% progress — default 120ms total duration */
/* ANIM.spawn easing @ 50% progress — default 120ms total duration */
/* ANIM.spawn easing @ 60% progress — default 120ms total duration */
/* ANIM.spawn easing @ 70% progress — default 120ms total duration */
/* ANIM.spawn easing @ 80% progress — default 120ms total duration */
/* ANIM.spawn easing @ 90% progress — default 120ms total duration */
/* ANIM.spawn easing @ 100% progress — default 120ms total duration */
/* ANIM.special easing @ 0% progress — default 140ms total duration */
/* ANIM.special easing @ 10% progress — default 140ms total duration */
/* ANIM.special easing @ 20% progress — default 140ms total duration */
/* ANIM.special easing @ 30% progress — default 140ms total duration */
/* ANIM.special easing @ 40% progress — default 140ms total duration */
/* ANIM.special easing @ 50% progress — default 140ms total duration */
/* ANIM.special easing @ 60% progress — default 140ms total duration */
/* ANIM.special easing @ 70% progress — default 140ms total duration */
/* ANIM.special easing @ 80% progress — default 140ms total duration */
/* ANIM.special easing @ 90% progress — default 140ms total duration */
/* ANIM.special easing @ 100% progress — default 140ms total duration */
/* ANIM.transform easing @ 0% progress — default 110ms total duration */
/* ANIM.transform easing @ 10% progress — default 110ms total duration */
/* ANIM.transform easing @ 20% progress — default 110ms total duration */
/* ANIM.transform easing @ 30% progress — default 110ms total duration */
/* ANIM.transform easing @ 40% progress — default 110ms total duration */
/* ANIM.transform easing @ 50% progress — default 110ms total duration */
/* ANIM.transform easing @ 60% progress — default 110ms total duration */
/* ANIM.transform easing @ 70% progress — default 110ms total duration */
/* ANIM.transform easing @ 80% progress — default 110ms total duration */
/* ANIM.transform easing @ 90% progress — default 110ms total duration */
/* ANIM.transform easing @ 100% progress — default 110ms total duration */
