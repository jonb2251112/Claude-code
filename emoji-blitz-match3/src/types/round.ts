export type { RoundState } from './events';

export interface RoundConfig {
  heroEmoji: number;
  /** Full emoji pool including hero (length DEFAULT_POOL_SIZE). */
  emojiPool: number[];
  seed: number;
  characterSpellId: string;
}
