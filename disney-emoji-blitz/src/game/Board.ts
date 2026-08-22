import type {
  AbilityEvent,
  EmojiType,
  GameConfig,
  LevelConfig,
  MatchGroup,
  Position,
  SwapResult,
  TileData,
} from './types';
import { DEFAULT_CONFIG, getLevelConfig } from './types';
import {
  applyGravity,
  createTile,
  determineSpecial,
  findMatches,
  getRandomType,
  getSpecialCenter,
  getSpecialClearPositions,
  getTilesToClear,
  hasPossibleMoves,
  isAdjacent,
  posKey,
  resetTileIds,
  shuffleGrid,
  swapTiles,
  wouldCreateMatch,
} from './MatchFinder';

export type GameState = 'menu' | 'playing' | 'paused' | 'gameover' | 'levelcomplete';

export interface GameSnapshot {
  state: GameState;
  score: number;
  combo: number;
  maxCombo: number;
  timeLeft: number;
  level: number;
  goal: number;
  blitzActive: boolean;
  blitzTimeLeft: number;
  scoreMultiplier: number;
  grid: (TileData | null)[][];
  isAnimating: boolean;
  lastSwap: SwapResult | null;
  totalMatches: number;
  coinsEarned: number;
}

type GameListener = (snapshot: GameSnapshot) => void;

export class Board {
  private grid: (TileData | null)[][];
  private config: GameConfig;
  private levelConfig: LevelConfig;
  private state: GameState = 'menu';
  private score = 0;
  private combo = 0;
  private maxCombo = 0;
  private timeLeft: number;
  private level: number;
  private blitzActive = false;
  private blitzTimeLeft = 0;
  private scoreMultiplier = 1;
  private multiplierTimer = 0;
  private isAnimating = false;
  private lastSwap: SwapResult | null = null;
  private totalMatches = 0;
  private coinsEarned = 0;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private listeners: GameListener[] = [];
  private consecutiveMatches = 0;

  constructor(level = 1, config: GameConfig = DEFAULT_CONFIG) {
    this.config = config;
    this.level = level;
    this.levelConfig = getLevelConfig(level);
    this.timeLeft = config.roundDuration + this.levelConfig.timeBonus;
    this.grid = this.createEmptyGrid();
  }

