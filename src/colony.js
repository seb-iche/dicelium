export const NEON = [
  '#ff00ff',
  '#00ffff',
  '#39ff14',
  '#ff6600',
  '#ff0080',
  '#7700ff',
  '#00ff88',
  '#ffff00',
  '#ff3300',
  '#00ccff',
];

export const BLOOM_THRESHOLD = 80;

export class Cell {
  constructor(x, y, colonyId, generation) {
    this.x = Math.floor(x);
    this.y = Math.floor(y);
    this.colonyId = colonyId;
    this.generation = generation;
    this.age = 0;
    this.alpha = 0;
    this.bloomed = false;
    this.neonColor = null;
  }
}

export class Colony {
  constructor(x, y) {
    this.id = Math.random();
    this.x = Math.floor(x);
    this.y = Math.floor(y);
    this.age = 0;
    this.cells = [];
    this.bloomed = false;
    this.neonColor = NEON[Math.floor(Math.random() * NEON.length)];
    this.sporeTimer = 80 + Math.random() * 120;
  }
}
