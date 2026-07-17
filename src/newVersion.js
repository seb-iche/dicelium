/**
 * newVersion.js
 * Entry point for the ASCII-rendering prototype. Identical simulation
 * wiring to main.js (same engine, same biome picker, same controls) —
 * the only difference is that renderAscii draws cells as coloured digits
 * instead of flat squares.
 */

import { createWorld, spawnColony, tickWorld } from './world.js';
import { createRenderer, resizeCanvas } from './renderer.js';
import { renderAscii } from './asciiRenderer.js';
import { AudioEngine } from './audio.js';
import { BIOMES } from './biomes.js';

const canvas      = document.getElementById('c');
const info        = document.getElementById('info');
const timerEl     = document.getElementById('timer');
const biomeLabel  = document.getElementById('biome-label');
const startScreen = document.getElementById('start-screen');
const btnMute     = document.getElementById('btn-mute');
const btnMenu     = document.getElementById('btn-menu');

const { ctx } = createRenderer(canvas);
const audio = new AudioEngine();

let world = null;
let running = false;
let startTime = null;
let currentBiome = 'earthy';
let muted = false;

function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

function toggleMute() {
  if (!audio.started) return;
  muted = !muted;
  const now = audio.ctx.currentTime;
  if (muted) {
    audio.master.gain.linearRampToValueAtTime(0, now + 0.2);
    btnMute.textContent = '🔇';
    btnMute.classList.add('active');
  } else {
    const targetGain = 0.05 + audio.complexity * 0.25;
    audio.master.gain.linearRampToValueAtTime(targetGain, now + 0.2);
    btnMute.textContent = '🔊';
    btnMute.classList.remove('active');
  }
}

function goToMenu() {
  if (audio.started) audio.stopAll();
  running = false;
  window.location.reload();
}

function initWorld(biomeKey) {
  resizeCanvas(canvas);
  world = createWorld(biomeKey);
  world.audio = audio;
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
  if (audio.started) audio.stopAll();
  muted = false;
  btnMute.textContent = '🔊';
  btnMute.classList.remove('active');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  startTime = performance.now();
  initWorld(currentBiome);
  if (audio.started) audio.setBiome(currentBiome);
}

function loop() {
  if (!running) return;
  tickWorld(world);
  renderAscii(ctx, world);
  timerEl.textContent = formatTime(performance.now() - startTime);
  info.textContent = `colonies: ${world.colonies.length}  |  cells: ${world.cells.length}  |  bloomed: ${world.bloomCount}`;
  requestAnimationFrame(loop);
}

document.querySelectorAll('.biome-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    currentBiome = btn.dataset.biome;
    biomeLabel.textContent = (BIOMES[currentBiome]?.name || currentBiome).toLowerCase();
    await audio.start();
    audio.setBiome(currentBiome);
    startScreen.classList.add('hidden');
    setTimeout(() => startScreen.remove(), 1600);
    startTime = performance.now();
    initWorld(currentBiome);
    running = true;
    loop();
  });
});

document.getElementById('btn-spawn').addEventListener('click', () => {
  if (!world) return;
  spawnColony(world, 60 + Math.random() * (canvas.width - 120), 60 + Math.random() * (canvas.height - 120));
});

document.getElementById('btn-reset').addEventListener('click', () => reset());
btnMenu.addEventListener('click', goToMenu);
btnMute.addEventListener('click', toggleMute);

window.addEventListener('resize', () => {
  resizeCanvas(canvas);
  if (world) { world.W = canvas.width; world.H = canvas.height; }
});
