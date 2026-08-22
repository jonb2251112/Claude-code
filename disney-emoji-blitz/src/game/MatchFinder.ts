import type { EmojiType, MatchGroup, Position, SpecialType, TileData } from './types';

let nextId = 1;

export function resetTileIds(): void {
  nextId = 1;
}

export function createTile(type: EmojiType, row: number, col: number, special: SpecialType = 'none'): TileData {
  return { id: nextId++, type, special, row, col };
}

export function posKey(p: Position): string {
  return `${p.row},${p.col}`;
}

export function isAdjacent(a: Position, b: Position): boolean {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
}

export function getRandomType(types: EmojiType[]): EmojiType {
  return types[Math.floor(Math.random() * types.length)];
}

export function findMatches(grid: (TileData | null)[][]): MatchGroup[] {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const groups: MatchGroup[] = [];

  for (let r = 0; r < rows; r++) {
    let c = 0;
    while (c < cols) {
      const tile = grid[r][c];
      if (!tile) { c++; continue; }
      let len = 1;
      while (c + len < cols && grid[r][c + len]?.type === tile.type) len++;
      if (len >= 3) {
        const tiles: Position[] = [];
        for (let i = 0; i < len; i++) tiles.push({ row: r, col: c + i });
        groups.push({ tiles, type: tile.type, isHorizontal: true, length: len });
      }
      c += Math.max(len, 1);
    }
  }

  for (let c = 0; c < cols; c++) {
    let r = 0;
    while (r < rows) {
      const tile = grid[r][c];
      if (!tile) { r++; continue; }
      let len = 1;
      while (r + len < rows && grid[r + len][c]?.type === tile.type) len++;
      if (len >= 3) {
        const tiles: Position[] = [];
        for (let i = 0; i < len; i++) tiles.push({ row: r + i, col: c });
        groups.push({ tiles, type: tile.type, isHorizontal: false, length: len });
      }
      r += Math.max(len, 1);
    }
  }

  return mergeOverlappingGroups(groups);
}

function mergeOverlappingGroups(groups: MatchGroup[]): MatchGroup[] {
  if (groups.length <= 1) return groups;

  const merged: MatchGroup[] = [];
  const used = new Set<number>();

  for (let i = 0; i < groups.length; i++) {
    if (used.has(i)) continue;
    let current = { ...groups[i], tiles: [...groups[i].tiles] };

    for (let j = i + 1; j < groups.length; j++) {
      if (used.has(j)) continue;
      const other = groups[j];
      if (current.type !== other.type) continue;

      const overlap = current.tiles.some(t =>
        other.tiles.some(o => o.row === t.row && o.col === t.col)
      );
      if (overlap) {
        for (const t of other.tiles) {
          if (!current.tiles.some(c => c.row === t.row && c.col === t.col)) {
            current.tiles.push(t);
          }
        }
        current.length = current.tiles.length;
        used.add(j);
      }
    }
    merged.push(current);
    used.add(i);
  }

  return merged.filter(g => g.tiles.length >= 3);
}

export function determineSpecial(match: MatchGroup): SpecialType {
  if (match.tiles.length >= 5) return 'rainbow';
  if (match.tiles.length === 4) return match.isHorizontal ? 'row' : 'col';

  // L or T shape (5+ tiles from merged groups with length 4 each direction)
  const rows = new Set(match.tiles.map(t => t.row));
  const cols = new Set(match.tiles.map(t => t.col));
  if (rows.size >= 2 && cols.size >= 2 && match.tiles.length >= 5) return 'bomb';
  if (match.tiles.length >= 5) return 'bomb';

  return 'none';
}

export function getSpecialCenter(match: MatchGroup): Position {
  const mid = Math.floor(match.tiles.length / 2);
  return match.tiles[mid];
}

