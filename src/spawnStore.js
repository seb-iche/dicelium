/**
 * spawnStore.js
 * All Supabase reads/writes for the spawns table: sealed-world check,
 * proximity-based placement, and spawn insertion with claim-code
 * collision retry.
 */

import { supabase } from './supabaseClient.js';
import { generateClaimCode } from './claimcode.js';

/** MIN_DIST — minimum world-unit separation between two spawns' origins */
const MIN_DIST = 250;
/** ANCHOR_RADIUS — [min, max] distance a new spawn is placed from its anchor */
const ANCHOR_RADIUS = [MIN_DIST * 1.2, MIN_DIST * 3];
/** PLACEMENT_ATTEMPTS — rejection-sampling tries before accepting an overlap */
const PLACEMENT_ATTEMPTS = 20;
/** MAX_CLAIM_ATTEMPTS — claim-code regenerations tried on a unique-constraint conflict */
const MAX_CLAIM_ATTEMPTS = 5;
/** UNIQUE_VIOLATION — Postgres error code for a unique-constraint conflict */
const UNIQUE_VIOLATION = '23505';

/**
 * isWorldSealed
 * Purpose:  Check world_meta.sealed. Fails open (false) if the read fails,
 *           since the insert's own RLS policy is the real gate.
 * Input:    none
 * Output:   Promise<boolean>
 */
export async function isWorldSealed() {
  const { data, error } = await supabase
    .from('world_meta')
    .select('sealed')
    .eq('id', 1)
    .single();
  if (error || !data) return false;
  return !!data.sealed;
}

/**
 * pickPosition
 * Purpose:  Choose a world (x, y) near recent spawn activity without
 *           overlapping it, via simple rejection sampling. Falls back to
 *           the world origin when there is no prior activity.
 * Input:    none
 * Output:   Promise<{ x: number, y: number }>
 */
export async function pickPosition() {
  const { data, error } = await supabase
    .from('spawns')
    .select('x,y')
    .order('created_at', { ascending: false })
    .limit(60);
  const recent = (!error && data) ? data : [];
  if (recent.length === 0) return { x: 0, y: 0 };

  for (let attempt = 0; attempt < PLACEMENT_ATTEMPTS; attempt++) {
    const anchor = recent[Math.floor(Math.random() * recent.length)];
    const angle = Math.random() * Math.PI * 2;
    const dist = ANCHOR_RADIUS[0] + Math.random() * (ANCHOR_RADIUS[1] - ANCHOR_RADIUS[0]);
    const x = anchor.x + Math.cos(angle) * dist;
    const y = anchor.y + Math.sin(angle) * dist;
    if (!recent.some(p => Math.hypot(p.x - x, p.y - y) < MIN_DIST)) {
      return { x, y };
    }
  }
  const anchor = recent[0];
  return { x: anchor.x + MIN_DIST * 2, y: anchor.y };
}

/**
 * persistSpawn
 * Purpose:  Insert a spawn row, retrying with a freshly generated claim
 *           code if the candidate one collides with an existing row.
 * Input:    record  Object  — {
 *             seed       string  — decimal uint32 seed
 *             rawInput   string
 *             claimCode  string  — initial candidate code
 *             email      string|null
 *             x, y       number
 *           }
 * Output:   Promise<{ ok: true, claimCode: string } | { ok: false, error: string }>
 */
export async function persistSpawn(record) {
  let claimCode = record.claimCode;
  for (let attempt = 0; attempt < MAX_CLAIM_ATTEMPTS; attempt++) {
    const { error } = await supabase.from('spawns').insert({
      seed: record.seed,
      raw_input: record.rawInput,
      claim_code: claimCode,
      email: record.email || null,
      x: record.x,
      y: record.y,
    });
    if (!error) return { ok: true, claimCode };
    if (error.code !== UNIQUE_VIOLATION) return { ok: false, error: error.message };
    claimCode = generateClaimCode();
  }
  return { ok: false, error: 'could not allocate a unique claim code' };
}
