import './styles/main.css';
import { Board } from './game/Board';
import { EMOJI_MAP, ABILITY_DESCRIPTIONS } from './game/types';
import { soundManager } from './audio/SoundManager';
import { saveManager } from './storage/SaveManager';
import { ParticleSystem, getEmojiColor } from './ui/Particles';
import {
  GameRenderer,
  createHUD,
  updateHUD,
  createMainMenu,
  updateMainMenuStats,
  createGameOverScreen,
  createHowToPlay,
  createLevelSelect,
  showAbilityToast,
  haptic,
} from './ui/GameRenderer';

class GameApp {
  private app: HTMLElement;
  private board: Board | null = null;
  private renderer: GameRenderer | null = null;
  private particles: ParticleSystem | null = null;
  private hud: HTMLElement | null = null;
  private gameContainer: HTMLElement | null = null;
  private overlay: HTMLElement | null = null;
  private prevBlitz = false;
  private prevCombo = 0;
  private blitzInterval: ReturnType<typeof setInterval> | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor() {
    this.app = document.getElementById('app')!;
    this.showMainMenu();
    this.registerServiceWorker();
  }

  private registerServiceWorker(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }

  private clearOverlay(): void {
    this.overlay?.remove();
    this.overlay = null;
  }

  private showMainMenu(): void {
    this.cleanupGame();
    this.app.innerHTML = '';
    const menu = createMainMenu();
    this.app.appendChild(menu);

    const progress = saveManager.getProgress();
    updateMainMenuStats(menu, progress);

    menu.querySelector('#btn-play')!.addEventListener('click', () => {
      soundManager.resume();
      this.startGame(progress.currentLevel);
    });

    menu.querySelector('#btn-levels')!.addEventListener('click', () => {
      this.showLevelSelect(progress.currentLevel);
    });

    menu.querySelector('#btn-how')!.addEventListener('click', () => {
      this.showHowToPlay();
    });

    const soundBtn = menu.querySelector('#btn-sound')!;
    soundBtn.textContent = soundManager.isEnabled() ? '🔊' : '🔇';
    soundBtn.addEventListener('click', () => {
      soundManager.setEnabled(!soundManager.isEnabled());
      soundBtn.textContent = soundManager.isEnabled() ? '🔊' : '🔇';
    });
  }

  private showHowToPlay(): void {
    this.clearOverlay();
    const how = createHowToPlay();
    this.app.appendChild(how);
    this.overlay = how;
    how.querySelector('#btn-back')!.addEventListener('click', () => {
      how.remove();
      this.overlay = null;
    });
  }

  private showLevelSelect(currentLevel: number): void {
    this.clearOverlay();
    const screen = createLevelSelect(currentLevel);
    this.app.appendChild(screen);
    this.overlay = screen;

    screen.querySelectorAll('.level-btn:not(.locked)').forEach(btn => {
      btn.addEventListener('click', () => {
        const level = Number((btn as HTMLElement).dataset.level);
        soundManager.resume();
        screen.remove();
        this.overlay = null;
        this.startGame(level);
      });
    });

    screen.querySelector('#btn-back')!.addEventListener('click', () => {
      screen.remove();
      this.overlay = null;
    });
  }

  private startGame(level: number): void {
    this.cleanupGame();
    this.app.innerHTML = '';

    this.gameContainer = document.createElement('div');
    this.gameContainer.className = 'game-container';

    this.hud = createHUD();
    this.gameContainer.appendChild(this.hud);

    const pauseBtn = document.createElement('button');
    pauseBtn.className = 'pause-btn';
    pauseBtn.textContent = '⏸';
    pauseBtn.addEventListener('click', () => this.board?.pause());
    this.gameContainer.appendChild(pauseBtn);

    const gameArea = document.createElement('div');
    gameArea.className = 'game-area';

    const particleCanvas = document.createElement('canvas');
    particleCanvas.className = 'particle-canvas';
    gameArea.appendChild(particleCanvas);

    const boardContainer = document.createElement('div');
    boardContainer.style.position = 'relative';
    boardContainer.style.flex = '1';
    boardContainer.style.display = 'flex';
    boardContainer.style.alignItems = 'center';
    gameArea.appendChild(boardContainer);

    this.gameContainer.appendChild(gameArea);
    this.app.appendChild(this.gameContainer);

    this.particles = new ParticleSystem(particleCanvas);
    requestAnimationFrame(() => this.particles!.resize());

    this.board = new Board(level);
    this.renderer = new GameRenderer(boardContainer, (a, b) => this.handleSwap(a, b));

    this.unsubscribe = this.board.subscribe(snapshot => this.onStateChange(snapshot));
    this.board.startLevel(level);

    window.addEventListener('resize', this.handleResize);
  }

