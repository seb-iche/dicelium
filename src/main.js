/**
 * main.js
 * Entry point. Wires together the world simulation, renderer, audio engine,
 * and UI controls. Manages the start screen (biome selection), game loop,
 * timer, snapshot, recording, mute, back-to-menu, and inspector functionality.
 */

import { createWorld, spawnColony, tickWorld } from './world.js';
import { createRenderer, render } from './renderer.js';
import { AudioEngine } from './audio.js';
import { BIOMES } from './biomes.js';
import { onMouseMove, onMouseClick, updatePanel, setEnabled, isEnabled } from './inspector.js';

const canvas          = document.getElementById('c');
const info            = document.getElementById('info');
const timerEl         = document.getElementById('timer');
const biomeLabel      = document.getElementById('biome-label');
const startScreen     = document.getElementById('start-screen');
const btnSnapshot     = document.getElementById('btn-snapshot');
const btnRecord       = document.getElementById('btn-record');
const btnMute         = document.getElementById('btn-mute');
const btnMenu         = document.getElementById('btn-menu');
const btnInspect      = document.getElementById('btn-inspect');
const btnOptions      = document.getElementById('btn-options');
const btnOptionsClose = document.getElementById('btn-options-close');
const optionsSheet    = document.getElementById('options-sheet');
const optionsBackdrop = document.getElementById('options-backdrop');
const tapHint         = document.getElementById('tap-hint');

const { ctx } = createRenderer(canvas);
const audio = new AudioEngine();

let world = null;
let running = false;
let startTime = null;
let currentBiome = 'earthy';
let muted = false;
let tapHintTimer = null;

// ── Tap hint ──────────────────────────────────────────────────────────────────

/**
 * showTapHint
 * Purpose:  Reveal the "tap anywhere to spawn" affordance for first-time
 *           visitors. Auto-dismisses after a few seconds even if untouched.
 * Input:    none
 * Output:   void
 */
function showTapHint() {
  tapHint.classList.add('visible');
  tapHintTimer = setTimeout(dismissTapHint, 6000);
}

/**
 * dismissTapHint
 * Purpose:  Fade out the tap hint. Safe to call repeatedly.
 * Input:    none
 * Output:   void
 */
function dismissTapHint() {
  clearTimeout(tapHintTimer);
  tapHint.classList.remove('visible');
}

// ── Canvas fit ────────────────────────────────────────────────────────────────

/**
 * fitCanvasToViewport
 * Purpose:  Size the canvas backing store to the viewport at full device
 *           pixel density (so it renders crisp on retina screens) while
 *           keeping every draw call and world coordinate in CSS-pixel
 *           space via a context transform. Scoped to this page only —
 *           the shared resizeCanvas() in renderer.js (used by join/world)
 *           is untouched.
 * Input:    canvas  HTMLCanvasElement  (mutated)
 * Output:   { width: number, height: number }  — CSS-pixel logical size
 */
function fitCanvasToViewport(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const cssW = window.innerWidth;
  const cssH = window.innerHeight;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { width: cssW, height: cssH };
}

// ── Timer ─────────────────────────────────────────────────────────────────────

/**
 * formatTime
 * Purpose:  Convert milliseconds to HH:MM:SS display string.
 * Input:    ms  number
 * Output:   string
 */
function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

// ── Snapshot ──────────────────────────────────────────────────────────────────

/**
 * takeSnapshot
 * Purpose:  Export current canvas frame as PNG download.
 * Input:    none
 * Output:   void
 */
