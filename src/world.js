import { Cell, Colony, BLOOM_THRESHOLD } from './colony.js';

export const MAX_CELLS = 6000;

export function createWorld() {
  return {
    cells: [],
    colonies: [],
    spores: [],
    bloomCount: 0,
  };
}

export function spawnColony(world, x, y) {
  if (world.cells.length > MAX_CELLS) return;
  const col = new Colony(x, y);
  world.colonies.push(col);
  for (let i = 0; i < 3; i++) {
    const c = new Cell(
      x + (Math.random() - 0.5) * 4,
      y + (Math.random() - 0.5) * 4,
      col.id,
      0
    );
    col.cells.push(c);
    world.cells.push(c);
  }
}

export function spawnSporeRain(world, W, H, count = 12) {
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      world.spores.push({
        x: Math.random() * W,
        y: -10,
        vx: (Math.random() - 0.5) * 1.2,
        vy: 0.6 + Math.random() * 1.0,
        life: 1,
      });
    }, i * 80);
  }
}

function growColony(world, col) {
  if (world.cells.length >= MAX_CELLS) return;
  const source = col.cells[Math.floor(Math.random() * col.cells.length)];
  if (!source) return;

  const angle = Math.random() * Math.PI * 2;
  const dist = 3 + Math.random() * 5;
  const nx = source.x + Math.cos(angle) * dist;
  const ny = source.y + Math.sin(angle) * dist;

  if (nx < 1 || nx > world.W - 1 || ny < 1 || ny > world.H - 1) return;

  const nc = new Cell(nx, ny, col.id, source.generation + 1);
  col.cells.push(nc);
  world.cells.push(nc);

  if (!col.bloomed && col.cells.length >= BLOOM_THRESHOLD) {
    col.bloomed = true;
    world.bloomCount++;
    for (const c of col.cells) {
      c.bloomed = true;
      c.neonColor = col.neonColor;
    }
  }
}

export function tickWorld(world) {
  for (const col of world.colonies) {
    col.age++;
    col.sporeTimer--;

    const growRate = col.bloomed ? 3 : 2;
    for (let g = 0; g < growRate; g++) {
      if (Math.random() < 0.6) growColony(world, col);
    }

    if (col.sporeTimer <= 0 && world.cells.length < MAX_CELLS) {
      col.sporeTimer = 120 + Math.random() * 180;
      world.spores.push({
        x: col.x + (Math.random() - 0.5) * 20,
        y: col.y + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        life: 1,
      });
    }
  }

  for (let i = world.spores.length - 1; i >= 0; i--) {
    const s = world.spores[i];
    s.x += s.vx;
    s.y += s.vy;
    s.vx += (Math.random() - 0.5) * 0.1;
    s.vy += (Math.random() - 0.5) * 0.1;
    s.life -= 0.004;

    const outOfBounds = s.x < 0 || s.x > world.W || s.y < 0 || s.y > world.H;
    if (s.life <= 0 || outOfBounds) {
      if (s.life > 0.1 && !outOfBounds) {
        spawnColony(world, s.x, s.y);
      }
      world.spores.splice(i, 1);
    }
  }

  for (const c of world.cells) {
    c.age++;
    if (c.alpha < 1) c.alpha += 0.04;
  }
}
