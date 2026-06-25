# mycelium world

A generative simulation of growing mycelium networks. Colonies spread as white pixel threads, blooming into neon colors when they reach critical mass. Spores drift and seed new colonies.

Inspired by [mur mur](https://www.murmur.living/) — a speaker with a world inside.

---

## run it

No build step needed. Uses native ES modules.

```bash
# option 1 — VS Code Live Server extension (recommended)
# right-click index.html → "Open with Live Server"

# option 2 — Python
python3 -m http.server 8080

# option 3 — Node
npx serve .
```

Then open `http://localhost:8080` (or whatever port).

---

## interact

| action | result |
|---|---|
| click canvas | plant a colony at that point |
| `+ spawn` | random colony |
| `spore rain` | release spores across the canvas |
| `reset` | clear and restart |

---

## project structure

```
mycelium-world/
├── index.html
├── src/
│   ├── main.js        ← entry point, wires everything
│   ├── colony.js      ← Cell and Colony classes, NEON colors
│   ├── world.js       ← simulation logic (grow, spores, bloom)
│   └── renderer.js    ← pixel-perfect 1×1 drawing via fillRect + Bresenham lines
└── README.md
```

---

## how it works

**Cells** grow outward from a colony origin. Each tick, a random existing cell spawns a neighbor at a random angle, 3–8px away. The position is snapped to integer coordinates so every cell lands on an exact pixel.

**Bloom** triggers when a colony reaches 80 cells. All cells in that colony flip from white to their assigned neon color. The color is chosen randomly per colony from a palette of 10 neons.

**Spores** are ejected by colonies on a timer. They drift with slight random walk physics and plant a new colony on landing.

**Threads** connect sibling cells via Bresenham line algorithm — every pixel in the line is a 1×1 `fillRect`, keeping the aesthetic fully pixel-level.

---

## next steps

- [ ] sound layer — bloom events trigger tones via Web Audio API
- [ ] each neon color maps to a distinct pitch or instrument
- [ ] cluster shape influences sound character
- [ ] moisture / nutrient grid that shapes growth direction
- [ ] decay cycle — old colonies fade and enrich the ground
- [ ] export a frame as PNG

---

## built with

- Vanilla JS (ES modules, no bundler)
- Canvas 2D API
- No dependencies
