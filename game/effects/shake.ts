/**
 * Camera-shake trauma channel. Anything dramatic (a crash) adds trauma; the
 * flight rig decays it each frame and jitters the camera by trauma², so big
 * hits kick hard and fade out smoothly. Non-reactive for the usual reason:
 * it's read/written every frame.
 */
let trauma = 0;

const DECAY = 1.4; // trauma units per second

export function addTrauma(amount: number): void {
  trauma = Math.min(1, trauma + amount);
}

/** Decay and return the current shake amplitude (0..1) for this frame. */
export function stepTrauma(dt: number): number {
  trauma = Math.max(0, trauma - DECAY * dt);
  return trauma * trauma;
}
