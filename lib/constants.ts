/**
 * Central tuning table for the flight simulator.
 *
 * Everything that shapes how the aircraft flies lives here so the whole feel of
 * the sim can be balanced in one file. World units are treated as "roughly
 * metres" but the numbers are tuned for feel, not realism.
 */

// --- Models (served from /public) ----------------------------------------
/** The player aircraft. Auto-scaled to AIRCRAFT_SIZE by <GltfModel>. */
export const AIRCRAFT_MODEL_URL = "/models/cessna.glb";
/** The terrain the aircraft flies over. Auto-scaled to TERRAIN_SIZE. */
export const TERRAIN_MODEL_URL = "/models/terrain.glb";

/** Longest dimension the aircraft model is scaled to (world units). */
export const AIRCRAFT_SIZE = 10;
/** Longest dimension the terrain model is scaled to (world units). */
export const TERRAIN_SIZE = 2600;

/**
 * Orientation fix-up applied to the aircraft model so its nose points along the
 * craft's forward axis (local -Z). Tune per asset if the model faces the wrong
 * way. [x, y, z] Euler radians.
 *
 * The Cessna asset's nose points along its local -X with the wingspan along Z,
 * so a -90° yaw swings the nose from -X onto -Z and the wings onto X.
 */
export const AIRCRAFT_MODEL_ROTATION: [number, number, number] = [
  0,
  -Math.PI / 2,
  0,
];

// --- Propeller -----------------------------------------------------------
/**
 * Cut plane that separates the propeller from the airframe, in the aircraft
 * model's OWN coordinates (raw glTF units, before <GltfModel> normalisation;
 * nose points along -X for this asset). Triangles fully forward of this plane
 * are detached and spun as the propeller. Tuned to the visible gap between
 * the cowling (~x -3.4) and the blades (~x -3.8) in the Cessna asset.
 */
export const PROP_CUT_X = -3.55;
/** Prop rpm at idle throttle (engine "running" but stopped in the menu). */
export const PROP_RPM_IDLE = 650;
/** Prop rpm at full throttle (Cessna 210 redline is ~2700). */
export const PROP_RPM_MAX = 2700;
/** How quickly the engine spools toward its target rpm (per second). */
export const PROP_RPM_SPOOL = 1.4;
/** Rpm fraction (0..1 of max) at which the blades start dissolving… */
export const PROP_BLUR_START = 0.3;
/** …and the fraction at which the motion-blur disc reaches full strength. */
export const PROP_BLUR_FULL = 0.85;
/** Peak opacity of the motion-blur disc that stands in for the fast blades. */
export const PROP_BLUR_DISC_OPACITY = 0.42;

// --- Flight physics ------------------------------------------------------
/** Gravitational acceleration (units/s²). */
export const GRAVITY = 9.8;
/** Max thrust acceleration at full throttle (units/s²). */
export const THRUST_MAX = 16;
/**
 * Lift coefficient: lift accel = LIFT_K · forwardSpeed². Tuned so lift balances
 * gravity right around the cruise/START speed, for stable hands-off flight.
 */
export const LIFT_K = 0.00153;
/** Drag coefficient: drag accel = DRAG_K · |v| · v (quadratic). */
export const DRAG_K = 0.0008;
/**
 * Below this forward airspeed the wing stalls and lift collapses, so the nose
 * drops — you have to build speed back up to recover.
 */
export const STALL_SPEED = 38;
/** Airspeed at which control surfaces reach full authority. */
export const CONTROL_REF_SPEED = 65;

// --- Control rates (rad/s at full authority) -----------------------------
export const PITCH_RATE = 1.15;
export const ROLL_RATE = 2.4;
export const YAW_RATE = 0.55;
/** How quickly the throttle eases toward its target setting (per second). */
export const THROTTLE_RESPONSE = 0.6;

/**
 * Stability augmentation. When the player isn't actively rolling/pitching, the
 * airframe eases back toward wings-level and horizon-level so it flies straight
 * hands-off instead of holding a bank and spiralling away. Higher = firmer.
 */
export const ROLL_LEVEL_RATE = 2.4;
export const PITCH_LEVEL_RATE = 1.1;

// --- Starting state ------------------------------------------------------
/** Throttle at spawn (0..1). Trimmed so thrust ≈ drag at START_SPEED. */
export const START_THROTTLE = 0.35;
/** Forward airspeed at spawn (units/s). */
export const START_SPEED = 80;
/** Height above the ground directly below the spawn point (world units). */
export const START_ALTITUDE = 260;

// --- Ground contact: landing vs crashing ---------------------------------
/** Ride height of the airframe over the terrain (belly clearance). */
export const GROUND_CLEARANCE = 6;
/** How far up to start the downward ground-probe rays (world units). */
export const GROUND_PROBE_HEIGHT = 4000;
/** Seconds the "crashed" overlay shows before auto-respawn. */
export const RESPAWN_DELAY = 1.6;
/**
 * Touchdown tolerance. Contact is a *landing* (not a crash) when sink rate is
 * below LANDING_MAX_SINK, the wings are close to level (airframe up-vector's
 * world y above LANDING_MIN_UP) and the ground under nose/wingtips is even
 * (height spread below LANDING_MAX_SLOPE). Anything harsher is a crash.
 */
export const LANDING_MAX_SINK = 9;
export const LANDING_MIN_UP = 0.82;
export const LANDING_MAX_SLOPE = 5;
/** Rolling-friction deceleration while on the ground (units/s²). */
export const GROUND_FRICTION = 6;
/** Longitudinal offset of the nose ground-probe (world units). */
export const PROBE_NOSE = 4.5;
/** Lateral offset of the wingtip ground-probes (world units). */
export const PROBE_WING = 5;

// --- World bounds ---------------------------------------------------------
/** Radius of the intended play area around the origin (world units). */
export const WORLD_RADIUS = 1500;
/** Strength of the gentle push back toward the valley when out of bounds. */
export const BOUNDS_PUSH = 0.015;

// --- Chase camera --------------------------------------------------------
/**
 * A behind-the-tail chase cam. It sits on a boom pointing back along the nose
 * direction (so yaw keeps it behind the aircraft) but takes its height from
 * world-up, so rolling the aircraft doesn't swing the camera around.
 */
/** How far behind the aircraft the camera rides (world units). */
export const CAMERA_DISTANCE = 22;
/** How high above the aircraft the camera rides (world units). */
export const CAMERA_HEIGHT = 6;
/** How far ahead of the aircraft the camera looks (world units). */
export const CAMERA_LOOK_AHEAD = 12;
/** Position smoothing (higher = snappier follow). */
export const CAMERA_SMOOTH = 5;
/** The chase cam never dips closer than this to the terrain (world units). */
export const CAMERA_MIN_GROUND = 3;
/** Base field of view (degrees)… */
export const FOV_BASE = 62;
/** …widened by up to this much as airspeed climbs, for a sense of speed. */
export const FOV_SPEED_KICK = 11;
/** Airspeed above cruise at which the FOV kick maxes out (units/s). */
export const FOV_SPEED_RANGE = 90;

// --- Palette -------------------------------------------------------------
export const COLORS = {
  skyTop: "#2a6fd6",
  skyHorizon: "#bfe0ff",
  sun: "#fff6e0",
  fog: "#cfe3f5",
} as const;
