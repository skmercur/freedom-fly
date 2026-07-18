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
  | "crashed";
