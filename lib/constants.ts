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
/**
 * Longest dimension one terrain tile is scaled to (world units). This sets the
 * scale of the whole world relative to the aircraft: bigger terrain = taller
 * mountains and a slower-feeling, more majestic sense of speed. The world is
 * endless — this tile repeats around the player with mirrored edges.
 */
export const TERRAIN_SIZE = 6500;

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
/**
 * The aero model works in normalised units: the aircraft has unit mass and
 * unit wing area, so forces are accelerations and the lift equation reads
 * `lift = q · CL` with dynamic pressure `q = ½ · ρ · V²`. Constants are tuned
 * for a Cessna-like feel: stall ~35 kt, cruise ~80, top speed ~128.
 */
/** Gravitational acceleration (units/s²). */
export const GRAVITY = 9.8;
/** Static propeller thrust acceleration at full throttle (units/s²). */
export const THRUST_MAX = 20;
/**
 * Airspeed at which propeller thrust has fallen to ~30% of static. A prop
 * loses bite as the inflow speeds up, so top speed is self-limiting.
 */
export const THRUST_SPEED_DROP = 180;
/** Atmospheric scale height: air density falls off as e^(-alt / H). */
export const AIR_DENSITY_H = 8500;

// --- Wind ------------------------------------------------------------------
/** Mean wind speed (units/s). The live wind wanders around this. */
export const WIND_BASE_SPEED = 6;
/** Peak extra speed the gust envelope can add on top of the mean. */
export const WIND_GUST = 5;
/** Amplitude of the gentle vertical turbulence component (units/s). */
export const WIND_VERTICAL = 1.4;

// --- Airframe stress -------------------------------------------------------
/**
 * Structural g-limits (Cessna-utility-ish). Beyond them the airframe buffets
 * and accumulates stress; at stress 1 the wings let go. Stress also builds
 * from flying with flaps out above FLAP_MAX_SPEED.
 */
export const G_LIMIT_POS = 4.4;
export const G_LIMIT_NEG = -1.8;
/** Stress accumulated per second, per g beyond the limit. */
export const STRESS_RATE = 0.5;
/** Stress shed per second once back inside the envelope. */
export const STRESS_RECOVER = 0.35;

// --- Flaps -----------------------------------------------------------------
/** Flap notches shown on the HUD (degrees); index = notch. */
export const FLAP_NOTCH_DEG = [0, 10, 25, 40] as const;
/** Extra lift coefficient at full deflection (camber increase). */
export const FLAP_CL = 0.006;
/** Extra drag coefficient at full deflection (quadratic in deflection). */
export const FLAP_CD = 0.004;
/** Flap travel rate (fraction of full deflection per second). */
export const FLAP_SPEED = 0.35;
/** Nose-down trim torque at full deflection. */
export const FLAP_PITCH_TRIM = 0.06;
/** Max flaps-extended airspeed (VFE, units/s) — faster = airframe stress. */
export const FLAP_MAX_SPEED = 55;
/** Stress per second at full flaps ~20 units/s past VFE. */
export const FLAP_OVERSPEED_STRESS = 0.4;

// --- Wing: lift & drag coefficients --------------------------------------
/** Lift-curve slope: CL per radian of angle of attack (pre-stall). */
export const CL_ALPHA = 0.065;
/** Maximum lift coefficient, reached at the critical angle of attack. */
export const CL_MAX = 0.016;
/** Post-stall plateau: a deeply stalled wing still produces this much CL. */
export const CL_RECOVER = 0.01;
/** Critical angle of attack in degrees — past this the wing stalls. */
export const STALL_ALPHA = 14;
/** Parasitic + fixed-gear drag coefficient (drag accel = q · CD). */
export const DRAG_K = 0.0012;
/** Induced drag factor: CD_induced = DRAG_INDUCED_K · CL². */
export const DRAG_INDUCED_K = 40;

// --- Ground effect --------------------------------------------------------
/** Below this height (≈ one wingspan) ground effect kicks in. */
export const GROUND_EFFECT_SPAN = 18;
/** Bonus lift fraction at zero height (fades linearly to zero at the span). */
export const LIFT_GROUND_EFFECT = 0.15;

// --- Control & angular dynamics ------------------------------------------
/**
 * Dynamic pressure at which the control surfaces reach full authority. Below
 * it the controls get mushy; above it they stay twitchy (up to 1.5×).
 */
export const CONTROL_REF_Q = 2000;
/** Pilot-commanded angular accelerations at full authority (rad/s²). */
export const PITCH_RATE = 1.4;
export const ROLL_RATE = 3.6;
export const YAW_RATE = 0.55;
/** Per-axis rotational inertia (higher = heavier, slower to respond). */
export const INERTIA_PITCH = 1.2;
export const INERTIA_ROLL = 0.7;
export const INERTIA_YAW = 1.5;
/** Angular damping (rate-proportional opposing torque). */
export const PITCH_DAMPING = 1.2;
export const ROLL_DAMPING = 1.5;
export const YAW_DAMPING = 1.0;
/** Natural pitch trim: gentle torque easing the nose toward the horizon. */
export const PITCH_STABILITY = 0.25;
/** Weathervane stability: yaw torque that kills sideslip (flies nose-into-wind). */
export const YAW_STABILITY = 0.4;
/** Wings-level torque when the pilot isn't rolling (spiral stability). */
export const ROLL_LEVEL_RATE = 0.9;
/** Adverse yaw: how much a rolling moment yaws the nose away from the roll. */
export const ADVERSE_YAW = 0.08;
/** Engine torque & P-factor: roll/yaw couple proportional to throttle². */
export const TORQUE_FACTOR = 0.02;
/** How quickly the throttle eases toward its target setting (per second). */
export const THROTTLE_RESPONSE = 0.6;
/** Camera-shake trauma fed per second while the wing is stalled (buffet). */
export const STALL_BUFFET = 0.6;

// --- Starting state ------------------------------------------------------
/** Throttle at spawn (0..1). Trimmed so thrust ≈ drag at START_SPEED. */
export const START_THROTTLE = 0.45;
/** Airspeed below which the gear resists pitching up (rotate speed). */
export const ROTATE_SPEED = 42;
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

// --- Sky ------------------------------------------------------------------
/** Number of drifting cloud clusters kept alive around the camera. */
export const CLOUD_COUNT = 34;
/** Clouds live on a wrapping field this wide, centered on the camera. */
export const CLOUD_FIELD = 5600;
/** Cloud altitude band (world units). */
export const CLOUD_MIN_Y = 420;
export const CLOUD_MAX_Y = 980;

// --- Chase camera --------------------------------------------------------
/**
 * A behind-the-tail chase cam. It sits on a boom pointing back along the nose
 * direction (so yaw keeps it behind the aircraft) but takes its height from
 * world-up, so rolling the aircraft doesn't swing the camera around.
 */
/** How far behind the aircraft the camera rides (world units). */
export const CAMERA_DISTANCE = 14;
/** How high above the aircraft the camera rides (world units). */
export const CAMERA_HEIGHT = 4;
/** How far ahead of the aircraft the camera looks (world units). */
export const CAMERA_LOOK_AHEAD = 10;
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
