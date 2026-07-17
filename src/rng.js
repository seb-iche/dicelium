/**
 * rng.js
 * Deterministic pseudo-random number generation for seeded organisms.
 * Same seed always produces the same draw sequence, on any device.
 */

/**
 * hashStringToSeed
 * Purpose:  Fold an arbitrary string into a 32-bit unsigned integer seed.
 * Input:    str  string
 * Output:   number  — uint32
 */
export function hashStringToSeed(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * mulberry32
 * Purpose:  Create a seeded PRNG function returning floats in [0, 1).
 * Input:    seed  number  — uint32 seed
 * Output:   () => number
 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
