# Emoji Rush

**One file.** Open [`index.html`](index.html) in a mobile browser or desktop Chrome.

Soft-currency only — no real-money IAP.

## Core Match-3
- 7×7 board, 60s rounds, valid-only swaps with reject animation
- Gravity + cascades; specials (Lightning Cloud / Sun King / Rainbow Star) + combines
- Blitz Meter (3× score, pool 4, 5s); hero powers when charged
- 14 characters with rarity, unlock costs, unique spells
- Touch swipe, safe-area insets, Web Audio SFX/music

## Retention (Crossy Hop–style loops)
- **Currencies:** coins + gems (gems rarer; from pass/spin/gifts)
- **Daily gift / login streak** — claim once/day; streak grows reward
- **Hourly free crate** — claimable every 60 minutes
- **Battle Pass / Season Journey** — ~30 tiers, FREE + VIP tracks (VIP = 🪙 800 satire), 7-day FOMO clock
- **Daily Quests** — 3 seeded per calendar day with mid-day progress
- **Lucky Spin** — CSS prize wheel, 1 free/day or coins, pity meter
- **XP & player level** — level-ups grant coins
- **Shop** — soft boosters (Score ×2, +10s, Half Blitz, Coin Magnet) + gem→coin trades
- **Achievements** — 17 tracked goals with coin claims
- **Results juice** — stars, XP/pass bars, quest updates, optional coin revive (+15s)
- Persist everything in `localStorage` key `emojiRush_v2`

## Debug
`window.RUSH` exposes `{ save, grantCoins, grantXP, openScreen, grantGems, grantPassXP }`.

No install. No build. No CDN. No other files required.
