# Emoji Blitz Match-3

Production-ready **technical specification** and **MVC architecture** for a mobile-first, 60-second Match-3 inspired by Disney Emoji Blitz.

## Docs

| Document | Contents |
|----------|----------|
| [`docs/TECH_SPEC.md`](docs/TECH_SPEC.md) | Full gameplay rules, Blitz Meter, specials, scoring, acceptance criteria |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | MVC separation, sequences, Unity port map, file layout |

## Stack

- **Primary:** TypeScript (strict) + PixiJS-ready view ports
- **Alternate:** Same core maps 1:1 to Unity C# (see Architecture §13)
- **Tests:** Vitest against pure Model/Engine (no renderer)

## Core modules

```
GridModel          → 7×7 authoritative board
MatchEngine        → H/V run scan + L/T classify + flood merge
SpecialResolver    → Cloud / Sun / Star + all combine recipes
GravityEngine      → column pack + refill
CascadeRunner      → resolve loop
BlitzMeter         → +1%/clear, −2%/s idle, 5s Blitz @ 100%
CharacterMeter     → hero charge → spell
InputController    → drag/tap swap intents
RenderView         → event-driven animation ports
GameController     → round FSM wiring it all
```

## Play (single file)

Open [`index.html`](index.html) in a browser — one self-contained file with the full 60s Match-3 loop (board, specials, Blitz Meter, hero powers).

```bash
cd emoji-blitz-match3
# optional local server:
npx --yes serve -l 4173 .
# then visit http://localhost:4173
```

## Core tests

```bash
cd emoji-blitz-match3
npm install
npm test
npm run typecheck
```

## Example bootstrap

```ts
import { GameController, InputController, spellRegistry } from './src';

const spell = spellRegistry.get('pattern_x');
const game = new GameController(
  { heroEmoji: 0, emojiPool: [0, 1, 2, 3, 4], seed: 12345, characterSpellId: spell.id },
  spell,
);
game.onEvent((e) => render.handleEvent(e));
game.startRound();

const input = new InputController(layout, (intent) => game.handleIntent(intent));
// each frame:
game.update(dt);
```

## License

Spec and reference core for project use.
