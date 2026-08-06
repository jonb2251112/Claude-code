import type { BoardEvent, BoardListener, PlayerIntent } from '../../types/events';
import type { RoundState } from '../../types/events';
import type { RoundConfig } from '../../types/round';
import { isOrthogonalAdjacent } from '../../types/tile';
import type { ICharacterSpell } from '../../characters/ICharacterSpell';
import { BlitzMeter } from '../model/BlitzMeter';
import { CharacterMeter } from '../model/CharacterMeter';
import { GridModel } from '../model/GridModel';
import { RoundTimer } from '../model/RoundTimer';
import { ScoreModel } from '../model/ScoreModel';
import { TilePool } from '../model/TilePool';
import { CascadeRunner } from '../engine/CascadeRunner';
import { createRng } from '../engine/rng';
import { TileFactory } from '../engine/TileFactory';

/**
 * Top-level MVC Controller: round FSM, swap validation, Blitz lifecycle.
 */
export class GameController {
  readonly grid: GridModel;
  readonly score = new ScoreModel();
  readonly blitz = new BlitzMeter();
  readonly character = new CharacterMeter();
  readonly timer = new RoundTimer();
  readonly pool: TilePool;

  private state: RoundState = 'PreMatch';
  private readonly listeners = new Set<BoardListener>();
  private readonly cascade = new CascadeRunner();
  private readonly rng: () => number;
  private readonly factory: TileFactory;
  private readonly spell: ICharacterSpell;
  private readonly heroEmoji: number;
  private pendingBlitzEnd = false;
  private timePauseRemaining = 0;

  constructor(config: RoundConfig, spell: ICharacterSpell) {
    this.heroEmoji = config.heroEmoji;
    this.pool = new TilePool(config.emojiPool, config.heroEmoji);
    this.rng = createRng(config.seed);
    this.grid = new GridModel();
    this.factory = new TileFactory(this.grid, this.pool, this.rng);
    this.spell = spell;
  }

  get roundState(): RoundState {
    return this.state;
  }

  onEvent(listener: BoardListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: BoardEvent): void {
    for (const l of this.listeners) l(event);
  }

  private setState(state: RoundState): void {
    this.state = state;
    this.emit({ type: 'RoundState', state });
  }

  private cascadeCtx() {
    return {
      grid: this.grid,
      factory: this.factory,
      score: this.score,
      blitz: this.blitz,
      character: this.character,
      heroEmoji: this.heroEmoji,
      emit: (e: BoardEvent) => this.emit(e),
    };
  }

  /** Fill board and enter countdown/playing. */
  startRound(): void {
    this.factory.fillBoardAvoidingMatches();
    // Reshuffle while opening matches exist
    for (let i = 0; i < 20; i++) {
      const m = this.cascade.matcher.findMatches(this.grid);
      if (m.groups.length === 0) break;
      this.factory.fillBoardAvoidingMatches();
    }
    this.score.reset();
    this.character.reset();
    this.blitz.deactivate();
    this.timer.reset();
    this.setState('Countdown');
    // Immediate play for headless; View may delay
    this.setState('Playing');
    this.emit({ type: 'TimerChanged', remaining: this.timer.timeLeft });
    this.emit({ type: 'PoolChanged', pool: [...this.pool.types] });
  }

  handleIntent(intent: PlayerIntent): void {
    if (this.state !== 'Playing' && this.state !== 'Blitz') return;
    if (intent.type === 'swap') this.trySwap(intent.a, intent.b);
    else if (intent.type === 'power') this.tryCharacterPower();
  }

  private trySwap(a: { r: number; c: number }, b: { r: number; c: number }): void {
    if (!isOrthogonalAdjacent(a, b)) return;

    this.blitz.markActivity();
    this.grid.swap(a, b);

    const specialPlan = this.cascade.specialResolver.resolveSwap(
      this.grid,
      a,
      b,
      this.factory,
    );

    if (specialPlan) {
      this.emit({ type: 'TilesSwapped', a, b });
      this.withResolving(() => {
        this.cascade.runFromClearPlan(this.cascadeCtx(), specialPlan);
      });
      this.afterResolve();
      return;
    }

    const match = this.cascade.matcher.findMatches(this.grid);
    if (match.groups.length === 0) {
      this.grid.swap(a, b); // revert
      this.emit({ type: 'SwapRejected', a, b });
      return;
    }

    this.emit({ type: 'TilesSwapped', a, b });
    this.withResolving(() => {
      this.cascade.runFromMatch(this.cascadeCtx(), match);
    });
    this.afterResolve();
  }

