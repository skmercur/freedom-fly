import type * as THREE from "three";

/**
 * Core domain types for Freedom Fly.
 * Kept framework-agnostic so game logic, stores and rendering can share them.
 */

/** Top-level flow of the application / game. */
export type GamePhase =
  | "loading"
  | "menu"
  | "settings"
  | "playing"
  | "paused"
  | "gameover";

/** The three kinds of things that fly toward the player. */
export type EntityKind = "collectible" | "obstacle" | "powerup";

/** Power-up flavours. */
export type PowerUpType = "shield" | "magnet" | "slow";

/**
 * A live entity in the world. `pos` is mutated every frame by the entity
 * itself (never through React state) so movement never triggers re-renders.
 */
export interface Entity {
  id: number;
  kind: EntityKind;
  powerType?: PowerUpType;
  pos: THREE.Vector3;
  /** Base spin speed (rad/s) for idle animation. */
  spin: number;
  /** Collision radius. */
  radius: number;
  /** Per-entity color used by particles on collect/destroy. */
  color: string;
  /** Marks the entity as consumed so it is skipped before removal. */
  alive: boolean;
}

/** An active timed power-up effect on the player. */
export interface ActivePowerUp {
  type: PowerUpType;
  /** Remaining time in seconds. */
  remaining: number;
  /** Original duration, for HUD progress bars. */
  duration: number;
}
