import { ANIM } from '../config/constants';
import type { BoardEvent } from '../types/events';
import type { Cell } from '../types/tile';

/**
 * View-layer contract. PixiJS implementation wires sprites/particles;
 * Unity ports map this to a BoardPresenter + tween engine.
 *
 * Tracks GridModel changes via BoardEvents only — never mutates gameplay state.
 */
export interface IRenderView {
  handleEvent(event: BoardEvent): void;
  setBlitzVisuals(active: boolean): void;
  dispose(): void;
}

export interface TileSpritePort {
  setPosition(uid: number, x: number, y: number): void;
  tweenTo(uid: number, x: number, y: number, ms: number): Promise<void>;
  spawn(uid: number, kind: string, emojiType: number | null, x: number, y: number): void;
  playClear(uid: number, ms: number): Promise<void>;
  remove(uid: number): void;
}

export interface MeterPort {
  setBlitz(value: number, active: boolean): void;
  setCharacter(value: number): void;
  setScore(score: number): void;
  setTimer(remaining: number): void;
}

export interface FxPort {
  playSwap(a: Cell, b: Cell, ms: number): Promise<void>;
  playReject(a: Cell, b: Cell, ms: number): Promise<void>;
  setNeonBackground(active: boolean): void;
}

/**
 * Reference RenderView orchestrating ports. Replace ports with PixiJS objects in app bootstrap.
 */
export class RenderView implements IRenderView {
  private animating = 0;

  constructor(
    private readonly tiles: TileSpritePort,
    private readonly meters: MeterPort,
    private readonly fx: FxPort,
    private readonly cellToWorld: (cell: Cell) => { x: number; y: number },
  ) {}

  get isBusy(): boolean {
    return this.animating > 0;
  }

  handleEvent(event: BoardEvent): void {
    switch (event.type) {
      case 'TilesSwapped':
        void this.track(this.fx.playSwap(event.a, event.b, ANIM.swapMs));
        break;
      case 'SwapRejected':
        void this.track(this.fx.playReject(event.a, event.b, ANIM.rejectMs));
        break;
      case 'TilesCleared':
        for (const cell of event.cells) {
          // uid resolution is app-specific; ports may key by cell during pop
          void cell;
        }
        void this.track(Promise.resolve());
        break;
      case 'TilesFell':
        for (const move of event.moves) {
          const to = this.cellToWorld(move.to);
          void this.track(this.tiles.tweenTo(move.uid, to.x, to.y, ANIM.fallPerCellMs));
        }
        break;
      case 'TilesSpawned':
        for (const spawn of event.spawns) {
          const to = this.cellToWorld(spawn.to);
          const startY = to.y - spawn.spawnDepth * (to.y); // layout supplies real cell size in app
          this.tiles.spawn(spawn.uid, spawn.kind, spawn.emojiType, to.x, startY);
          void this.track(this.tiles.tweenTo(spawn.uid, to.x, to.y, ANIM.spawnMs));
        }
        break;
      case 'SpecialSpawned': {
        const p = this.cellToWorld(event.cell);
        this.tiles.spawn(event.uid, event.kind, null, p.x, p.y);
        break;
      }
      case 'BlitzChanged':
        this.meters.setBlitz(event.value, event.active);
        this.setBlitzVisuals(event.active);
        break;
      case 'CharacterCharge':
        this.meters.setCharacter(event.value);
        break;
      case 'ScoreChanged':
        this.meters.setScore(event.score);
        break;
      case 'TimerChanged':
        this.meters.setTimer(event.remaining);
        break;
      default:
        break;
    }
  }

  setBlitzVisuals(active: boolean): void {
    this.fx.setNeonBackground(active);
  }

  dispose(): void {
    this.animating = 0;
  }

  private async track(p: Promise<void>): Promise<void> {
    this.animating++;
    try {
      await p;
    } finally {
      this.animating--;
    }
  }
}
