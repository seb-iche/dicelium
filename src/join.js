/**
 * join.js
 * Entry point for the /join spawn flow: name/phrase -> deterministic seed ->
 * organism bloom (reusing the existing growth engine) -> claim code + email.
 */

import { createRenderer, resizeCanvas, render } from './renderer.js';
import { createOrganismWorld, tickOrganism } from './organism.js';
import { hashStringToSeed } from './rng.js';
import { generateClaimCode } from './claimcode.js';

const canvas       = document.getElementById('c');
const joinScreen    = document.getElementById('join-screen');
const joinForm      = document.getElementById('join-form');
const joinInput     = document.getElementById('join-input');
const claimPanel    = document.getElementById('claim-panel');
const claimCodeEl   = document.getElementById('claim-code');
const claimCopyBtn  = document.getElementById('claim-copy');
const emailInput    = document.getElementById('email-input');
const emailSubmit   = document.getElementById('email-submit');
const emailStatus   = document.getElementById('email-status');

const { ctx } = createRenderer(canvas);
resizeCanvas(canvas);
window.addEventListener('resize', () => resizeCanvas(canvas));

/** spawnRecord — the current spawn's data, kept in memory for the claim panel */
let spawnRecord = null;

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
 *           then reveal the claim panel.
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
 * Purpose:  Show the claim code + email capture once the bloom has matured.
 * Input:    none
 * Output:   void
 */
function revealClaimPanel() {
  claimCodeEl.textContent = spawnRecord.claimCode;
  claimPanel.classList.remove('hidden');
}

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

emailSubmit.addEventListener('click', () => {
  if (!spawnRecord) return;
  const email = emailInput.value.trim();
  spawnRecord.email = email || null;
  emailStatus.textContent = email ? 'saved — thank you' : 'no email saved';
});