function takeSnapshot() {
  const link = document.createElement('a');
  link.download = `mycelium-${currentBiome}-${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// ── Mute ──────────────────────────────────────────────────────────────────────

/**
 * toggleMute
 * Purpose:  Toggle master audio gain between 0 and complexity-driven level.
 * Input:    none
 * Output:   void
 */
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

// ── Menu ──────────────────────────────────────────────────────────────────────

/**
 * goToMenu
 * Purpose:  Stop simulation and audio, reload page to show the start screen.
 * Input:    none
 * Output:   void
 */
function goToMenu() {
  if (audio.started) audio.stopAll();
  if (isRecording) stopRecording();
  running = false;
  window.location.reload();
}

// ── Recording ─────────────────────────────────────────────────────────────────

let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;

/**
 * startRecording
 * Purpose:  Capture canvas + Web Audio as a combined WebM file.
 * Input:    none
 * Output:   Promise<void>
 */
async function startRecording() {
  try {
    const canvasStream = canvas.captureStream(30);
    const dest = audio.ctx.createMediaStreamDestination();
    audio.master.connect(dest);
    const combined = new MediaStream([
      ...canvasStream.getTracks(),
      ...dest.stream.getTracks(),
    ]);
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(combined, { mimeType: 'video/webm' });
    mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `mycelium-${currentBiome}-${Date.now()}.webm`;
      link.href = url; link.click();
      URL.revokeObjectURL(url);
    };
    mediaRecorder.start();
    isRecording = true;
    btnRecord.textContent = '⏹';
    btnRecord.classList.add('active');
  } catch (err) {
    alert('Recording not supported. Try Chrome.');
  }
}

/**
 * stopRecording
 * Purpose:  Stop MediaRecorder and trigger WebM download.
 * Input:    none
 * Output:   void
 */
function stopRecording() {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
    isRecording = false;
    btnRecord.textContent = '⏺';
    btnRecord.classList.remove('active');
  }
}

// ── World lifecycle ───────────────────────────────────────────────────────────

/**
 * initWorld
 * Purpose:  Create and seed a new world for the given biome.
 * Input:    biomeKey  string
 * Output:   void
 */
function initWorld(biomeKey) {
  const { width, height } = fitCanvasToViewport(canvas);
  world = createWorld(biomeKey);
  world.audio = audio;
  world.W = width;
  world.H = height;
  for (let i = 0; i < 4; i++) {
    spawnColony(
      world,
      60 + Math.random() * (width - 120),
      60 + Math.random() * (height - 120)
    );
  }
}

/**
 * reset
 * Purpose:  Stop audio and recording, clear canvas, reinitialise world.
 * Input:    none
 * Output:   void
 */
function reset() {
  if (audio.started) audio.stopAll();
  if (isRecording) stopRecording();
  muted = false;
  btnMute.textContent = '🔊';
  btnMute.classList.remove('active');
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  startTime = performance.now();
  initWorld(currentBiome);
  if (audio.started) audio.setBiome(currentBiome);
}

// ── Main loop ─────────────────────────────────────────────────────────────────

/**
 * loop
 * Purpose:  requestAnimationFrame loop — tick, render, update HUD and panel.
 * Input:    none
 * Output:   void
 */
function loop() {
  if (!running) return;
  tickWorld(world);
  render(ctx, world, false);
  updatePanel();
  timerEl.textContent = formatTime(performance.now() - startTime);
  info.textContent = `colonies: ${world.colonies.length}  |  cells: ${world.cells.length}  |  bloomed: ${world.bloomCount}`;
  requestAnimationFrame(loop);
}

// ── Event listeners ───────────────────────────────────────────────────────────

document.getElementById('btn-about').addEventListener('click', () => {
  document.getElementById('about-overlay').classList.remove('hidden');
});
document.getElementById('btn-about-close').addEventListener('click', () => {
  document.getElementById('about-overlay').classList.add('hidden');
});
document.getElementById('btn-about-start')?.addEventListener('click', () => {
  document.getElementById('about-overlay').classList.remove('hidden');
});
document.getElementById('about-overlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('about-overlay')) {
    document.getElementById('about-overlay').classList.add('hidden');
  }
});

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
    showTapHint();
    loop();
  });
});

document.getElementById('btn-spawn').addEventListener('click', () => {
  if (!world) return;
  dismissTapHint();
  spawnColony(world, 60 + Math.random() * (world.W - 120), 60 + Math.random() * (world.H - 120));
});

document.getElementById('btn-reset').addEventListener('click', () => reset());
btnMenu.addEventListener('click', goToMenu);
btnSnapshot.addEventListener('click', takeSnapshot);
btnMute.addEventListener('click', toggleMute);
btnRecord.addEventListener('click', () => { if (isRecording) stopRecording(); else startRecording(); });

btnInspect.addEventListener('click', () => {
  const nowEnabled = !isEnabled();
  setEnabled(nowEnabled);
  if (nowEnabled) {
    btnInspect.classList.remove('active');
    btnInspect.textContent = '🔍 inspect: on';
    btnInspect.title = 'inspect on — tap to disable';
  } else {
    btnInspect.classList.add('active');
    btnInspect.textContent = '🔍 inspect: off';
    btnInspect.title = 'inspect off — tap to enable';
  }
});

// ── Options sheet ─────────────────────────────────────────────────────────────

function openOptions() {
  optionsSheet.classList.remove('hidden');
  optionsBackdrop.classList.remove('hidden');
}

function closeOptions() {
  optionsSheet.classList.add('hidden');
  optionsBackdrop.classList.add('hidden');
}

btnOptions.addEventListener('click', openOptions);
btnOptionsClose.addEventListener('click', closeOptions);
optionsBackdrop.addEventListener('click', closeOptions);

window.addEventListener('resize', () => {
  const { width, height } = fitCanvasToViewport(canvas);
  if (world) { world.W = width; world.H = height; }
});

window.addEventListener('mousemove', (e) => {
  if (world?.es) { world.es.mouse.x = e.clientX; world.es.mouse.y = e.clientY; }
  if (world && running) onMouseMove(world, e.clientX, e.clientY);
});

// Desktop mouse: click still opens the inspector panel, unchanged.
canvas.addEventListener('click', (e) => {
  if (world && running) onMouseClick(world, e.clientX, e.clientY);
});

// Touch: a quick tap spawns an organism where you tapped; a long press
// (500ms, held roughly in place) opens the inspector panel instead, so the
// two gestures don't fight over the same input.
const LONG_PRESS_MS = 500;
const PRESS_MOVE_CANCEL_PX = 12;
let touchPressTimer = null;
let touchPressStart = null;
let touchLongPressFired = false;

canvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'touch' || !world || !running) return;
  e.preventDefault(); // suppresses the compatibility mousedown/click that would otherwise double-fire
  touchLongPressFired = false;
  touchPressStart = { x: e.clientX, y: e.clientY };
  touchPressTimer = setTimeout(() => {
    touchLongPressFired = true;
    onMouseClick(world, e.clientX, e.clientY);
  }, LONG_PRESS_MS);
});

canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'touch' || !touchPressStart) return;
  const dx = e.clientX - touchPressStart.x, dy = e.clientY - touchPressStart.y;
  if (Math.hypot(dx, dy) > PRESS_MOVE_CANCEL_PX) {
    clearTimeout(touchPressTimer);
    touchPressStart = null;
  }
});

canvas.addEventListener('pointerup', (e) => {
  if (e.pointerType !== 'touch') return;
  clearTimeout(touchPressTimer);
  if (touchPressStart && !touchLongPressFired && world && running) {
    dismissTapHint();
    spawnColony(world, e.clientX, e.clientY);
  }
  touchPressStart = null;
});

canvas.addEventListener('pointercancel', () => {
  clearTimeout(touchPressTimer);
  touchPressStart = null;
});