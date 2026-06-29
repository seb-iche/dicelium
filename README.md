# D I C E L I U M

A digital ecosystem simulation and ambient audio experience. Colonies grow, bloom, compete for space, eject spores, and are consumed by evolving eaters — all generating a soundscape that responds in real time to the ecosystem's complexity.

**[Live demo →](https://dicelium.vercel.app)**

---

## What this is

Dicelium meets the actual criteria of a digital ecosystem:

| Criterion | How it's met |
|---|---|
| **Emergence** | Colony shapes and colour gradients arise from simple rules — no forms are programmed directly |
| **Interdependence** | Colonies, spores, eaters, and dust all depend on and affect each other |
| **Energy flow** | Spores carry colour lineage; eaters convert cells to scars and dust; dust seeds new colonies |
| **Self-regulation** | Colonies can't grow infinitely (eaters); eaters can't multiply infinitely (food-limited) |
| **Succession** | Sparse → dense → eater pressure → separation → dust → regrowth |
| **Biome differentiation** | Five environments producing genuinely different emergent behaviours |

---

## Five biomes

| Biome | Character | Growth rate | Max eaters |
|---|---|---|---|
| 🍂 Earthy | Warm ambers, slow dense spread | 0.45 | 4 |
| 🌊 Aquatic | Blues and cyans, flowing | 0.65 | 3 |
| ⚡ Weather | Purples and electric yellow, erratic | 0.80 | 4 |
| 🌋 Volcanic | Deep reds, aggressive | 0.70 | 10 |
| ❄️ Arctic | Pale blues and white, crystalline | 0.25 | 2 |

---

## Eater lifecycle

| Stage | Cells eaten | Size | Speed |
|---|---|---|---|
| Worm | 0–11 | 2px | 1× |
| Colour Worm | 12–34 | 2px | 1.3× |
| Thick Worm | 35–79 | 3px | 1.6× |
| Frog | 80+ | 4px | 2× |

---

## Audio

The soundscape scales with world complexity — an empty world is nearly silent, a full world hums with three drone layers, busy micro events, and periodic swells. Each colour family eaten by an eater triggers a distinct nature sound: blue = water drop, green = cricket, red = frog croak, yellow = bird trill, magenta = moth flutter, cyan = wind chime.

---

## Inspector

Hover over any colony, eater, spore, or dust to see a live tooltip. Click a colony or eater to open a detail panel showing bloom status, age, cell count, colour DNA, stage progression, and behaviour. Toggle with the 🔍 button.

---

## Project structure