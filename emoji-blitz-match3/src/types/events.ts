import type { Cell, TileKind, CloudAxis, EmojiType } from './tile';

export type RoundState =
  | 'PreMatch'
  | 'Countdown'
  | 'Playing'
  | 'Blitz'
  | 'Resolving'
  | 'RoundEnd';

export type ClearReason =
  | 'match'
  | 'cloud'
  | 'sun'
  | 'star'
  | 'combine'
  | 'character'
  | 'cascade';

export interface FallMove {
  uid: number;
  from: Cell;
  to: Cell;
}

export interface SpawnSpec {
  uid: number;
  to: Cell;
  kind: TileKind;
  emojiType: EmojiType | null;
  cloudAxis?: CloudAxis;
  /** How many rows above the board the sprite should start. */
  spawnDepth: number;
}

export type BoardEvent =
  | { type: 'TilesSwapped'; a: Cell; b: Cell }
  | { type: 'SwapRejected'; a: Cell; b: Cell }
  | { type: 'TilesCleared'; cells: Cell[]; reason: ClearReason; scoreDelta: number }
  | { type: 'SpecialSpawned'; cell: Cell; kind: TileKind; uid: number }
  | { type: 'TilesFell'; moves: FallMove[] }
  | { type: 'TilesSpawned'; spawns: SpawnSpec[] }
  | { type: 'BlitzChanged'; value: number; active: boolean }
  | { type: 'CharacterCharge'; value: number }
  | { type: 'ScoreChanged'; score: number; delta: number }
  | { type: 'TimerChanged'; remaining: number }
  | { type: 'RoundState'; state: RoundState }
  | { type: 'PoolChanged'; pool: EmojiType[] };

export type BoardListener = (event: BoardEvent) => void;

export interface SwapIntent {
  type: 'swap';
  a: Cell;
  b: Cell;
}

export interface PowerTapIntent {
  type: 'power';
}

export type PlayerIntent = SwapIntent | PowerTapIntent;
