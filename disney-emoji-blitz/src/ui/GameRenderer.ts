import type { GameSnapshot } from '../game/Board';
import type { TileData, Position } from '../game/types';
import { EMOJI_MAP, EMOJI_NAMES, ABILITY_DESCRIPTIONS } from '../game/types';

export class GameRenderer {
  private container: HTMLElement;
  private boardEl: HTMLElement;
  private selected: Position | null = null;
  private pointerStart: Position | null = null;
  private pointerStartXY: { x: number; y: number } | null = null;
  private swapTriggered = false;
  private onSwap: (a: Position, b: Position) => void;
  private rows = 8;
  private cols = 7;

  constructor(container: HTMLElement, onSwap: (a: Position, b: Position) => void) {
    this.container = container;
    this.onSwap = onSwap;
    this.boardEl = document.createElement('div');
    this.boardEl.className = 'game-board';
    this.container.appendChild(this.boardEl);

    this.boardEl.addEventListener('pointerdown', this.handlePointerDown);
    this.boardEl.addEventListener('pointermove', this.handlePointerMove);
    this.boardEl.addEventListener('pointerup', this.handlePointerUp);
    this.boardEl.addEventListener('pointercancel', this.handlePointerCancel);
    this.boardEl.addEventListener('click', this.handleClick);
  }

