# SIEGE: TEXT PROTOCOL
A 100% faithful text recreation of Tom Clancy's Rainbow Six Siege.

Not a generic shooter. Every core identity system is preserved:
destruction, sound-driven information warfare, drone/camera prep phase,
one-life rounds, utility economy, hard-breach vs. denial, and
plant/defuse tempo.

## Contents
- `rules-core.md` — match structure, timings, destruction, sound, intel
- `operators.md` — full operator profiles (stats, loadouts, gadgets, counters)
- `map-bank.md` — full breakdown of the classic map **Bank**
- `round-engine.md` — the playable turn loop and resolution rules

## The Loop
1. **Ban Phase** — 2 attacker + 2 defender bans
2. **Op Select** — 5 unique operators per side
3. **Preparation Phase (45s)** — attackers drone, defenders reinforce
4. **Action Phase (3:00)** — one life, no respawn
5. **Plant / Post-plant (45s defuser)**

## Win Conditions
**Attackers win by:** eliminating all defenders · planting the defuser and
letting it run 45s · (plant is required — killing everyone after a plant
still wins, but time expiring without a plant is a defender win)

**Defenders win by:** eliminating all attackers · disabling a planted
defuser (7s) · surviving the 3:00 action phase with no plant down
