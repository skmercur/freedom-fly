/**
 * Core domain types for Freedom Fly.
 * Kept framework-agnostic so game logic, stores and rendering can share them.
 */

/** Top-level flow of the application / sim. */
export type GamePhase =
  | "loading"
  | "menu"
  | "settings"
  | "flying"
  | "paused"
  | "crashed";

/** Why the flight ended — picks the crash overlay's message. */
export type CrashReason = "terrain" | "overstress";