  render(snapshot: GameSnapshot): void {
    const { grid, isAnimating } = snapshot;
    const rows = grid.length;
    const cols = grid[0]?.length ?? 0;
    this.rows = rows;
    this.cols = cols;

    this.boardEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    this.boardEl.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

    const existingTiles = this.boardEl.querySelectorAll('.tile');
    const tileMap = new Map<number, HTMLElement>();

    existingTiles.forEach(el => {
      const id = Number((el as HTMLElement).dataset.id);
      if (id) tileMap.set(id, el as HTMLElement);
    });

    const neededIds = new Set<number>();
    for (const row of grid) {
      for (const tile of row) {
        if (tile) neededIds.add(tile.id);
      }
    }

    // Remove stale tiles
    tileMap.forEach((el, id) => {
      if (!neededIds.has(id)) {
        el.classList.add('tile-pop');
        setTimeout(() => el.remove(), 200);
        tileMap.delete(id);
      }
    });

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tile = grid[r][c];
        if (!tile) continue;

        let el = tileMap.get(tile.id);
        if (!el) {
          el = this.createTileElement(tile);
          this.boardEl.appendChild(el);
        } else {
          this.updateTileElement(el, tile);
        }

        el.style.gridRow = String(r + 1);
        el.style.gridColumn = String(c + 1);

        el.classList.toggle('selected', this.selected?.row === r && this.selected?.col === c);
        el.classList.toggle('animating', isAnimating);
      }
    }
  }

  private createTileElement(tile: TileData): HTMLElement {
    const el = document.createElement('div');
    el.className = 'tile';
    el.dataset.id = String(tile.id);
    el.dataset.row = String(tile.row);
    el.dataset.col = String(tile.col);
    this.updateTileElement(el, tile);
    return el;
  }

  private updateTileElement(el: HTMLElement, tile: TileData): void {
    el.dataset.row = String(tile.row);
    el.dataset.col = String(tile.col);
    el.innerHTML = '';

    const emoji = document.createElement('span');
    emoji.className = 'tile-emoji';
    emoji.textContent = EMOJI_MAP[tile.type];
    el.appendChild(emoji);

    if (tile.special !== 'none') {
      el.classList.add('special', `special-${tile.special}`);
      const badge = document.createElement('span');
      badge.className = 'special-badge';
      badge.textContent = tile.special === 'rainbow' ? '🌈' :
        tile.special === 'bomb' ? '💥' :
        tile.special === 'row' ? '↔️' : '↕️';
      el.appendChild(badge);
    } else {
      el.classList.remove('special', 'special-rainbow', 'special-bomb', 'special-row', 'special-col');
    }
  }

  private handlePointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return;
    const pos = this.getTilePosFromEvent(e);
    if (!pos) return;

    e.preventDefault();
    this.pointerStart = pos;
    this.pointerStartXY = { x: e.clientX, y: e.clientY };
    this.swapTriggered = false;
    this.boardEl.setPointerCapture(e.pointerId);

    const tile = this.getTileElement(pos);
    tile?.classList.add('tile-press');
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (!this.pointerStart || !this.pointerStartXY || this.swapTriggered) return;

    const dx = e.clientX - this.pointerStartXY.x;
    const dy = e.clientY - this.pointerStartXY.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 12) return;

    let target: Position | null = null;
    if (Math.abs(dx) > Math.abs(dy)) {
      target = {
        row: this.pointerStart.row,
        col: this.pointerStart.col + (dx > 0 ? 1 : -1),
      };
    } else {
      target = {
        row: this.pointerStart.row + (dy > 0 ? 1 : -1),
        col: this.pointerStart.col,
      };
    }

    if (target && this.isValidPos(target)) {
      this.swapTriggered = true;
      this.onSwap(this.pointerStart, target);
      this.selected = null;
      this.clearPress();
    }
  };

  private handlePointerUp = (e: PointerEvent): void => {
    this.resetPointer();
  };

  private handlePointerCancel = (): void => {
    this.resetPointer();
  };

  private resetPointer(): void {
    this.pointerStart = null;
    this.pointerStartXY = null;
    this.clearPress();
  }

  private isAdjacent(a: Position, b: Position): boolean {
    return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
  }

  private isValidPos(p: Position): boolean {
    return p.row >= 0 && p.row < this.rows && p.col >= 0 && p.col < this.cols;
  }

  private getTileElement(pos: Position): HTMLElement | null {
    return this.boardEl.querySelector(
      `[data-row="${pos.row}"][data-col="${pos.col}"]`
    ) as HTMLElement;
  }

  private highlightSelection(): void {
    this.boardEl.querySelectorAll('.tile').forEach(el => el.classList.remove('selected'));
    if (this.selected) {
      this.getTileElement(this.selected)?.classList.add('selected');
    }
  }

  private clearPress(): void {
    this.boardEl.querySelectorAll('.tile-press').forEach(el => el.classList.remove('tile-press'));
  }

  private handleClick = (e: MouseEvent): void => {
    if (this.swapTriggered) {
      this.swapTriggered = false;
      return;
    }
    const pos = this.getTilePosFromEvent(e);
    if (!pos) return;

    if (this.selected &&
        (this.selected.row !== pos.row || this.selected.col !== pos.col) &&
        this.isAdjacent(this.selected, pos)) {
      this.onSwap(this.selected, pos);
      this.selected = null;
    } else if (this.selected?.row === pos.row && this.selected?.col === pos.col) {
      this.selected = null;
    } else {
      this.selected = pos;
    }
    this.highlightSelection();
  };

  private getTilePosFromEvent(e: MouseEvent | PointerEvent): Position | null {
    const target = (e.target as HTMLElement).closest('.tile') as HTMLElement;
    if (!target) return null;
    return {
      row: Number(target.dataset.row),
      col: Number(target.dataset.col),
    };
  }

  getTileCenter(row: number, col: number): { x: number; y: number } | null {
    const tile = this.boardEl.querySelector(
      `[data-row="${row}"][data-col="${col}"]`
    ) as HTMLElement;
    if (!tile) return null;
    const rect = tile.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2 - containerRect.left,
      y: rect.top + rect.height / 2 - containerRect.top,
    };
  }

  destroy(): void {
    this.boardEl.remove();
  }
}

export function createHUD(): HTMLElement {
  const hud = document.createElement('div');
  hud.className = 'hud';
  hud.innerHTML = `
    <div class="hud-top">
      <div class="hud-score">
        <span class="hud-label">SCORE</span>
        <span class="hud-value" id="score-display">0</span>
      </div>
      <div class="hud-timer">
        <div class="timer-ring">
          <svg viewBox="0 0 36 36">
            <path class="timer-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
            <path class="timer-fill" id="timer-ring" stroke-dasharray="100, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
          </svg>
          <span class="timer-text" id="timer-display">60</span>
        </div>
      </div>
      <div class="hud-goal">
        <span class="hud-label">GOAL</span>
        <span class="hud-value" id="goal-display">5000</span>
      </div>
    </div>
    <div class="hud-bottom">
      <div class="combo-display" id="combo-display"></div>
      <div class="level-badge" id="level-display">Level 1</div>
      <div class="multiplier-display" id="multiplier-display"></div>
    </div>
    <div class="blitz-overlay" id="blitz-overlay">
      <span class="blitz-text">⚡ BLITZ MODE ⚡</span>
    </div>
    <div class="progress-bar">
      <div class="progress-fill" id="progress-fill"></div>
    </div>
  `;
  return hud;
}

