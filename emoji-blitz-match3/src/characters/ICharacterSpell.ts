import type { Cell, CloudAxis, TileKind } from '../types/tile';
import type { GridModel } from '../core/model/GridModel';
import type { TileFactory } from '../core/engine/TileFactory';

export interface SpellContext {
  grid: GridModel;
  factory: TileFactory;
  heroEmoji: number;
  rng: () => number;
}

export interface SpellResult {
  clearCells?: Cell[];
  spawnSpecials?: Array<{
    cell: Cell;
    kind: Exclude<TileKind, 'Normal'>;
    cloudAxis?: CloudAxis;
  }>;
  pauseTimerSec?: number;
}

export interface ICharacterSpell {
  readonly id: string;
  readonly displayName: string;
  execute(ctx: SpellContext): SpellResult;
}
