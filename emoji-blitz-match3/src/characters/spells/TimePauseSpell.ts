import { TIME_PAUSE_SPELL_SEC } from '../../config/balance';
import type { ICharacterSpell, SpellContext, SpellResult } from '../ICharacterSpell';

/** Pauses the main countdown briefly (non-Blitz). */
export class TimePauseSpell implements ICharacterSpell {
  readonly id = 'time_pause';
  readonly displayName = 'Frozen Moment';

  execute(_ctx: SpellContext): SpellResult {
    return { pauseTimerSec: TIME_PAUSE_SPELL_SEC };
  }
}
