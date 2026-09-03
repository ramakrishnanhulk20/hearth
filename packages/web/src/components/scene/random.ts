/**
 * A deterministic sequence of numbers between zero and one.
 *
 * The scene's particles, flame positions and delays all come from here rather than Math.random,
 * so the same page renders the same picture on every reload and a screenshot taken today matches
 * the one taken tomorrow. A linear congruential generator is more than enough for scattering
 * geometry, and it is nowhere near anything that decides money.
 */
export function sequence(seed: number, count: number): number[] {
  const values = new Array<number>(count);
  let state = Math.abs(Math.trunc(seed)) % 4294967296;
  for (let index = 0; index < count; index++) {
    state = (state * 1664525 + 1013904223) % 4294967296;
    values[index] = state / 4294967296;
  }
  return values;
}