  subscribe(listener: GameListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private emit(): void {
    const snapshot = this.getSnapshot();
    for (const l of this.listeners) l(snapshot);
  }

  getSnapshot(): GameSnapshot {
    return {
      state: this.state,
      score: this.score,
      combo: this.combo,
      maxCombo: this.maxCombo,
      timeLeft: this.timeLeft,
      level: this.level,
      goal: this.levelConfig.goal,
      blitzActive: this.blitzActive,
      blitzTimeLeft: this.blitzTimeLeft,
      scoreMultiplier: this.scoreMultiplier,
      grid: this.grid.map(row => row.map(t => t ? { ...t } : null)),
      isAnimating: this.isAnimating,
      lastSwap: this.lastSwap,
      totalMatches: this.totalMatches,
      coinsEarned: this.coinsEarned,
    };
  }

  private createEmptyGrid(): (TileData | null)[][] {
    resetTileIds();
    const { rows, cols } = this.config;
    const grid: (TileData | null)[][] = [];

    for (let r = 0; r < rows; r++) {
      grid[r] = [];
      for (let c = 0; c < cols; c++) {
        let type: EmojiType;
        do {
          type = getRandomType(this.levelConfig.emojiTypes);
        } while (this.wouldCreateImmediateMatch(grid, r, c, type));
        grid[r][c] = createTile(type, r, c);
      }
    }

    if (!hasPossibleMoves(grid)) shuffleGrid(grid, this.levelConfig.emojiTypes);
    return grid;
  }

  private wouldCreateImmediateMatch(
    grid: (TileData | null)[][],
    row: number,
    col: number,
    type: EmojiType
  ): boolean {
    if (col >= 2 && grid[row][col - 1]?.type === type && grid[row][col - 2]?.type === type) return true;
    if (row >= 2 && grid[row - 1][col]?.type === type && grid[row - 2][col]?.type === type) return true;
    return false;
  }

  startGame(): void {
    this.state = 'playing';
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.timeLeft = this.config.roundDuration + this.levelConfig.timeBonus;
    this.blitzActive = false;
    this.blitzTimeLeft = 0;
    this.scoreMultiplier = 1;
    this.multiplierTimer = 0;
    this.totalMatches = 0;
    this.coinsEarned = 0;
    this.consecutiveMatches = 0;
    this.grid = this.createEmptyGrid();
    this.startTimer();
    this.emit();
  }

  startLevel(level: number): void {
    this.level = level;
    this.levelConfig = getLevelConfig(level);
    this.startGame();
  }

  private startTimer(): void {
    this.stopTimer();
    this.timerInterval = setInterval(() => {
      if (this.state !== 'playing' || this.isAnimating) return;

      this.timeLeft = Math.max(0, this.timeLeft - 0.1);

      if (this.blitzActive) {
        this.blitzTimeLeft = Math.max(0, this.blitzTimeLeft - 0.1);
        if (this.blitzTimeLeft <= 0) this.blitzActive = false;
      }

      if (this.multiplierTimer > 0) {
        this.multiplierTimer = Math.max(0, this.multiplierTimer - 0.1);
        if (this.multiplierTimer <= 0) this.scoreMultiplier = 1;
      }

      if (this.timeLeft <= 0) {
        this.endGame();
      }

      this.emit();
    }, 100);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  pause(): void {
    if (this.state === 'playing') {
      this.state = 'paused';
      this.stopTimer();
      this.emit();
    }
  }

  resume(): void {
    if (this.state === 'paused') {
      this.state = 'playing';
      this.startTimer();
      this.emit();
    }
  }

  private endGame(): void {
    this.stopTimer();
    if (this.score >= this.levelConfig.goal) {
      this.state = 'levelcomplete';
      this.coinsEarned = Math.floor(this.score / 100) + this.level * 10;
    } else {
      this.state = 'gameover';
      this.coinsEarned = Math.floor(this.score / 200);
    }
    this.emit();
  }

  async trySwap(a: Position, b: Position): Promise<SwapResult | null> {
    if (this.state !== 'playing' || this.isAnimating) return null;
    if (!isAdjacent(a, b)) return null;

    const tileA = this.grid[a.row]?.[a.col];
    const tileB = this.grid[b.row]?.[b.col];
    if (!tileA || !tileB) return null;

    // Allow swapping special tiles
    const hasSpecial = tileA.special !== 'none' || tileB.special !== 'none';

    if (!hasSpecial && !wouldCreateMatch(this.grid, a, b)) {
      // Invalid swap — animate rejection
      this.isAnimating = true;
      this.emit();
      await this.delay(200);
      this.isAnimating = false;
      this.emit();
      return null;
    }

    this.isAnimating = true;
    swapTiles(this.grid, a, b);
    this.emit();

    await this.delay(150);

    const result = await this.processMatches(a, b, hasSpecial);
    this.lastSwap = result;
    this.isAnimating = false;
    this.emit();
    return result;
  }

  private async processMatches(
    swapA: Position,
    swapB: Position,
    isSpecialSwap: boolean
  ): Promise<SwapResult> {
    const allMatches: MatchGroup[] = [];
    const cascades: MatchGroup[][] = [];
    const powerUpsCreated: Position[] = [];
    const abilitiesTriggered: AbilityEvent[] = [];
    let totalScore = 0;
    let cascadeCount = 0;

    // Handle special tile activation on swap
    if (isSpecialSwap) {
      const specials = [swapA, swapB].filter(p => {
        const t = this.grid[p.row][p.col];
        return t && t.special !== 'none';
      });
      for (const pos of specials) {
        const tile = this.grid[pos.row][pos.col]!;
        const clears = getSpecialClearPositions(this.grid, pos, tile.special, tile.type);
        for (const c of clears) {
          if (this.grid[c.row][c.col]) {
            this.grid[c.row][c.col] = null;
          }
        }
        totalScore += this.config.baseScore * 3;
      }
      await this.delay(200);
      const { moved, spawned } = applyGravity(this.grid, this.levelConfig.emojiTypes);
      this.emit();
      await this.delay(250);
    }

    let matches = findMatches(this.grid);

    if (matches.length === 0 && !isSpecialSwap) {
      // Revert swap
      swapTiles(this.grid, swapA, swapB);
      return {
        valid: false,
        matches: [],
        cascades: [],
        scoreGained: 0,
        powerUpsCreated: [],
        abilitiesTriggered: [],
      };
    }

    while (matches.length > 0) {
      if (cascadeCount > 0) cascades.push(matches);
      else allMatches.push(...matches);

      this.consecutiveMatches++;
      this.combo = this.consecutiveMatches;
      this.maxCombo = Math.max(this.maxCombo, this.combo);

      if (this.consecutiveMatches >= this.config.blitzThreshold && !this.blitzActive) {
        this.activateBlitz();
      }

      const toClear = new Set<string>();
      for (const match of matches) {
        for (const t of match.tiles) toClear.add(posKey(t));

        const special = determineSpecial(match);
        if (special !== 'none') {
          const center = getSpecialCenter(match);
          powerUpsCreated.push(center);
          const tile = this.grid[center.row][center.col];
          if (tile) {
            tile.special = special;
            toClear.delete(posKey(center));
          }
        }

        // Trigger character ability
        const ability = this.triggerAbility(match.type, getSpecialCenter(match));
        if (ability) {
          abilitiesTriggered.push(ability);
          totalScore += ability.bonusScore;
          for (const t of ability.extraClears ?? []) {
            toClear.add(posKey(t));
          }
        }
      }

      const matchScore = this.calculateMatchScore(matches, cascadeCount);
      totalScore += matchScore;
      this.totalMatches += matches.reduce((s, m) => s + m.tiles.length, 0);

      for (const key of toClear) {
        const [r, c] = key.split(',').map(Number);
        this.grid[r][c] = null;
      }

      this.score += Math.floor(matchScore * this.scoreMultiplier * (this.blitzActive ? 2 : 1));
      this.emit();
      await this.delay(180);

      applyGravity(this.grid, this.levelConfig.emojiTypes);
      this.emit();
      await this.delay(220);

      matches = findMatches(this.grid);
      cascadeCount++;
    }

    this.consecutiveMatches = 0;
    this.combo = 0;

    if (!hasPossibleMoves(this.grid)) {
      shuffleGrid(this.grid, this.levelConfig.emojiTypes);
      this.emit();
    }

    return {
      valid: true,
      matches: allMatches,
      cascades,
      scoreGained: totalScore,
      powerUpsCreated,
      abilitiesTriggered,
    };
  }

  private calculateMatchScore(matches: MatchGroup[], cascadeIndex: number): number {
    let score = 0;
    const comboBonus = 1 + (this.combo - 1) * this.config.comboMultiplierStep;
    const cascadeBonus = 1 + cascadeIndex * 0.25;

    for (const match of matches) {
      const base = this.config.baseScore * match.tiles.length;
      const lengthBonus = match.length >= 5 ? 2 : match.length >= 4 ? 1.5 : 1;
      score += base * lengthBonus;
    }

    return Math.floor(score * comboBonus * cascadeBonus);
  }

  private triggerAbility(
    type: EmojiType,
    pos: Position
  ): (AbilityEvent & { extraClears?: Position[] }) | null {
    const rows = this.grid.length;
    const cols = this.grid[0]?.length ?? 0;
    const extraClears: Position[] = [];

    switch (type) {
      case 'lion':
        for (let c = 0; c < cols; c++) extraClears.push({ row: pos.row, col: c });
        return { type, position: pos, bonusScore: 200, effect: 'row-clear', extraClears };
      case 'mouse':
        this.timeLeft = Math.min(this.timeLeft + 3, 99);
        return { type, position: pos, bonusScore: 50, effect: 'time-bonus' };
      case 'snowflake':
        for (let r = 0; r < rows; r++) extraClears.push({ row: r, col: pos.col });
        return { type, position: pos, bonusScore: 200, effect: 'col-clear', extraClears };
      case 'mermaid':
        for (let r = rows - 1; r >= Math.max(0, rows - 2); r--) {
          for (let c = 0; c < cols; c++) extraClears.push({ row: r, col: c });
        }
        return { type, position: pos, bonusScore: 300, effect: 'bottom-splash', extraClears };
      case 'castle':
        this.scoreMultiplier = 2;
        this.multiplierTimer = 5;
        return { type, position: pos, bonusScore: 100, effect: 'score-double' };
      case 'star':
        return { type, position: pos, bonusScore: 400, effect: 'rainbow' };
      case 'gem':
        return { type, position: pos, bonusScore: 500, effect: 'gem-bonus' };
      default:
        return null;
    }
  }

  private activateBlitz(): void {
    this.blitzActive = true;
    this.blitzTimeLeft = this.config.blitzDuration;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  destroy(): void {
    this.stopTimer();
    this.listeners = [];
  }
}
