import type { ICharacterSpell } from './ICharacterSpell';
import { ColumnCrushSpell } from './spells/ColumnCrushSpell';
import { GuaranteedStarsSpell } from './spells/GuaranteedStarsSpell';
import { PatternXSpell } from './spells/PatternXSpell';
import { TimePauseSpell } from './spells/TimePauseSpell';

const SPELLS: ICharacterSpell[] = [
  new PatternXSpell(),
  new GuaranteedStarsSpell(),
  new TimePauseSpell(),
  new ColumnCrushSpell(),
];

export class SpellRegistry {
  private readonly byId = new Map(SPELLS.map((s) => [s.id, s]));

  get(id: string): ICharacterSpell {
    const spell = this.byId.get(id);
    if (!spell) throw new Error(`Unknown spell: ${id}`);
    return spell;
  }

  list(): ICharacterSpell[] {
    return [...this.byId.values()];
  }
}

export const spellRegistry = new SpellRegistry();
