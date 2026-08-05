# SONIC — Green Hill Zone

A single-file browser recreation of classic Sonic the Hedgehog mobile / Genesis-style gameplay set in **Green Hill Zone Act 1**.

## Play

Open `index.html` in a modern browser (double-click or drag into Chrome/Safari/Firefox).

Or serve locally:

```bash
cd sonic-green-hill
python3 -m http.server 8080
```

## Controls

| Action | Keyboard | Touch |
|--------|----------|-------|
| Move | ← → / A D | D-pad |
| Jump | ↑ / Z / J | A |
| Roll / Spindash | ↓ + X / Space / K | ↓ + B |

## Features

- One self-contained `index.html` (CSS + JS inlined)
- Classic momentum physics (accel, skid, roll, spindash, variable jump)
- Green Hill Zone art: checkered dirt, grass blades, palms, purple flowers, water sparkles, waterfall
- Rings, Motobug enemies, springs, star post checkpoint, goal sign
- SCORE / TIME / RINGS / lives HUD
- Title card, pause, Act Clear results
- Mobile on-screen controls

Fan recreation for educational / portfolio use — not affiliated with SEGA.
