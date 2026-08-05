/**
 * Green Hill Zone tilemap + collision.
 * Tile ids: 0 empty, 1 solid, 2 slope /, 3 slope \, 4 platform (one-way), 5 spring
 */
export const TILE = 32;

export const T = {
  EMPTY: 0,
  SOLID: 1,
  SLOPE_L: 2, // rises to the right  /
  SLOPE_R: 3, // rises to the left   \
  PLATFORM: 4,
  SPRING: 5,
};

/** Build Act 1 layout — wide scrolling Green Hill style course */
export function buildLevel() {
  const W = 220;
  const H = 20;
  const map = Array.from({ length: H }, () => Array(W).fill(T.EMPTY));

  const fillGround = (x0, x1, y) => {
    for (let x = x0; x <= x1; x++) {
      for (let yy = y; yy < H; yy++) map[yy][x] = T.SOLID;
    }
  };

  const plateau = (x0, x1, y) => {
    for (let x = x0; x <= x1; x++) map[y][x] = T.SOLID;
    for (let x = x0; x <= x1; x++) {
      for (let yy = y + 1; yy < H; yy++) {
        if (map[yy][x] === T.EMPTY) map[yy][x] = T.SOLID;
      }
    }
  };

  // Starting flats
  fillGround(0, 28, 14);

  // Gentle rise
  map[13][29] = T.SLOPE_L;
  for (let yy = 14; yy < H; yy++) map[yy][29] = T.SOLID;
  map[13][30] = T.SOLID;
  for (let yy = 14; yy < H; yy++) map[yy][30] = T.SOLID;
  map[12][31] = T.SLOPE_L;
  for (let yy = 13; yy < H; yy++) map[yy][31] = T.SOLID;
  plateau(32, 40, 12);

  // Drop to valley
  map[12][41] = T.SLOPE_R;
  for (let yy = 13; yy < H; yy++) map[yy][41] = T.SOLID;
  map[13][42] = T.SLOPE_R;
  for (let yy = 14; yy < H; yy++) map[yy][42] = T.SOLID;
  fillGround(43, 55, 14);

  // Floating platforms
  for (let x = 48; x <= 52; x++) map[10][x] = T.PLATFORM;
  for (let x = 56; x <= 60; x++) map[8][x] = T.PLATFORM;
  for (let x = 62; x <= 66; x++) map[6][x] = T.PLATFORM;

  // Mid hill
  fillGround(56, 58, 14);
  map[13][59] = T.SLOPE_L;
  for (let yy = 14; yy < H; yy++) map[yy][59] = T.SOLID;
  plateau(60, 72, 12);

  // Tunnel / low ceiling feel with platforms above
  fillGround(73, 88, 14);
  for (let x = 76; x <= 84; x++) map[11][x] = T.PLATFORM;

  // Big ramp up
  map[13][89] = T.SLOPE_L;
  for (let yy = 14; yy < H; yy++) map[yy][89] = T.SOLID;
  map[12][90] = T.SLOPE_L;
  for (let yy = 13; yy < H; yy++) map[yy][90] = T.SOLID;
  map[11][91] = T.SLOPE_L;
  for (let yy = 12; yy < H; yy++) map[yy][91] = T.SOLID;
  plateau(92, 105, 10);

  // Drop
  map[10][106] = T.SLOPE_R;
  for (let yy = 11; yy < H; yy++) map[yy][106] = T.SOLID;
  map[11][107] = T.SLOPE_R;
  for (let yy = 12; yy < H; yy++) map[yy][107] = T.SOLID;
  map[12][108] = T.SLOPE_R;
  for (let yy = 13; yy < H; yy++) map[yy][108] = T.SOLID;
  map[13][109] = T.SLOPE_R;
  for (let yy = 14; yy < H; yy++) map[yy][109] = T.SOLID;
  fillGround(110, 130, 14);

  // Stepping platforms to high ledge
  for (let x = 118; x <= 121; x++) map[11][x] = T.PLATFORM;
  for (let x = 124; x <= 127; x++) map[9][x] = T.PLATFORM;
  for (let x = 130; x <= 134; x++) map[7][x] = T.PLATFORM;
  plateau(136, 148, 8);

  // Final stretch
  map[8][149] = T.SLOPE_R;
  for (let yy = 9; yy < H; yy++) map[yy][149] = T.SOLID;
  map[9][150] = T.SLOPE_R;
  for (let yy = 10; yy < H; yy++) map[yy][150] = T.SOLID;
  map[10][151] = T.SLOPE_R;
  for (let yy = 11; yy < H; yy++) map[yy][151] = T.SOLID;
  map[11][152] = T.SLOPE_R;
  for (let yy = 12; yy < H; yy++) map[yy][152] = T.SOLID;
  map[12][153] = T.SLOPE_R;
  for (let yy = 13; yy < H; yy++) map[yy][153] = T.SOLID;
  map[13][154] = T.SLOPE_R;
  for (let yy = 14; yy < H; yy++) map[yy][154] = T.SOLID;
  fillGround(155, 219, 14);

  // Springs
  map[13][50] = T.SPRING;
  map[13][115] = T.SPRING;
  map[9][140] = T.SPRING;

  // Decor flowers / palms are drawn procedurally from coords
  const decorations = [
    { type: "flower", x: 6 * TILE, y: 14 * TILE },
    { type: "flower", x: 10 * TILE, y: 14 * TILE },
    { type: "palm", x: 18 * TILE, y: 14 * TILE },
    { type: "palm", x: 24 * TILE, y: 14 * TILE },
    { type: "flower", x: 36 * TILE, y: 12 * TILE },
    { type: "palm", x: 46 * TILE, y: 14 * TILE },
    { type: "palm", x: 64 * TILE, y: 12 * TILE },
    { type: "flower", x: 70 * TILE, y: 12 * TILE },
    { type: "palm", x: 80 * TILE, y: 14 * TILE },
    { type: "palm", x: 98 * TILE, y: 10 * TILE },
    { type: "flower", x: 112 * TILE, y: 14 * TILE },
    { type: "palm", x: 120 * TILE, y: 14 * TILE },
    { type: "palm", x: 160 * TILE, y: 14 * TILE },
    { type: "flower", x: 168 * TILE, y: 14 * TILE },
    { type: "palm", x: 180 * TILE, y: 14 * TILE },
    { type: "waterfall", x: 14 * TILE, y: 6 * TILE },
    { type: "waterfall", x: 100 * TILE, y: 4 * TILE },
  ];

  return { map, W, H, decorations, spawn: { x: 3 * TILE, y: 12 * TILE }, goalX: 210 * TILE };
}

export function tileAt(level, tx, ty) {
  if (ty < 0 || ty >= level.H || tx < 0 || tx >= level.W) return T.SOLID;
  return level.map[ty][tx];
}

/** Ground height at world X within a tile (for slopes) */
export function groundYInTile(tile, localX) {
  const t = Math.max(0, Math.min(TILE, localX));
  if (tile === T.SLOPE_L) return TILE - t; // high on right
  if (tile === T.SLOPE_R) return t; // high on left
  if (tile === T.SOLID || tile === T.SPRING) return 0;
  if (tile === T.PLATFORM) return 0;
  return TILE;
}

export function isSolidTile(t) {
  return t === T.SOLID || t === T.SLOPE_L || t === T.SLOPE_R || t === T.SPRING;
}

export function isOneWay(t) {
  return t === T.PLATFORM;
}
