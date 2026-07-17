/**
 * worldView.js
 * Entry point for /world: renders every spawn regenerated from its seed at
 * its stored position, with touch pan/zoom, a spawn counter, polling
 * refresh, and claim-code lookup. Viewport-culled and detail-tiered so it
 * holds framerate with hundreds of organisms on a mid-range phone.
 */

import { resizeCanvas } from './renderer.js';
import { growToMaturity, extractRenderData } from './organism.js';
import { CELL_SIZE } from './world.js';
import { supabase } from './supabaseClient.js';
import {
  createCamera, attachCameraControls, panZoomTo, updateCameraAnimation, worldToScreen,
} from './camera.js';

/** BASE_RADIUS — elastic world sizing: worldRadius = BASE_RADIUS * sqrt(spawnCount) */
const BASE_RADIUS = 300;
/** FULL_DETAIL_SCREEN_RADIUS — below this on-screen radius (px), draw a cheap dot instead of cells */
const FULL_DETAIL_SCREEN_RADIUS = 14;
/** POLL_MS — background refresh interval (no Realtime this sprint) */
const POLL_MS = 30000;
/** GROW_CHUNK — organisms grown per animation-frame slice, to avoid blocking the main thread */
const GROW_CHUNK = 20;
/** HIGHLIGHT_MS — how long a looked-up organism's ring glows */
const HIGHLIGHT_MS = 2500;

const canvas       = document.getElementById('c');
const ctx          = canvas.getContext('2d');
const counterEl    = document.getElementById('spawn-counter');
const refreshBtn   = document.getElementById('refresh-btn');
const loadingEl    = document.getElementById('world-loading');
const lookupForm   = document.getElementById('lookup-form');
const lookupInput  = document.getElementById('lookup-input');
const lookupStatus = document.getElementById('lookup-status');

resizeCanvas(canvas);
window.addEventListener('resize', () => resizeCanvas(canvas));

const camera = createCamera({ x: 0, y: 0, zoom: 1 });
attachCameraControls(canvas, camera);

/** organisms — Map<seed string, { worldX, worldY, radius, colorA, cells, highlightUntil }> */
const organisms = new Map();
let hasFramedInitialView = false;

/**
 * growPending
 * Purpose:  Grow newly-seen spawns to maturity in small chunks across
 *           animation frames so a large batch never blocks the main thread.
 * Input:    spawnRows  Object[]  — { seed, x, y } rows not yet in `organisms`
 * Output:   Promise<void>  — resolves once every row has been grown
 */
function growPending(spawnRows) {
  return new Promise((resolve) => {
    let i = 0;
    function step() {
      const end = Math.min(i + GROW_CHUNK, spawnRows.length);
      for (; i < end; i++) {
        const row = spawnRows[i];
        const world = growToMaturity(Number(row.seed));
        const renderData = extractRenderData(world);
        organisms.set(row.seed, {
          worldX: row.x, worldY: row.y, highlightUntil: 0, ...renderData,
        });
      }
      if (i < spawnRows.length) requestAnimationFrame(step);
      else resolve();
    }
    step();
  });
}

/**
 * updateCounter
 * Purpose:  Refresh the spawn-count HUD text.
 * Input:    none
 * Output:   void
 */
function updateCounter() {
  const count = organisms.size;
  counterEl.textContent = `${count} organism${count === 1 ? '' : 's'} and growing`;
}

/**
 * frameInitialView
 * Purpose:  On first load, fit the camera to the elastic world radius so
 *           the whole (small, early-conference) world is visible at once.
 * Input:    none
 * Output:   void
 */
function frameInitialView() {
  const worldRadius = BASE_RADIUS * Math.sqrt(Math.max(1, organisms.size));
  const fitDim = Math.min(canvas.width, canvas.height);
  camera.zoom = Math.min(4, Math.max(0.05, fitDim / (worldRadius * 2.4)));
}

/**
 * loadSpawns
 * Purpose:  Fetch all spawns, grow any not already cached, and refresh
 *           the counter. Used for the initial load, manual refresh, and
 *           the background poll.
 * Input:    none
 * Output:   Promise<void>
 */
async function loadSpawns() {
  const { data, error } = await supabase.from('spawns').select('seed,x,y');
  if (error || !data) return;

  const pending = data.filter((row) => !organisms.has(row.seed));
  if (pending.length > 0) await growPending(pending);

  updateCounter();
  if (!hasFramedInitialView) {
    frameInitialView();
    hasFramedInitialView = true;
  }
}

/**
 * lookupClaimCode
 * Purpose:  Find the spawn for a claim code, pan/zoom the camera to it,
 *           and highlight it briefly.
 * Input:    code  string
 * Output:   Promise<void>
 */
async function lookupClaimCode(code) {
  const { data, error } = await supabase
    .from('spawns')
    .select('seed,x,y')
    .eq('claim_code', code)
    .single();

  if (error || !data) {
    lookupStatus.textContent = 'no organism with that code';
    return;
  }
  if (!organisms.has(data.seed)) await growPending([data]);

  const org = organisms.get(data.seed);
  org.highlightUntil = performance.now() + HIGHLIGHT_MS;
  panZoomTo(camera, data.x, data.y, 1.6);
  lookupStatus.textContent = 'found it — panning over';
}

/**
 * draw
 * Purpose:  Render every visible organism, tiered by on-screen size:
 *           full cell detail when large enough to matter, otherwise a
 *           single cheap dot. Fully off-screen organisms are skipped.
 * Input:    now  number  — performance.now() timestamp
 * Output:   void
 */
function draw(now) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const org of organisms.values()) {
    const screen = worldToScreen(camera, canvas, org.worldX, org.worldY);
    const screenRadius = org.radius * camera.zoom;

    if (
      screen.x + screenRadius < 0 || screen.x - screenRadius > canvas.width ||
      screen.y + screenRadius < 0 || screen.y - screenRadius > canvas.height
    ) continue;

    if (screenRadius < FULL_DETAIL_SCREEN_RADIUS) {
      const size = Math.max(3, screenRadius * 1.2);
      ctx.fillStyle = org.colorA;
      ctx.fillRect(screen.x - size / 2, screen.y - size / 2, size, size);
    } else {
      const cellPx = Math.max(1, CELL_SIZE * camera.zoom);
      for (const cell of org.cells) {
        ctx.fillStyle = cell.rgba;
        ctx.fillRect(
          screen.x + cell.dx * camera.zoom,
          screen.y + cell.dy * camera.zoom,
          cellPx, cellPx,
        );
      }
    }

    if (now < org.highlightUntil) {
      const pulse = 0.5 + 0.5 * Math.sin(now / 120);
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, screenRadius + 14 + pulse * 6, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(125,255,176,${(0.5 + 0.3 * pulse).toFixed(2)})`;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  }
}

function loop() {
  const now = performance.now();
  updateCameraAnimation(camera, now);
  draw(now);
  requestAnimationFrame(loop);
}

async function init() {
  await loadSpawns();
  loadingEl.classList.add('hidden');
  requestAnimationFrame(loop);
  setInterval(loadSpawns, POLL_MS);
}
init();

refreshBtn.addEventListener('click', loadSpawns);

lookupForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const code = lookupInput.value.trim();
  if (!code) return;
  lookupStatus.textContent = 'searching…';
  lookupClaimCode(code);
});