export function updateHUD(hud: HTMLElement, snapshot: GameSnapshot): void {
  const scoreEl = hud.querySelector('#score-display')!;
  const timerEl = hud.querySelector('#timer-display')!;
  const goalEl = hud.querySelector('#goal-display')!;
  const timerRing = hud.querySelector('#timer-ring') as SVGPathElement;
  const comboEl = hud.querySelector('#combo-display')!;
  const levelEl = hud.querySelector('#level-display')!;
  const multiplierEl = hud.querySelector('#multiplier-display')!;
  const blitzOverlay = hud.querySelector('#blitz-overlay')!;
  const progressFill = hud.querySelector('#progress-fill') as HTMLElement;

  scoreEl.textContent = snapshot.score.toLocaleString();
  timerEl.textContent = Math.ceil(snapshot.timeLeft).toString();
  goalEl.textContent = snapshot.goal.toLocaleString();

  const pct = (snapshot.timeLeft / 60) * 100;
  timerRing?.setAttribute('stroke-dasharray', `${pct}, 100`);

  if (snapshot.combo > 1) {
    comboEl.textContent = `${snapshot.combo}x COMBO!`;
    comboEl.classList.add('active');
  } else {
    comboEl.textContent = '';
    comboEl.classList.remove('active');
  }

  levelEl.textContent = `Level ${snapshot.level}`;

  if (snapshot.scoreMultiplier > 1) {
    multiplierEl.textContent = `${snapshot.scoreMultiplier}x`;
    multiplierEl.classList.add('active');
  } else {
    multiplierEl.textContent = '';
    multiplierEl.classList.remove('active');
  }

  blitzOverlay.classList.toggle('active', snapshot.blitzActive);

  const progress = Math.min(100, (snapshot.score / snapshot.goal) * 100);
  progressFill.style.width = `${progress}%`;
}

export function createMainMenu(): HTMLElement {
  const menu = document.createElement('div');
  menu.className = 'menu main-menu';
  menu.innerHTML = `
    <div class="menu-bg-stars"></div>
    <div class="menu-content">
      <div class="logo">
        <span class="logo-emoji">✨🏰✨</span>
        <h1>Magic Emoji Blitz</h1>
        <p class="tagline">Match. Blast. Win!</p>
      </div>
      <div class="menu-stats" id="menu-stats"></div>
      <button class="btn btn-primary btn-large" id="btn-play">▶ PLAY</button>
      <button class="btn btn-secondary" id="btn-levels">📋 Levels</button>
      <button class="btn btn-secondary" id="btn-how">❓ How to Play</button>
      <button class="btn btn-icon" id="btn-sound" title="Toggle Sound">🔊</button>
    </div>
  `;
  return menu;
}

export function updateMainMenuStats(menu: HTMLElement, progress: {
  highScore: number;
  currentLevel: number;
  coins: number;
  dailyStreak: number;
}): void {
  const stats = menu.querySelector('#menu-stats')!;
  stats.innerHTML = `
    <div class="stat"><span class="stat-val">${progress.highScore.toLocaleString()}</span><span class="stat-lbl">Best</span></div>
    <div class="stat"><span class="stat-val">${progress.currentLevel}</span><span class="stat-lbl">Level</span></div>
    <div class="stat"><span class="stat-val">${progress.coins}</span><span class="stat-lbl">Coins</span></div>
    <div class="stat"><span class="stat-val">${progress.dailyStreak}🔥</span><span class="stat-lbl">Streak</span></div>
  `;
}

