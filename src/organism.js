/**
 * organism.js
 * Grows a single deterministic organism (one colony) from a seed, reusing
 * the existing colony-growth engine (world.js/colony.js) without its
 * multi-colony ecosystem subsystems (spores, eaters, dust) — a spawned
 * organism is a standalone keepsake, not a competing colony in an
 * ecosystem. Fully seeded: same seed always reaches the identical bloomed
 * cell layout after the same number of ticks, regardless of device —
 * growth always happens in a fixed-size local space (LOCAL_WORLD_SIZE),
 * independent of any viewport, so screen size can never perturb the result.
 */

import { createWorld, spawnColony, growColony } from './world.js';
import { BIOMES } from './biomes.js';

/** BIOME_KEYS — stable ordering used to derive a biome deterministically from a seed */
export const BIOME_KEYS = Object.keys(BIOMES);

/** LOCAL_WORLD_SIZE — fixed growth-space bounds; a generous margin, never actually reached */
export const LOCAL_WORLD_SIZE = 800;

/**
 * biomeForSeed
 * Purpose:  Deterministically map a seed to one of the five biomes.
 * Input:    seed  number  — uint32 seed
 * Output:   string  — biome key
 */
export function biomeForSeed(seed) {
  return BIOME_KEYS[seed % BIOME_KEYS.length];
}

/** BLOOM_BUFFER_TICKS — extra ticks of colour drift allowed to run after bloom */
const BLOOM_BUFFER_TICKS = 40;
/** MAX_TICKS — hard safety cap so growth can never run unbounded */
const MAX_TICKS = 600;

/**
 * createOrganismWorld
 * Purpose:  Set up a world holding exactly one seeded colony, centred in
 *           the fixed local growth space.
 * Input:    seed  number  — uint32 seed
 * Output:   Object  — world state, ready to be advanced with tickOrganism
 */
export function createOrganismWorld(seed) {
  const world = createWorld(biomeForSeed(seed), seed);
  world.W = LOCAL_WORLD_SIZE;
  world.H = LOCAL_WORLD_SIZE;
  spawnColony(world, LOCAL_WORLD_SIZE / 2, LOCAL_WORLD_SIZE / 2);
  return world;
}

/**
 * tickOrganism
 * Purpose:  Advance the organism's colony growth by one tick (placement,
 *           bloom trigger, post-bloom colour drift, cell fade-in). No
 *           spores, eaters, or dust — the organism is otherwise inert.
 * Input:    world  Object  — world state (mutated)
 * Output:   { done: boolean, bloomed: boolean, cellCount: number }
 */
export function tickOrganism(world) {
  const col = world.colonies[0];
  const biome = BIOMES[world.biome];
  world._tickCount = (world._tickCount || 0) + 1;

  if (col) {
    col.age++;
    const growRate = col.bloomed ? 3 : 2;
    for (let g = 0; g < growRate; g++) {
      if (world.rng() < biome.growth.rate) growColony(world, col);
    }
    for (const c of world.cells) {
      c.age++;
      if (c.alpha < 1) c.alpha += 0.04;
    }
    if (col.bloomed) world._matureTicks = (world._matureTicks || 0) + 1;
  }

  const matured = col?.bloomed && world._matureTicks >= BLOOM_BUFFER_TICKS;
  const done = matured || world._tickCount >= MAX_TICKS;
  return { done, bloomed: !!col?.bloomed, cellCount: col ? col.cells.length : 0 };
}

/**
 * growToMaturity
 * Purpose:  Synchronously run an organism's growth to completion — for
 *           contexts (like the world view) that render a static mature
 *           snapshot instead of an animated live bloom.
 * Input:    seed  number  — uint32 seed
 * Output:   Object  — matured world state
 */
export function growToMaturity(seed) {
  const world = createOrganismWorld(seed);
  let res;
  do { res = tickOrganism(world); } while (!res.done);
  return world;
}
