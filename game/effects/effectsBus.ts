import type * as THREE from "three";

/**
 * A non-reactive event bus that lets gameplay code trigger visual effects
 * (particle bursts, camera shake) without prop-drilling or re-rendering.
 */

export type EmitFn = (
  pos: THREE.Vector3,
  color: string,
  count: number,
  speed?: number,
) => void;

let emitter: EmitFn | null = null;

/** The <Particles> system registers its emit function here on mount. */
export const registerEmitter = (fn: EmitFn | null): void => {
  emitter = fn;
};

/** Fire a particle burst at a world position. */
export const burst: EmitFn = (pos, color, count, speed) => {
  emitter?.(pos, color, count, speed);
};

/** Camera-shake "trauma" in [0, 1]; the shake amount is trauma². */
export const shake = { trauma: 0 };

export const addTrauma = (amount: number): void => {
  shake.trauma = Math.min(1, shake.trauma + amount);
};