  private tryCharacterPower(): void {
    if (!this.character.tryConsume()) return;
    this.blitz.markActivity();
    this.emit({ type: 'CharacterCharge', value: 0 });

    this.withResolving(() => {
      const result = this.spell.execute({
        grid: this.grid,
        factory: this.factory,
        heroEmoji: this.heroEmoji,
        rng: this.rng,
      });
      if (result.pauseTimerSec && this.state === 'Playing') {
        this.timePauseRemaining = Math.max(
          this.timePauseRemaining,
          result.pauseTimerSec,
        );
        this.timer.pause();
      }
      if (result.clearCells?.length) {
        this.cascade.runFromClearPlan(this.cascadeCtx(), {
          cells: result.clearCells,
          reason: 'character',
        });
      }
      if (result.spawnSpecials?.length) {
        for (const s of result.spawnSpecials) {
          const tile = this.factory.special(s.kind, s.cloudAxis);
          this.grid.setCell(s.cell, tile);
          this.emit({
            type: 'SpecialSpawned',
            cell: s.cell,
            kind: s.kind,
            uid: tile.uid,
          });
        }
      }
    });
    this.afterResolve();
  }

  private withResolving(fn: () => void): void {
    const prev = this.state;
    this.setState('Resolving');
    fn();
    // Restore Playing or Blitz unless Blitz ended while resolving
    if (this.pendingBlitzEnd) {
      this.finishBlitz();
    } else if (prev === 'Blitz' || this.blitz.isActive) {
      this.setState('Blitz');
    } else {
      this.setState('Playing');
    }
  }

  private afterResolve(): void {
    if (!this.blitz.isActive && this.blitz.percent >= 100) {
      this.enterBlitz();
    }
  }

  private enterBlitz(): void {
    this.blitz.activate();
    this.score.setBlitzActive(true);
    this.timer.pause();
    this.pool.enterBlitz(this.rng);
    this.setState('Blitz');
    this.emit({ type: 'BlitzChanged', value: 100, active: true });
    this.emit({ type: 'PoolChanged', pool: [...this.pool.types] });
  }

  private finishBlitz(): void {
    this.pendingBlitzEnd = false;
    this.blitz.deactivate();
    this.score.setBlitzActive(false);
    this.pool.exitBlitz();
    if (this.timePauseRemaining <= 0) this.timer.resume();
    this.setState(this.timer.isExpired ? 'RoundEnd' : 'Playing');
    this.emit({ type: 'BlitzChanged', value: 0, active: false });
    this.emit({ type: 'PoolChanged', pool: [...this.pool.types] });
  }

  /**
   * Per-frame tick. `dt` in seconds.
   */
  update(dt: number): void {
    this.blitz.beginFrame();

    if (this.timePauseRemaining > 0 && this.state === 'Playing') {
      this.timePauseRemaining = Math.max(0, this.timePauseRemaining - dt);
      if (this.timePauseRemaining === 0 && !this.blitz.isActive) {
        this.timer.resume();
      }
    }

    if (this.state === 'Playing') {
      const activated = this.blitz.tickDecay(dt, true);
      this.emit({
        type: 'BlitzChanged',
        value: this.blitz.percent,
        active: this.blitz.isActive,
      });
      if (activated) this.enterBlitz();

      this.timer.tick(dt);
      this.emit({ type: 'TimerChanged', remaining: this.timer.timeLeft });
      if (this.timer.isExpired) this.setState('RoundEnd');
    } else if (this.state === 'Blitz') {
      const ended = this.blitz.tickBlitz(dt);
      if (ended) this.finishBlitz();
    } else if (this.state === 'Resolving' && this.blitz.isActive) {
      // Hold Blitz completion until resolve ends
      if (this.blitz.blitzTimeLeft <= 0) {
        this.blitz.freezeBlitzEnd();
        this.pendingBlitzEnd = true;
      } else {
        this.blitz.tickBlitz(dt);
      }
    }
  }
}
