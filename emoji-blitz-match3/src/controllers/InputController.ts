import type { Cell } from '../types/tile';
import type { PlayerIntent } from '../types/events';

export interface BoardLayout {
  originX: number;
  originY: number;
  cellSize: number;
  cols: number;
  rows: number;
}

export type IntentHandler = (intent: PlayerIntent) => void;

/**
 * Captures drag vectors and tap-to-swap within board cell bounds.
 * Framework-agnostic: feed pointer events from PixiJS, DOM, or Unity.
 */
export class InputController {
  private layout: BoardLayout;
  private handler: IntentHandler;
  private downCell: Cell | null = null;
  private gestureLocked = false;
  private readonly dragThresholdRatio: number;

  constructor(
    layout: BoardLayout,
    handler: IntentHandler,
    dragThresholdRatio = 0.3,
  ) {
    this.layout = layout;
    this.handler = handler;
    this.dragThresholdRatio = dragThresholdRatio;
  }

  setLayout(layout: BoardLayout): void {
    this.layout = layout;
  }

  setHandler(handler: IntentHandler): void {
    this.handler = handler;
  }

  screenToCell(x: number, y: number): Cell | null {
    const { originX, originY, cellSize, cols, rows } = this.layout;
    const c = Math.floor((x - originX) / cellSize);
    const r = Math.floor((y - originY) / cellSize);
    if (r < 0 || c < 0 || r >= rows || c >= cols) return null;
    return { r, c };
  }

  onPointerDown(x: number, y: number): void {
    this.downCell = this.screenToCell(x, y);
    this.gestureLocked = false;
  }

  onPointerMove(x: number, y: number): void {
    if (!this.downCell || this.gestureLocked) return;
    const { originX, originY, cellSize } = this.layout;
    const cx = originX + (this.downCell.c + 0.5) * cellSize;
    const cy = originY + (this.downCell.r + 0.5) * cellSize;
    const dx = x - cx;
    const dy = y - cy;
    const thresh = cellSize * this.dragThresholdRatio;
    if (Math.abs(dx) < thresh && Math.abs(dy) < thresh) return;

    let target: Cell;
    if (Math.abs(dx) > Math.abs(dy)) {
      target = { r: this.downCell.r, c: this.downCell.c + (dx > 0 ? 1 : -1) };
    } else {
      target = { r: this.downCell.r + (dy > 0 ? 1 : -1), c: this.downCell.c };
    }

    if (
      target.r < 0 ||
      target.c < 0 ||
      target.r >= this.layout.rows ||
      target.c >= this.layout.cols
    ) {
      return;
    }

    this.gestureLocked = true;
    this.handler({ type: 'swap', a: this.downCell, b: target });
    this.downCell = null;
  }

  onPointerUp(x: number, y: number): void {
    if (this.gestureLocked) {
      this.downCell = null;
      this.gestureLocked = false;
      return;
    }
    const up = this.screenToCell(x, y);
    if (this.downCell && up) {
      if (this.downCell.r === up.r && this.downCell.c === up.c) {
        // tap select only — second tap handled by storing selection externally if desired
      } else {
        this.handler({ type: 'swap', a: this.downCell, b: up });
      }
    }
    this.downCell = null;
  }

  onCharacterPowerTap(): void {
    this.handler({ type: 'power' });
  }
}
