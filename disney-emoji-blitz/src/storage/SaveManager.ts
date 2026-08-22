import type { EmojiType, PlayerProgress } from '../game/types';

const STORAGE_KEY = 'emoji-blitz-save';

const DEFAULT_PROGRESS: PlayerProgress = {
  highScore: 0,
  totalGames: 0,
  currentLevel: 1,
  coins: 0,
  dailyStreak: 0,
  lastPlayedDate: '',
  unlockedEmojis: ['lion', 'mouse', 'snowflake', 'mermaid', 'castle'],
  achievements: [],
};

export class SaveManager {
  private progress: PlayerProgress;

  constructor() {
    this.progress = this.load();
  }

  private load(): PlayerProgress {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...DEFAULT_PROGRESS, ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return { ...DEFAULT_PROGRESS };
  }

  save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.progress));
    } catch { /* ignore */ }
  }

  getProgress(): PlayerProgress {
    return { ...this.progress };
  }

  recordGame(score: number, level: number, won: boolean, coins: number): void {
    this.progress.highScore = Math.max(this.progress.highScore, score);
    this.progress.totalGames++;
    this.progress.coins += coins;

    if (won && level >= this.progress.currentLevel) {
      this.progress.currentLevel = level + 1;
      this.unlockEmojisForLevel(level + 1);
    }

    this.updateDailyStreak();
    this.checkAchievements(score, won);
    this.save();
  }

  private updateDailyStreak(): void {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    if (this.progress.lastPlayedDate === today) return;
    if (this.progress.lastPlayedDate === yesterday) {
      this.progress.dailyStreak++;
    } else {
      this.progress.dailyStreak = 1;
    }
    this.progress.lastPlayedDate = today;
  }

  private unlockEmojisForLevel(level: number): void {
    const unlocks: Record<number, EmojiType> = {
      2: 'star',
      4: 'gem',
    };
    const emoji = unlocks[level];
    if (emoji && !this.progress.unlockedEmojis.includes(emoji)) {
      this.progress.unlockedEmojis.push(emoji);
    }
  }

  private checkAchievements(score: number, won: boolean): void {
    const add = (id: string) => {
      if (!this.progress.achievements.includes(id)) {
        this.progress.achievements.push(id);
      }
    };

    if (won) add('first_win');
    if (score >= 10000) add('score_10k');
    if (score >= 50000) add('score_50k');
    if (score >= 100000) add('score_100k');
    if (this.progress.dailyStreak >= 3) add('streak_3');
    if (this.progress.dailyStreak >= 7) add('streak_7');
    if (this.progress.totalGames >= 10) add('games_10');
    if (this.progress.totalGames >= 50) add('games_50');
  }

  reset(): void {
    this.progress = { ...DEFAULT_PROGRESS };
    this.save();
  }
}

export const saveManager = new SaveManager();

export const ACHIEVEMENT_LABELS: Record<string, string> = {
  first_win: '🏆 First Victory',
  score_10k: '⭐ Score 10,000',
  score_50k: '🌟 Score 50,000',
  score_100k: '💫 Score 100,000',
  streak_3: '🔥 3-Day Streak',
  streak_7: '🔥🔥 7-Day Streak',
  games_10: '🎮 10 Games Played',
  games_50: '🎮🎮 50 Games Played',
};