export function wouldCreateMatch(
  grid: (TileData | null)[][],
  a: Position,
  b: Position
): boolean {
  const copy = grid.map(row => row.map(t => t ? { ...t } : null));
  swapTiles(copy, a, b);
  return findMatches(copy).length > 0;
}

export function swapTiles(grid: (TileData | null)[][], a: Position, b: Position): void {
  const ta = grid[a.row][a.col];
  const tb = grid[b.row][b.col];
  grid[a.row][a.col] = tb;
  grid[b.row][b.col] = ta;
  if (grid[a.row][a.col]) {
    grid[a.row][a.col]!.row = a.row;
    grid[a.row][a.col]!.col = a.col;
  }
  if (grid[b.row][b.col]) {
    grid[b.row][b.col]!.row = b.row;
    grid[b.row][b.col]!.col = b.col;
  }
}

export function applyGravity(
  grid: (TileData | null)[][],
  types: EmojiType[]
): { moved: Map<number, { from: Position; to: Position }>; spawned: TileData[] } {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const moved = new Map<number, { from: Position; to: Position }>();
  const spawned: TileData[] = [];

  for (let c = 0; c < cols; c++) {
    let writeRow = rows - 1;
    for (let r = rows - 1; r >= 0; r--) {
      const tile = grid[r][c];
      if (tile) {
        if (r !== writeRow) {
          moved.set(tile.id, { from: { row: r, col: c }, to: { row: writeRow, col: c } });
          grid[writeRow][c] = tile;
          tile.row = writeRow;
          tile.col = c;
          grid[r][c] = null;
        }
        writeRow--;
      }
    }
    for (let r = writeRow; r >= 0; r--) {
      const type = getRandomType(types);
      const tile = createTile(type, r, c);
      grid[r][c] = tile;
      spawned.push(tile);
    }
  }

  return { moved, spawned };
}

export function getTilesToClear(
  grid: (TileData | null)[][],
  matches: MatchGroup[]
): Set<string> {
  const toClear = new Set<string>();

  for (const match of matches) {
    for (const t of match.tiles) {
      toClear.add(posKey(t));
    }
  }

  return toClear;
}

export function getSpecialClearPositions(
  grid: (TileData | null)[][],
  pos: Position,
  special: SpecialType,
  type: EmojiType
): Position[] {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const result: Position[] = [];

  switch (special) {
    case 'row':
      for (let c = 0; c < cols; c++) result.push({ row: pos.row, col: c });
      break;
    case 'col':
      for (let r = 0; r < rows; r++) result.push({ row: r, col: pos.col });
      break;
    case 'bomb':
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const r = pos.row + dr;
          const c = pos.col + dc;
          if (r >= 0 && r < rows && c >= 0 && c < cols) result.push({ row: r, col: c });
        }
      }
      break;
    case 'rainbow':
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (grid[r][c]?.type === type) result.push({ row: r, col: c });
        }
      }
      break;
  }

  return result;
}

export function hasPossibleMoves(grid: (TileData | null)[][]): boolean {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const pos = { row: r, col: c };
      if (c + 1 < cols && wouldCreateMatch(grid, pos, { row: r, col: c + 1 })) return true;
      if (r + 1 < rows && wouldCreateMatch(grid, pos, { row: r + 1, col: c })) return true;
    }
  }
  return false;
}

export function shuffleGrid(grid: (TileData | null)[][], types: EmojiType[]): void {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const tiles: TileData[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c]) tiles.push(grid[r][c]!);
    }
  }

  // Fisher-Yates shuffle types
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = tiles[i].type;
    tiles[i].type = tiles[j].type;
    tiles[j].type = tmp;
  }

  let idx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c]) {
        grid[r][c] = tiles[idx++];
        grid[r][c]!.row = r;
        grid[r][c]!.col = c;
        grid[r][c]!.special = 'none';
      }
    }
  }

  // If still no moves, reassign random types
  if (!hasPossibleMoves(grid)) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c]) grid[r][c]!.type = getRandomType(types);
      }
    }
  }
}
