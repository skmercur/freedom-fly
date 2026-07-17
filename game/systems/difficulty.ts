import {
  BASE_SPAWN_INTERVAL,
  BASE_SPEED,
  MAX_SPEED,
  MIN_SPAWN_INTERVAL,
  SECONDS_PER_LEVEL,
  SPEED_PER_LEVEL,
} from "@/lib/constants";

/**
 * Pure functions describing the difficulty curve. Keeping them free of state
 * makes the balance trivially testable and lets the loop stay declarative.
 */

/** Continuous difficulty from elapsed run time. */
export const difficultyFromTime = (elapsed: number): number =>
  elapsed / SECONDS_PER_LEVEL;

/** Forward world speed for a given difficulty, capped for playability. */
export const speedForDifficulty = (difficulty: number): number =>
  Math.min(BASE_SPEED + difficulty * SPEED_PER_LEVEL, MAX_SPEED);

/** Spawn interval shrinks toward a floor as difficulty rises. */
export const spawnIntervalForDifficulty = (difficulty: number): number => {
  const t = 1 - 1 / (1 + difficulty * 0.35); // 0 → 1 easing
  return BASE_SPAWN_INTERVAL - (BASE_SPAWN_INTERVAL - MIN_SPAWN_INTERVAL) * t;
};
