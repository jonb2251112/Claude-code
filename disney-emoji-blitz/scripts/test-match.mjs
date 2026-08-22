import {
  createTile,
  findMatches,
  wouldCreateMatch,
  swapTiles,
  resetTileIds,
  applyGravity,
  getRandomType,
} from '../src/game/MatchFinder.ts';
import type { TileData } from '../src/game/types.ts';

resetTileIds();
const types = ['lion', 'mouse', 'snowflake', 'mermaid', 'castle'] as const;

function makeGrid(): (TileData | null)[][] {
  const grid: (TileData | null)[][] = [];
  for (let r = 0; r < 8; r++) {
    grid[r] = [];
    for (let c = 0; c < 7; c++) {
      grid[r][c] = createTile(getRandomType([...types]), r, c);
    }
  }
  return grid;
}

let foundMove = false;
const grid = makeGrid();

for (let r = 0; r < 8; r++) {
  for (let c = 0; c < 7; c++) {
    if (c + 1 < 7) {
      const a = { row: r, col: c };
      const b = { row: r, col: c + 1 };
      if (wouldCreateMatch(grid, a, b)) {
        foundMove = true;
        const copy = grid.map(row => row.map(t => t ? { ...t } : null));
        swapTiles(copy, a, b);
        const matches = findMatches(copy);
        console.log(`Valid swap at (${r},${c})<->(${r},${c+1}): ${matches.length} matches, lengths: ${matches.map(m => m.length).join(',')}`);
      }
    }
  }
}

console.log('Found valid moves:', foundMove);
console.log('Initial matches (should be 0):', findMatches(grid).length);
