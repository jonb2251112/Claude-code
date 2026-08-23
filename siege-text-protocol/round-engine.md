# ROUND ENGINE — HOW A PLAYED ROUND RESOLVES

## Turn Structure
A round is played as a sequence of **decision beats**. At each beat you
receive:

1. **CLOCK** — time remaining in the current phase
2. **STATE** — your position, HP, ammo, gadget charges, team status
3. **INTEL** — only what you could actually see or hear
4. **OPTIONS** — a numbered list of legal actions

You reply with a number (or free-form intent). The engine then resolves
the beat, applies enemy AI/teammate behaviour, advances the clock by a
realistic amount, and reports the **audio log** of what happened.

## Time Costs (per action)
| Action | Cost |
|---|---|
| Crouch-walk one room | 6–9s |
| Walk one room | 4–6s |
| Sprint one room | 2–4s (loud) |
| Rappel up a facade | 5s |
| Vault a window | 2s (loud) |
| Place a reinforcement | 5s (loud) |
| Place a jammer / ADS / cam | 3s |
| Deploy hard breach + detonate | 8–12s (very loud) |
| Sledge a soft wall | 3–5s (loud) |
| Drone a room from safety | 5–10s |
| Plant the defuser | 7.5s (loud, locks you in place) |

## Resolution Rules
Duels are not coin flips. The engine weighs, in order:

1. **Information** — did you know they were there? Unknown contact is
   a large penalty.
2. **Angle** — tight angle held vs. wide swing; peeker's advantage
   favours the mover into a wide angle, the holder into a tight one.
3. **Positioning** — head-glitch/cover, elevation, lean.
4. **Sound discipline** — did you sprint into the room?
5. **Utility state** — flashed, concussed, gassed, slowed, DBNO'd.
6. **Fire rate / TTK** — weapon class and range band.

Bad information beats good aim. A player who drones properly wins duels
they would have lost blind.

## Audio Log
Every beat ends with an audio log written from **your** ears only:

> `[AUDIO] Reinforcement — BELOW you, west. x2.`
> `[AUDIO] Barricade break — SAME FLOOR, east. Loud.`
> `[AUDIO] Silence.`

Silence is information too.

## Death & Spectating
When you die you stay in the round as a **spectator** on your
teammates and drones/cameras — you keep making callouts, and your
callouts affect your team's AI behaviour. The round continues.

## Scoring Your Play
After each round you get a rank-expression readout:
- **Positioning** — did you hold winnable angles?
- **Timing** — did you move with your team or alone?
- **Utility** — did your gadget affect the objective?
- **Game sense** — did you act on the information you actually had?

That readout is the "rank" in this recreation. Aim and reflex are
simulated; **decision quality is what you are actually graded on.**
