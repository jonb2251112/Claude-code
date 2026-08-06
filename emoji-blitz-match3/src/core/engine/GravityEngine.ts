import { GRID_COLS, GRID_ROWS } from '../../config/constants';
import type { FallMove, SpawnSpec } from '../../types/events';
import type { GridModel } from '../model/GridModel';
import type { TileFactory } from './TileFactory';

export interface GravityPlan {
  moves: FallMove[];
  spawns: SpawnSpec[];
}

/**
 * Physics-style fallback is View-only. This engine packs columns downward
 * and spawns new tiles at the top so the board stays fully occupied.
 */
export class GravityEngine {
  compactAndRefill(grid: GridModel, factory: TileFactory): GravityPlan {
    const moves: FallMove[] = [];
    const spawns: SpawnSpec[] = [];

    for (let c = 0; c < GRID_COLS; c++) {
      const surviving: { tile: NonNullable<ReturnType<GridModel['get']>>; fromR: number }[] =
        [];
      for (let r = GRID_ROWS - 1; r >= 0; r--) {
        const t = grid.get(r, c);
        if (t) surviving.push({ tile: t, fromR: r });
      }

      for (let r = 0; r < GRID_ROWS; r++) grid.set(r, c, null);

      let dest = GRID_ROWS - 1;
      for (const { tile, fromR } of surviving) {
        grid.set(dest, c, tile);
        if (fromR !== dest) {
          moves.push({
            uid: tile.uid,
            from: { r: fromR, c },
            to: { r: dest, c },
          });
        }
        dest--;
      }

      let spawnDepth = 1;
      for (let r = dest; r >= 0; r--) {
        const tile = factory.normal();
        grid.set(r, c, tile);
        spawns.push({
          uid: tile.uid,
          to: { r, c },
          kind: tile.kind,
          emojiType: tile.emojiType,
          cloudAxis: tile.cloudAxis,
          spawnDepth: spawnDepth++,
        });
      }
    }

    return { moves, spawns };
  }
}
