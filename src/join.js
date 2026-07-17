/**
 * join.js
 * Entry point for the /join spawn flow: name/phrase -> deterministic seed ->
 * organism bloom (reusing the existing growth engine) -> claim code + email.
 *
 * The spawn row is inserted exactly once, on the email step (explicit save
 * or a short auto-save timeout) rather than at bloom time, because the
 * spawns table's RLS policy allows inserts only — no client-side updates —
 * so email can't be attached to the row after the fact.
 */

import { createRenderer, resizeCanvas, render } from './renderer.js';
import { createOrganismWorld, tickOrganism } from './organism.js';
import { hashStringToSeed } from './rng.js';
import { generateClaimCode } from './claimcode.js';
import { isWorldSealed, pickPosition, persistSpawn } from './spawnStore.js';

/** AUTO_SAVE_MS — grace period after bloom before the spawn auto-saves */
const AUTO_SAVE_MS = 6000;

const canvas        = document.getElementById('c');
const joinScreen     = document.getElementById('join-screen');
const joinForm       = document.getElementById('join-form');
const joinInput      = document.getElementById('join-input');
const sealedMessage  = document.getElementById('sealed-message');
const claimPanel     = document.getElementById('claim-panel');
const claimCodeEl    = document.getElementById('claim-code');
const claimCopyBtn   = document.getElementById('claim-copy');
const emailInput     = document.getElementById('email-input');
const emailSubmit    = document.getElementById('email-submit');
const emailStatus    = document.getElementById('email-status');

const { ctx } = createRenderer(canvas);
resizeCanvas(canvas);
window.addEventListener('resize', () => resizeCanvas(canvas));

/** spawnRecord — the current spawn's data, kept in memory until it's persisted */
let spawnRecord = null;
let autoSaveTimer = null;
let finalized = false;

/**
 * normalizeInput
 * Purpose:  Fold whitespace/case so equivalent names hash consistently.
 * Input:    raw  string
 * Output:   string
 */
function normalizeInput(raw) {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * bloom
 * Purpose:  Grow and animate the organism for the given seed until mature,
 *           then reveal the claim panel. Never waits on the network.
 * Input:    seed  number  — uint32 seed
 * Output:   void
 */
function bloom(seed) {
  const world = createOrganismWorld(seed, canvas.width, canvas.height);

  function frame() {
    const { done } = tickOrganism(world);
    render(ctx, world);
    if (!done) {
      requestAnimationFrame(frame);
    } else {
      revealClaimPanel();
    }
  }
  requestAnimationFrame(frame);
}

/**
 * revealClaimPanel
 * Purpose:  Show the claim code + email capture once the bloom has matured,
 *           and arm the auto-save timeout.
 * Input:    none
 * Output:   void
 */
function revealClaimPanel() {
  claimCodeEl.textContent = spawnRecord.claimCode;
  claimPanel.classList.remove('hidden');
  autoSaveTimer = setTimeout(finalizeSpawn, AUTO_SAVE_MS);
}

/**
 * finalizeSpawn
 * Purpose:  Persist the spawn exactly once, with whatever email is present
 *           at call time. Safe to call multiple times (no-ops after the
 *           first). Picks a proximity-based world position just before
 *           inserting.
 * Input:    none
 * Output:   Promise<void>
 */
async function finalizeSpawn() {
  if (finalized || !spawnRecord) return;
  finalized = true;
  clearTimeout(autoSaveTimer);

  const email = emailInput.value.trim();
  spawnRecord.email = email || null;

  const { x, y } = await pickPosition();
  const result = await persistSpawn({ ...spawnRecord, x, y });

  if (result.ok) {
    if (result.claimCode !== spawnRecord.claimCode) {
      spawnRecord.claimCode = result.claimCode;
      claimCodeEl.textContent = result.claimCode;
    }
    emailStatus.textContent = email ? 'saved — thank you' : 'organism saved';
  } else {
    emailStatus.textContent = 'could not save — check your connection';
    finalized = false;
  }
}

async function init() {
  if (await isWorldSealed()) {
    joinForm.classList.add('hidden');
    sealedMessage.classList.remove('hidden');
  }
}
init();

joinForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const rawInput = joinInput.value;
  if (!rawInput.trim()) return;

  const normalized = normalizeInput(rawInput);
  const nonce = crypto.randomUUID();
  const seed = hashStringToSeed(`${normalized}:${nonce}`);

  spawnRecord = {
    rawInput: rawInput.trim(),
    seed: String(seed),
    claimCode: generateClaimCode(),
    email: null,
  };
  finalized = false;

  joinScreen.classList.add('hidden');
  bloom(seed);
});

claimCopyBtn.addEventListener('click', async () => {
  if (!spawnRecord) return;
  try {
    await navigator.clipboard.writeText(spawnRecord.claimCode);
    claimCopyBtn.textContent = 'copied';
    claimCopyBtn.classList.add('copied');
    setTimeout(() => {
      claimCopyBtn.textContent = 'copy';
      claimCopyBtn.classList.remove('copied');
    }, 1500);
  } catch {
    /* clipboard unavailable — code is still visible on screen */
  }
});

emailSubmit.addEventListener('click', finalizeSpawn);
