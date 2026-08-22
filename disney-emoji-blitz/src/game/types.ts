export type EmojiType =
  | 'lion'
  | 'mouse'
  | 'snowflake'
  | 'mermaid'
  | 'castle'
  | 'star'
  | 'gem';

export type SpecialType = 'none' | 'row' | 'col' | 'bomb' | 'rainbow';

export interface TileData {
  id: number;
  type: EmojiType;
  special: SpecialType;
  row: number;
  col: number;
}

export interface Position {
  row: number;
  col: number;
}

export interface MatchGroup {
  tiles: Position[];
  type: EmojiType;
  isHorizontal: boolean;
  length: number;
}

export interface SwapResult {
  valid: boolean;
  matches: MatchGroup[];
  cascades: MatchGroup[][];
  scoreGained: number;
  powerUpsCreated: Position[];
  abilitiesTriggered: AbilityEvent[];
}

export interface AbilityEvent {
  type: EmojiType;
  position: Position;
  bonusScore: number;
  effect: string;
}

export interface GameConfig {
  rows: number;
  cols: number;
  roundDuration: number;
  baseScore: number;
  comboMultiplierStep: number;
  blitzThreshold: number;
  blitzDuration: number;
}

export interface LevelConfig {
  level: number;
  goal: number;
  timeBonus: number;
  emojiTypes: EmojiType[];
}

export interface PlayerProgress {
  highScore: number;
  totalGames: number;
  currentLevel: number;
  coins: number;
  dailyStreak: number;
  lastPlayedDate: string;
  unlockedEmojis: EmojiType[];
  achievements: string[];
}

export const EMOJI_MAP: Record<EmojiType, string> = {
  lion: '🦁',
  mouse: '🐭',
  snowflake: '❄️',
  mermaid: '🧜‍♀️',
  castle: '🏰',
  star: '⭐',
  gem: '💎',
};

export const EMOJI_NAMES: Record<EmojiType, string> = {
  lion: 'Brave Lion',
  mouse: 'Magic Mouse',
  snowflake: 'Ice Queen',
  mermaid: 'Sea Princess',
  castle: 'Royal Castle',
  star: 'Wishing Star',
  gem: 'Magic Gem',
};

export const EMOJI_COLORS: Record<EmojiType, string> = {
  lion: '#f5a623',
  mouse: '#e74c3c',
  snowflake: '#74b9ff',
  mermaid: '#00cec9',
  castle: '#a29bfe',
  star: '#fdcb6e',
  gem: '#e056fd',
};

export const ABILITY_DESCRIPTIONS: Record<EmojiType, string> = {
  lion: 'Roars! Clears entire row',
  mouse: 'Adds +3 seconds',
  snowflake: 'Freezes! Clears entire column',
  mermaid: 'Splash! Clears bottom 2 rows',
  castle: '2× score for 5 seconds',
  star: 'Rainbow blast! Clears all of one type',
  gem: 'Bonus +500 points',
};

export const DEFAULT_CONFIG: GameConfig = {
  rows: 8,
  cols: 7,
  roundDuration: 60,
  baseScore: 100,
  comboMultiplierStep: 0.5,
  blitzThreshold: 5,
  blitzDuration: 8,
};

export const LEVELS: LevelConfig[] = [
  { level: 1, goal: 5000, timeBonus: 0, emojiTypes: ['lion', 'mouse', 'snowflake', 'mermaid', 'castle'] },
  { level: 2, goal: 8000, timeBonus: 5, emojiTypes: ['lion', 'mouse', 'snowflake', 'mermaid', 'castle', 'star'] },
  { level: 3, goal: 12000, timeBonus: 5, emojiTypes: ['lion', 'mouse', 'snowflake', 'mermaid', 'castle', 'star'] },
  { level: 4, goal: 16000, timeBonus: 10, emojiTypes: ['lion', 'mouse', 'snowflake', 'mermaid', 'castle', 'star', 'gem'] },
  { level: 5, goal: 22000, timeBonus: 10, emojiTypes: ['lion', 'mouse', 'snowflake', 'mermaid', 'castle', 'star', 'gem'] },
  { level: 6, goal: 30000, timeBonus: 15, emojiTypes: ['lion', 'mouse', 'snowflake', 'mermaid', 'castle', 'star', 'gem'] },
  { level: 7, goal: 40000, timeBonus: 15, emojiTypes: ['lion', 'mouse', 'snowflake', 'mermaid', 'castle', 'star', 'gem'] },
  { level: 8, goal: 55000, timeBonus: 20, emojiTypes: ['lion', 'mouse', 'snowflake', 'mermaid', 'castle', 'star', 'gem'] },
  { level: 9, goal: 75000, timeBonus: 20, emojiTypes: ['lion', 'mouse', 'snowflake', 'mermaid', 'castle', 'star', 'gem'] },
  { level: 10, goal: 100000, timeBonus: 25, emojiTypes: ['lion', 'mouse', 'snowflake', 'mermaid', 'castle', 'star', 'gem'] },
];

export function getLevelConfig(level: number): LevelConfig {
  const idx = Math.min(level - 1, LEVELS.length - 1);
  return LEVELS[idx];
}
