/**
 * Emoji Blitz Match-3 — public API surface for the pure gameplay core.
 */
export { GRID_ROWS, GRID_COLS } from './config/constants';
export { GameController } from './core/systems/GameController';
export { GridModel } from './core/model/GridModel';
export { MatchEngine } from './core/engine/MatchEngine';
export { CascadeRunner } from './core/engine/CascadeRunner';
export { SpecialResolver } from './core/engine/SpecialResolver';
export { InputController } from './controllers/InputController';
export { RenderView } from './views/RenderView';
export { spellRegistry } from './characters/SpellRegistry';
export type { RoundConfig } from './types/round';
export type { BoardEvent, PlayerIntent } from './types/events';
