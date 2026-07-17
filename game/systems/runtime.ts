import * as THREE from "three";
import type { PowerUpType } from "@/types/game";
import { BASE_SPEED, PLAYER_Z } from "@/lib/constants";

/**
 * Per-frame mutable game state.
 *
 * This lives OUTSIDE React on purpose: the game loop, entities and effects
 * read/write these values every frame in `useFrame`, and doing so through a
 * store would cause thousands of re-renders per second. React-facing values
 * (score, lives, phase…) live in the Zustand store instead — see gameStore.
 */
export interface Runtime {
  /** Seconds since the current run started. */
  elapsed: number;
  /** Continuous difficulty level (0 → ∞). */
  difficulty: number;
  /** Current forward world speed (units/s). */
  worldSpeed: number;
  /** World-speed multiplier (1 normally, < 1 while slow-mo is active). */
  slow: number;
  /** Whether the magnet power-up is currently pulling collectibles. */
  magnet: boolean;
  /** Whether the shield power-up is currently absorbing hits. */
  shield: boolean;
  /** Remaining time per power-up type, ticked by the loop. */
  powerRemaining: Record<PowerUpType, number>;
  /** Live player position, written by the Player each frame. */
  playerPos: THREE.Vector3;
  /** Whether the loop should be advancing (false while paused). */
  running: boolean;
}

export const runtime: Runtime = {
  elapsed: 0,
  difficulty: 0,
  worldSpeed: BASE_SPEED,
  slow: 1,
  magnet: false,
  shield: false,
  powerRemaining: { shield: 0, magnet: 0, slow: 0 },
  playerPos: new THREE.Vector3(0, 0, PLAYER_Z),
  running: false,
};

/** Reset all per-run values back to their starting state. */
export function resetRuntime(): void {
  runtime.elapsed = 0;
  runtime.difficulty = 0;
  runtime.worldSpeed = BASE_SPEED;
  runtime.slow = 1;
  runtime.magnet = false;
  runtime.shield = false;
  runtime.powerRemaining.shield = 0;
  runtime.powerRemaining.magnet = 0;
  runtime.powerRemaining.slow = 0;
  runtime.playerPos.set(0, 0, PLAYER_Z);
  runtime.running = false;
}
