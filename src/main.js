import { createWorld, spawnColony, spawnSporeRain, tickWorld, MAX_CELLS } from './world.js';
import { createRenderer, resizeCanvas, render } from './renderer.js';

const canvas = document.getElementById('c');
const info = document.getElementById('info');

const { ctx } = createRenderer(canvas);

let world = createWorld();

function init() {
  resizeCanvas(canvas);
  world.W = canvas.width;
  world.H = canvas.height;
  for (let i = 0; i < 4; i++) {
    spawnColony(
      world,
      60 + Math.random() * (canvas.width - 120),
      60 + Math.random() * (canvas.height - 120)
    );
  }
}

function reset() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  world = createWorld();
  world.W = canvas.width;
  world.H = canvas.height;
  for (let i = 0; i < 4; i++) {
    spawnColony(
      world,
      60 + Math.random() * (canvas.width - 120),
      60 + Math.random() * (canvas.height - 120)
    );
  }
}

function loop() {
  tickWorld(world);
  render(ctx, world);

  info.textContent =
    `colonies: ${world.colonies.length}  |  cells: ${world.cells.length}  |  bloomed: ${world.bloomCount}`;

  requestAnimationFrame(loop);
}

// Controls
document.getElementById('btn-spawn').addEventListener('click', () => {
  spawnColony(
    world,
    60 + Math.random() * (canvas.width - 120),
    60 + Math.random() * (canvas.height - 120)
  );
});

document.getElementById('btn-rain').addEventListener('click', () => {
  spawnSporeRain(world, canvas.width, canvas.height);
});

document.getElementById('btn-reset').addEventListener('click', reset);

// Click on canvas to plant a colony
canvas.addEventListener('click', (e) => {
  spawnColony(world, e.clientX, e.clientY);
});

// Resize
window.addEventListener('resize', () => {
  resizeCanvas(canvas);
  world.W = canvas.width;
  world.H = canvas.height;
});

init();
loop();
