# Emoji Rush

A single-file mobile Match-3 inspired by **Disney Emoji Blitz** cloud UI and systems — original characters, soft currency only.

## Run

```bash
npx serve -l 4173 .
```

Open `http://127.0.0.1:4173/`

## What’s included (~10k lines)

- **Play HUD:** coin + ear-hat pills, purple score pill, `:60` timer bubble, dark-blue checkerboard board, pink top track, purple blitz rail, hero-on-cloud + lightning meter
- **Specials (EB rules):** Lightning Cloud (swipe axis), Sunshine (row+col cross), Rainbow Star, full combines
- **Blitz Mode** ×3 score, hero powers, cascades/combos
- **Meta:** lives regen, missions hub, emoji collection + levels/dupes, Silver/Gold/Series/Diamond boxes, prize wheel, events, battle pass, quests, achievements
- **Debug:** `window.RUSH` in the console (`findValidMove`, `trySwap`, `fillBlitz`, `fillPower`, …)

## Build

Sources live in `eb-build/` (`ui.css`, `ui.html`, `shell.js`, `extra_content.js`, `engine.js`). Assemble with:

```bash
python3 eb-build/assemble.py
```
