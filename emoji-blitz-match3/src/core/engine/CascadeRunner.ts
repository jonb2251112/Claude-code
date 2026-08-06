import { MAX_CASCADE_DEPTH } from '../../config/constants';
import type { BoardEvent, BoardListener, ClearReason } from '../../types/events';
import type { Cell } from '../../types/tile';
import type { BlitzMeter } from '../model/BlitzMeter';
import type { CharacterMeter } from '../model/CharacterMeter';
import type { GridModel } from '../model/GridModel';
import type { ScoreModel } from '../model/ScoreModel';
import { GravityEngine } from './GravityEngine';
import { MatchEngine, type MatchResult } from './MatchEngine';
import { SpecialResolver, type ClearPlan } from './SpecialResolver';
import type { TileFactory } from './TileFactory';

export interface CascadeContext {
  grid: GridModel;
  factory: TileFactory;
  score: ScoreModel;
  blitz: BlitzMeter;
  character: CharacterMeter;
  heroEmoji: number;
  emit: BoardListener;
}

/**
 * Drives match → clear → special spawn → gravity → refill until stable.
 * Synchronous by default; GameController may await view animations between steps.
 */
export class CascadeRunner {
  private readonly matchEngine = new MatchEngine();
  private readonly gravity = new GravityEngine();
  private readonly specials = new SpecialResolver();

  get matcher(): MatchEngine {
    return this.matchEngine;
  }

  get specialResolver(): SpecialResolver {
    return this.specials;
  }

  /**
   * Apply an initial clear plan (from swap match or special), then cascade.
   */
  runFromClearPlan(ctx: CascadeContext, plan: ClearPlan): void {
    this.applyPlan(ctx, plan, 0);
    this.cascade(ctx, 1);
  }

  runFromMatch(ctx: CascadeContext, match: MatchResult): void {
    this.applyMatch(ctx, match, 0);
    this.cascade(ctx, 1);
  }

  private cascade(ctx: CascadeContext, depth: number): void {
    while (depth <= MAX_CASCADE_DEPTH) {
      const match = this.matchEngine.findMatches(ctx.grid);
      if (match.groups.length === 0) return;
      this.applyMatch(ctx, match, depth);
      depth++;
    }
    ctx.emit({
      type: 'RoundState',
      state: 'Resolving',
    });
    // Soft-cap reached; stop to protect frame budget.
  }

  private applyPlan(ctx: CascadeContext, plan: ClearPlan, depth: number): void {
    if (plan.transforms?.length) {
      for (const tr of plan.transforms) {
        const existing = ctx.grid.getCell(tr.cell);
        const tile =
          tr.kind === 'LightningCloud'
            ? ctx.factory.special('LightningCloud', tr.cloudAxis)
            : tr.kind === 'SunKing'
              ? ctx.factory.special('SunKing')
              : ctx.factory.special('RainbowStar');
        // Preserve uid if replacing in place for smoother FX
        if (existing) tile.uid = existing.uid;
        ctx.grid.setCell(tr.cell, tile);
        ctx.emit({
          type: 'SpecialSpawned',
          cell: tr.cell,
          kind: tr.kind,
          uid: tile.uid,
        });
      }
    }

    let cells = plan.cells;
    if (plan.triggerAfterTransform?.length) {
      cells = this.specials.expandTriggers(ctx.grid, plan.triggerAfterTransform);
    }

    this.clearAndRefill(ctx, cells, plan.reason, depth);
  }

  private applyMatch(ctx: CascadeContext, match: MatchResult, depth: number): void {
    // Clear matched cells first (spawn seats reserved by MatchEngine)
    this.clearCellsOnly(ctx, match.clearCells, depth > 0 ? 'cascade' : 'match', depth);

    for (const spawn of match.specialSpawns) {
      const tile =
        spawn.kind === 'LightningCloud'
          ? ctx.factory.special('LightningCloud', spawn.cloudAxis)
          : spawn.kind === 'SunKing'
            ? ctx.factory.special('SunKing')
            : ctx.factory.special('RainbowStar');
      ctx.grid.setCell(spawn.cell, tile);
      ctx.emit({
        type: 'SpecialSpawned',
        cell: spawn.cell,
        kind: spawn.kind,
        uid: tile.uid,
      });
    }

    // Also clear spawn cells' previous contents conceptually already replaced;
    // gravity for holes from clearCells:
    const plan = this.gravity.compactAndRefill(ctx.grid, ctx.factory);
    if (plan.moves.length) ctx.emit({ type: 'TilesFell', moves: plan.moves });
    if (plan.spawns.length) ctx.emit({ type: 'TilesSpawned', spawns: plan.spawns });
  }

  private clearAndRefill(
    ctx: CascadeContext,
    cells: Cell[],
    reason: ClearReason,
    depth: number,
  ): void {
    this.clearCellsOnly(ctx, cells, reason, depth);
    const plan = this.gravity.compactAndRefill(ctx.grid, ctx.factory);
    if (plan.moves.length) ctx.emit({ type: 'TilesFell', moves: plan.moves });
    if (plan.spawns.length) ctx.emit({ type: 'TilesSpawned', spawns: plan.spawns });
  }

  private clearCellsOnly(
    ctx: CascadeContext,
    cells: Cell[],
    reason: ClearReason,
    depth: number,
  ): void {
    if (cells.length === 0) return;

    let heroClears = 0;
    for (const cell of cells) {
      const t = ctx.grid.getCell(cell);
      if (t?.kind === 'Normal' && t.emojiType === ctx.heroEmoji) heroClears++;
    }

    const delta = ctx.score.award(cells.length, reason, depth);
    ctx.blitz.addClears(cells.length);
    ctx.character.addHeroClears(heroClears);

    ctx.grid.clearCells(cells);

    const events: BoardEvent[] = [
      { type: 'TilesCleared', cells, reason, scoreDelta: delta },
      { type: 'ScoreChanged', score: ctx.score.total, delta },
      { type: 'BlitzChanged', value: ctx.blitz.percent, active: ctx.blitz.isActive },
      { type: 'CharacterCharge', value: ctx.character.percent },
    ];
    for (const e of events) ctx.emit(e);
  }
}