  private handleResize = (): void => {
    this.particles?.resize();
  };

  private async handleSwap(a: { row: number; col: number }, b: { row: number; col: number }): Promise<void> {
    if (!this.board) return;
    soundManager.playSwap();
    haptic('light');

    const result = await this.board.trySwap(a, b);
    if (!result) {
      soundManager.playInvalid();
      haptic('medium');
    }
  }

  private onStateChange(snapshot: ReturnType<Board['getSnapshot']>): void {
    if (!this.renderer || !this.hud || !this.particles) return;

    this.renderer.render(snapshot);
    updateHUD(this.hud, snapshot);

    // Sound & effects for matches
    if (snapshot.lastSwap?.valid && snapshot.lastSwap.scoreGained > 0) {
      soundManager.playMatch(snapshot.combo || 1);

      for (const ability of snapshot.lastSwap.abilitiesTriggered) {
        soundManager.playAbility();
        haptic('medium');
        showAbilityToast(
          this.gameContainer!,
          EMOJI_MAP[ability.type],
          ABILITY_DESCRIPTIONS[ability.type]
        );
      }

      if (snapshot.lastSwap.powerUpsCreated.length > 0) {
        soundManager.playPowerUp();
      }
    }

    // Blitz mode effects
    if (snapshot.blitzActive && !this.prevBlitz) {
      soundManager.playBlitz();
      haptic('heavy');
      this.blitzInterval = setInterval(() => this.particles!.blitzTrail(), 100);
    }
    if (!snapshot.blitzActive && this.prevBlitz) {
      if (this.blitzInterval) clearInterval(this.blitzInterval);
    }
    this.prevBlitz = snapshot.blitzActive;

    // Combo change
    if (snapshot.combo > this.prevCombo && snapshot.combo > 1) {
      haptic('light');
    }
    this.prevCombo = snapshot.combo;

    // Game end
    if (snapshot.state === 'gameover' || snapshot.state === 'levelcomplete') {
      this.handleGameEnd(snapshot);
    }

    // Paused
    if (snapshot.state === 'paused') {
      this.showPauseMenu();
    }
  }

  private showPauseMenu(): void {
    this.clearOverlay();
    const pause = document.createElement('div');
    pause.className = 'menu overlay-screen';
    pause.innerHTML = `
      <div class="menu-content">
        <h2>Paused</h2>
        <button class="btn btn-primary btn-large" id="btn-resume">▶ Resume</button>
        <button class="btn btn-secondary" id="btn-quit">Main Menu</button>
      </div>
    `;
    this.app.appendChild(pause);
    this.overlay = pause;

    pause.querySelector('#btn-resume')!.addEventListener('click', () => {
      pause.remove();
      this.overlay = null;
      this.board?.resume();
    });

    pause.querySelector('#btn-quit')!.addEventListener('click', () => {
      pause.remove();
      this.overlay = null;
      this.showMainMenu();
    });
  }

  private handleGameEnd(snapshot: ReturnType<Board['getSnapshot']>): void {
    const won = snapshot.state === 'levelcomplete';
    soundManager.playGameOver(won);

    saveManager.recordGame(
      snapshot.score,
      snapshot.level,
      won,
      snapshot.coinsEarned
    );

    setTimeout(() => {
      this.clearOverlay();
      const screen = createGameOverScreen(won, snapshot);
      this.app.appendChild(screen);
      this.overlay = screen;

      if (won) {
        screen.querySelector('#btn-next')!.addEventListener('click', () => {
          screen.remove();
          this.overlay = null;
          this.startGame(snapshot.level + 1);
        });
      } else {
        screen.querySelector('#btn-retry')!.addEventListener('click', () => {
          screen.remove();
          this.overlay = null;
          this.startGame(snapshot.level);
        });
      }

      screen.querySelector('#btn-menu')!.addEventListener('click', () => {
        screen.remove();
        this.overlay = null;
        this.showMainMenu();
      });
    }, 800);
  }

  private cleanupGame(): void {
    if (this.blitzInterval) clearInterval(this.blitzInterval);
    this.unsubscribe?.();
    this.board?.destroy();
    this.renderer?.destroy();
    this.particles?.clear();
    window.removeEventListener('resize', this.handleResize);
    this.board = null;
    this.renderer = null;
    this.particles = null;
    this.hud = null;
    this.gameContainer = null;
    this.prevBlitz = false;
    this.prevCombo = 0;
  }
}

new GameApp();
