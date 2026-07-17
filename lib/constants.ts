import type { PowerUpType } from "@/types/game";

/**
 * Central tuning table. Keeping every magic number here means balancing the
 * game is a single-file job and no gameplay constant is duplicated.
 */

// --- World geometry -------------------------------------------------------
/** Horizontal half-extent the player (and spawns) may occupy. */
export const BOUND_X = 5;
/** Vertical half-extent. */
export const BOUND_Y = 3;
/** Z the player flies at (camera sits just behind this). */
export const PLAYER_Z = 4;
/** Z where entities are spawned (far ahead, into the screen). */
export const SPAWN_Z = -75;
/** Z past which entities are recycled (behind the camera). */
export const DESPAWN_Z = 10;

// --- Movement -------------------------------------------------------------
/** Lateral player speed in world-units / second. */
export const PLAYER_SPEED = 11;
/** Smoothing factor for player easing toward its target position. */
export const PLAYER_SMOOTH = 14;

// --- Collision radii ------------------------------------------------------
export const PLAYER_RADIUS = 0.62;
export const COLLECTIBLE_RADIUS = 0.75;
export const OBSTACLE_RADIUS = 0.92;
export const POWERUP_RADIUS = 0.85;

// --- Difficulty curve -----------------------------------------------------
/** Forward world speed at t = 0. */
export const BASE_SPEED = 20;
/** Extra forward speed gained per difficulty level. */
export const SPEED_PER_LEVEL = 3.2;
/** Seconds of survival that equal one difficulty level. */
export const SECONDS_PER_LEVEL = 16;
/** Hard cap on forward speed so late game stays playable. */
export const MAX_SPEED = 62;

/** Spawn cadence (seconds between spawns) at level 0… */
export const BASE_SPAWN_INTERVAL = 0.62;
/** …shrinking toward this floor as difficulty rises. */
export const MIN_SPAWN_INTERVAL = 0.2;

// --- Scoring --------------------------------------------------------------
export const START_LIVES = 3;
export const MAX_LIVES = 5;
/** Base points for a collectible before combo / power-up multipliers. */
export const COLLECTIBLE_POINTS = 10;
/** Combo increment per collectible; combo resets to 1 when hit. */
export const MAX_COMBO = 99;

// --- Spawn weights (relative probability) ---------------------------------
export const SPAWN_WEIGHTS: Record<string, number> = {
  collectible: 62,
  obstacle: 30,
  powerup: 8,
};

// --- Power-ups ------------------------------------------------------------
export const POWERUP_DURATION: Record<PowerUpType, number> = {
  shield: 6,
  magnet: 7,
  slow: 5,
};

/** Strength of the "slow-mo" world-speed multiplier while active. */
export const SLOW_FACTOR = 0.45;
/** Radius within which the magnet pulls collectibles toward the player. */
export const MAGNET_RADIUS = 7;
/** Magnet pull strength. */
export const MAGNET_STRENGTH = 9;

// --- Optional glTF models -------------------------------------------------
/**
 * Drop a VALID `.glb` (or a complete `.gltf` + `.bin` + textures) into
 * `public/assets/…` and point these at it to swap the procedural visuals for
 * real models. Empty string = use the built-in procedural airplane / world.
 *
 * NOTE: the models shipped in `assets/` are incomplete — the `.gltf` files hold
 * only raw binary buffer data with no JSON manifest, so no loader can read
 * them. Until they're re-exported as proper glb/gltf, leave these empty.
 */
export const PLAYER_MODEL_URL = "";
export const SCENERY_MODEL_URL = "";

// --- Camera ---------------------------------------------------------------
/** Camera rest position (just behind & above the player). */
export const CAMERA_POS: [number, number, number] = [0, 0.9, PLAYER_Z + 7.8];
/** Point the camera aims at, out into the distance. */
export const CAMERA_TARGET: [number, number, number] = [0, 0, -16];

// --- Palette (shared by meshes, particles and UI) -------------------------
export const COLORS = {
  player: "#5eead4",
  collectible: "#fbbf24",
  obstacle: "#f43f5e",
  shield: "#38bdf8",
  magnet: "#a78bfa",
  slow: "#f472b6",
  bg: "#05060f",
} as const;

export const POWERUP_COLOR: Record<PowerUpType, string> = {
  shield: COLORS.shield,
  magnet: COLORS.magnet,
  slow: COLORS.slow,
};
