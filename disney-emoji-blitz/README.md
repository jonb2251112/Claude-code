# Magic Emoji Blitz

A fast-paced, mobile-optimized match-3 puzzle game inspired by Disney Emoji Blitz. Swap magical emojis, trigger character powers, chain combos, and race against the clock in 60-second blitz rounds.

## Features

- **Match-3 Gameplay** — Swap adjacent emojis to match 3 or more on a 7×8 grid
- **7 Magical Characters** — Each emoji has a unique power (row clear, time bonus, column freeze, and more)
- **Power-Ups** — Match 4 for line clears, match 5 for rainbow stars, L/T shapes for bombs
- **Blitz Mode** — Chain 5+ consecutive matches to enter 2× score Blitz mode
- **10 Levels** — Progressively harder goals with new emoji types unlocked
- **Combo System** — Build multipliers with cascading matches
- **Progression** — Coins, daily streaks, achievements, and high scores saved locally
- **Mobile-First** — Touch/swipe controls, haptic feedback, PWA installable
- **Audio** — Procedural sound effects via Web Audio API
- **Particles** — Satisfying visual feedback on every match

## Quick Start

```bash
cd disney-emoji-blitz
npm install
npm run dev
```

Open on your phone or use Chrome DevTools mobile emulation. For production:

```bash
npm run build
npm run preview
```

## How to Play

1. Tap **PLAY** to start a 60-second round
2. **Swipe or tap** adjacent emojis to swap them
3. Match **3+** of the same emoji to clear them
4. Reach the **score goal** before time runs out
5. Chain matches for **combos** and **Blitz mode**

### Character Powers

| Emoji | Power |
|-------|-------|
| 🦁 Brave Lion | Clears entire row |
| 🐭 Magic Mouse | Adds +3 seconds |
| ❄️ Ice Queen | Clears entire column |
| 🧜‍♀️ Sea Princess | Clears bottom 2 rows |
| 🏰 Royal Castle | 2× score for 5 seconds |
| ⭐ Wishing Star | Rainbow blast |
| 💎 Magic Gem | +500 bonus points |

### Power-Ups

- **Match 4** → Line Clear (horizontal or vertical)
- **Match 5** → Rainbow Star (clears all of one type)
- **L/T Shape** → Bomb (clears 3×3 area)

## Tech Stack

- **Vite** — Fast bundling and HMR
- **TypeScript** — Type-safe game engine
- **Canvas** — Particle effects
- **Web Audio API** — Procedural sound
- **LocalStorage** — Save progression
- **Service Worker** — Offline PWA support

## Project Structure

```
src/
├── main.ts              # App entry, game loop orchestration
├── game/
│   ├── types.ts         # Types, constants, level configs
│   ├── MatchFinder.ts   # Match detection, gravity, specials
│   └── Board.ts         # Game state machine, scoring, abilities
├── ui/
│   ├── GameRenderer.ts  # DOM board rendering, HUD, menus
│   └── Particles.ts     # Canvas particle system
├── audio/
│   └── SoundManager.ts  # Web Audio sound effects
└── storage/
    └── SaveManager.ts   # LocalStorage persistence
```

## License

MIT