export function createGameOverScreen(won: boolean, snapshot: GameSnapshot): HTMLElement {
  const screen = document.createElement('div');
  screen.className = 'menu overlay-screen';
  screen.innerHTML = `
    <div class="menu-content result-content">
      <div class="result-icon">${won ? '🎉' : '⏰'}</div>
      <h2>${won ? 'Level Complete!' : 'Time\'s Up!'}</h2>
      <div class="result-stats">
        <div class="result-stat">
          <span class="result-label">Score</span>
          <span class="result-value">${snapshot.score.toLocaleString()}</span>
        </div>
        <div class="result-stat">
          <span class="result-label">Goal</span>
          <span class="result-value">${snapshot.goal.toLocaleString()}</span>
        </div>
        <div class="result-stat">
          <span class="result-label">Max Combo</span>
          <span class="result-value">${snapshot.maxCombo}x</span>
        </div>
        <div class="result-stat">
          <span class="result-label">Matches</span>
          <span class="result-value">${snapshot.totalMatches}</span>
        </div>
        <div class="result-stat">
          <span class="result-label">Coins</span>
          <span class="result-value">+${snapshot.coinsEarned} 🪙</span>
        </div>
      </div>
      ${won
        ? '<button class="btn btn-primary btn-large" id="btn-next">Next Level ▶</button>'
        : '<button class="btn btn-primary btn-large" id="btn-retry">Try Again ↻</button>'
      }
      <button class="btn btn-secondary" id="btn-menu">Main Menu</button>
    </div>
  `;
  return screen;
}

export function createHowToPlay(): HTMLElement {
  const screen = document.createElement('div');
  screen.className = 'menu overlay-screen';
  const emojis = Object.entries(EMOJI_MAP).map(([type, emoji]) =>
    `<div class="how-item"><span class="how-emoji">${emoji}</span><div><strong>${EMOJI_NAMES[type as keyof typeof EMOJI_NAMES]}</strong><br>${ABILITY_DESCRIPTIONS[type as keyof typeof ABILITY_DESCRIPTIONS]}</div></div>`
  ).join('');

  screen.innerHTML = `
    <div class="menu-content how-content">
      <h2>How to Play</h2>
      <div class="how-steps">
        <p>👆 <strong>Swap</strong> adjacent emojis to match 3 or more</p>
        <p>⏱️ Score as many points as you can in 60 seconds</p>
        <p>🎯 Reach the goal to advance to the next level</p>
        <p>⚡ Chain matches for combos and BLITZ mode!</p>
      </div>
      <h3>Character Powers</h3>
      <div class="how-characters">${emojis}</div>
      <h3>Power-Ups</h3>
      <div class="how-steps">
        <p>Match 4 → Line Clear (↔️ or ↕️)</p>
        <p>Match 5 → Rainbow Star 🌈</p>
        <p>L/T Shape → Bomb 💥</p>
      </div>
      <button class="btn btn-primary" id="btn-back">← Back</button>
    </div>
  `;
  return screen;
}

export function createLevelSelect(currentLevel: number): HTMLElement {
  const screen = document.createElement('div');
  screen.className = 'menu overlay-screen';
  const levels = Array.from({ length: 10 }, (_, i) => {
    const lvl = i + 1;
    const locked = lvl > currentLevel;
    return `<button class="level-btn ${locked ? 'locked' : ''}" data-level="${lvl}" ${locked ? 'disabled' : ''}>
      ${locked ? '🔒' : lvl}
    </button>`;
  }).join('');

  screen.innerHTML = `
    <div class="menu-content">
      <h2>Select Level</h2>
      <div class="level-grid">${levels}</div>
      <button class="btn btn-secondary" id="btn-back">← Back</button>
    </div>
  `;
  return screen;
}

export function showAbilityToast(container: HTMLElement, emoji: string, text: string): void {
  const toast = document.createElement('div');
  toast.className = 'ability-toast';
  toast.innerHTML = `<span>${emoji}</span> ${text}`;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 1500);
}

export function haptic(type: 'light' | 'medium' | 'heavy' = 'light'): void {
  if ('vibrate' in navigator) {
    const patterns = { light: 10, medium: 25, heavy: 50 };
    navigator.vibrate(patterns[type]);
  }
}
