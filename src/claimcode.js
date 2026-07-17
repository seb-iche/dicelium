/**
 * claimcode.js
 * Generates short, human-friendly claim codes like "moss-ember-42".
 * Independent of the organism seed — this is an access key, not part of
 * the deterministic render, so it draws from a true random source.
 */

const WORDS_A = [
  'moss', 'spore', 'root', 'fern', 'lichen', 'husk', 'bark', 'vine',
  'clay', 'silt', 'dust', 'ash', 'loam', 'reed', 'thorn', 'bloom',
  'petal', 'stem', 'leaf', 'seed', 'frost', 'dew', 'mist', 'rain',
  'coral', 'shell', 'stone', 'moth', 'wisp', 'hollow',
];

const WORDS_B = [
  'ember', 'drift', 'glow', 'ripple', 'shade', 'dawn', 'dusk', 'tide',
  'grove', 'hollow', 'echo', 'haze', 'flicker', 'bramble', 'thicket',
  'burrow', 'current', 'canopy', 'hush', 'gleam', 'murmur', 'flare',
  'pulse', 'shimmer', 'thread', 'nest', 'cove', 'ridge', 'creek', 'field',
];

/**
 * generateClaimCode
 * Purpose:  Produce a random "word-word-digits" claim code.
 * Input:    none
 * Output:   string  — e.g. 'moss-ember-42'
 */
export function generateClaimCode() {
  const bytes = new Uint32Array(3);
  crypto.getRandomValues(bytes);
  const a = WORDS_A[bytes[0] % WORDS_A.length];
  const b = WORDS_B[bytes[1] % WORDS_B.length];
  const digits = 10 + (bytes[2] % 90);
  return `${a}-${b}-${digits}`;
}
