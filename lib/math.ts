/** Small, dependency-free math helpers shared across systems. */

export const clamp = (v: number, min: number, max: number): number =>
  v < min ? min : v > max ? max : v;

export const lerp = (a: number, b: number, t: number): number =>
  a + (b - a) * t;

/**
 * Frame-rate independent smoothing. `smooth` is the responsiveness constant;
 * higher = snappier. Derived from an exponential decay so it behaves the same
 * at 30 or 144 FPS.
 */
export const damp = (
  current: number,
  target: number,
  smooth: number,
  dt: number,
): number => lerp(current, target, 1 - Math.exp(-smooth * dt));

export const randRange = (min: number, max: number): number =>
  min + Math.random() * (max - min);

export const randInt = (min: number, max: number): number =>
  Math.floor(randRange(min, max + 1));

/** Pick a key from a { key: weight } map using weighted random. */
export const weightedPick = (weights: Record<string, number>): string => {
  const total = Object.values(weights).reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (const [key, w] of Object.entries(weights)) {
    if ((r -= w) <= 0) return key;
  }
  return Object.keys(weights)[0];
};
