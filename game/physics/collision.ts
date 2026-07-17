import type * as THREE from "three";

/**
 * Sphere-based collision. Cheap (no sqrt) and perfectly adequate for a game
 * built from roughly round entities. Everything collides against the player,
 * so this is the single hot-path predicate in the loop.
 */
export const spheresOverlap = (
  a: THREE.Vector3,
  ar: number,
  b: THREE.Vector3,
  br: number,
): boolean => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  const r = ar + br;
  return dx * dx + dy * dy + dz * dz <= r * r;
};

/** Squared distance — handy for the magnet's falloff without a sqrt. */
export const distanceSq = (a: THREE.Vector3, b: THREE.Vector3): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
};
