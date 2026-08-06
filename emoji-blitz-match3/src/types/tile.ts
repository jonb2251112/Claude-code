/** Discrete emoji identity in the match pool. */
export type EmojiType = number;

export type TileKind =
  | 'Normal'
  | 'LightningCloud'
  | 'SunKing'
  | 'RainbowStar';

export type CloudAxis = 'row' | 'col';

export interface Tile {
  /** Stable instance id for view diffing / tweens. */
  uid: number;
  kind: TileKind;
  /** Color/type for normals; null for colorless specials (Rainbow Star). */
  emojiType: EmojiType | null;
  /** Orientation for Lightning Cloud line clears. */
  cloudAxis?: CloudAxis;
}

export interface Cell {
  r: number;
  c: number;
}

export function cellKey(r: number, c: number): number {
  return r * 8 + c; // 7 cols fit; 8 stride avoids collisions with padding
}

export function cellsEqual(a: Cell, b: Cell): boolean {
  return a.r === b.r && a.c === b.c;
}

export function isOrthogonalAdjacent(a: Cell, b: Cell): boolean {
  const dr = Math.abs(a.r - b.r);
  const dc = Math.abs(a.c - b.c);
  return dr + dc === 1;
}

export function isSpecial(kind: TileKind): boolean {
  return kind !== 'Normal';
}
