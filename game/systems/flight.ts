import * as THREE from "three";
import { clamp, damp } from "@/lib/math";
import {
  ADVERSE_YAW,
  AIR_DENSITY_H,
  CL_ALPHA,
  CL_MAX,
  CL_RECOVER,
  CONTROL_REF_Q,
  DRAG_INDUCED_K,
  DRAG_K,
  GRAVITY,
  GROUND_EFFECT_SPAN,
  LIFT_GROUND_EFFECT,
  PITCH_DAMPING,
  PITCH_RATE,
  PITCH_STABILITY,
  ROLL_DAMPING,
  ROLL_LEVEL_RATE,
  ROLL_RATE,
  ROTATE_SPEED,
  STALL_ALPHA,
  START_SPEED,
  START_THROTTLE,
  THROTTLE_RESPONSE,
  THRUST_MAX,
  THRUST_SPEED_DROP,
  TORQUE_FACTOR,
  WIND_X,
  WIND_Z,
  YAW_DAMPING,
  YAW_RATE,
  YAW_STABILITY,
} from "@/lib/constants";
import { consumeThrottleTarget, input } from "@/game/systems/input";
import {
  physicsReady,
  readBodyState,
  setBodyAngvel,
  stepBody,
  teleportBody,
} from "@/game/systems/physics";

/**
 * Per-frame flight state.
 *
 * Lives OUTSIDE React on purpose: the physics step, the aircraft mesh and the
 * chase camera all read/write this every frame in `useFrame`, and routing that
 * through a store would trigger thousands of re-renders per second. React-facing
 * values (phase, crashed) live in the Zustand gameStore instead.
 *
 * This object is a MIRROR of the Rapier rigid body (see `systems/physics.ts`):
 * `stepFlight` computes aerodynamic forces/torques from it, hands them to
 * Rapier, then copies the integrated result back. Writes meant to stick
 * (ground contact, spawn) must also go through the physics setters.
 */
export interface FlightState {
  /** World position of the aircraft. */
  position: THREE.Vector3;
  /** World velocity relative to the ground (units/s). */
  velocity: THREE.Vector3;
  /** Orientation of the airframe. Forward is the craft's local -Z. */
  quaternion: THREE.Quaternion;
  /** Body angular rates [x=pitch, y=yaw, z=roll] in rad/s (local frame). */
  angularVelocity: THREE.Vector3;
  /** Current throttle setting, eased toward the target (0..1). */
  throttle: number;
  /** Target throttle set by input (0..1). */
  targetThrottle: number;
  /** True airspeed (wind-corrected) along the flight path, for the HUD. */
  airspeed: number;
  /** Angle of attack in radians (positive = nose above the flight path). */
  alpha: number;
  /** Sideslip angle in radians (0 = coordinated flight). */
  beta: number;
  /** Load factor in g's (1 = straight & level cruise). */
  gForce: number;
  /** Height above the ground directly below, written by the collision probe. */
  altitude: number;
  /** True while the wing is past the critical angle of attack. */
  stalling: boolean;
  /** True while rolling on the ground after a landing (or before take-off). */
  grounded: boolean;
  /** Seconds airborne since the current flight started, for the HUD. */
  flightTime: number;
  /** Whether the physics step should advance (false in menu / after a crash). */
  running: boolean;
}

export const flight: FlightState = {
  position: new THREE.Vector3(),
  velocity: new THREE.Vector3(),
  quaternion: new THREE.Quaternion(),
  angularVelocity: new THREE.Vector3(),
  throttle: START_THROTTLE,
  targetThrottle: START_THROTTLE,
  airspeed: 0,
  alpha: 0,
  beta: 0,
  gForce: 1,
  altitude: 0,
  stalling: false,
  grounded: false,
  flightTime: 0,
  running: false,
};

// Scratch objects reused every frame to avoid per-frame allocation.
const _forward = new THREE.Vector3();
const _up = new THREE.Vector3();
const _right = new THREE.Vector3();
const _force = new THREE.Vector3();
const _airVel = new THREE.Vector3();
const _vHat = new THREE.Vector3();
const _vLocal = new THREE.Vector3();
const _liftDir = new THREE.Vector3();
const _torque = new THREE.Vector3();
const _wind = new THREE.Vector3(WIND_X, 0, WIND_Z);
const _qInv = new THREE.Quaternion();
const FORWARD_LOCAL = new THREE.Vector3(0, 0, -1);
const UP_LOCAL = new THREE.Vector3(0, 1, 0);

/**
 * Reset the aircraft to a level, powered spawn state.
 * @param position  where to place the craft
 * @param heading   optional world-space yaw (radians); defaults to facing -Z
 */
export function resetFlight(position: THREE.Vector3, heading = 0): void {
  flight.position.copy(position);
  flight.quaternion.setFromEuler(new THREE.Euler(0, heading, 0));
  // Launch already moving forward so the wing has lift from the first frame.
  _forward.copy(FORWARD_LOCAL).applyQuaternion(flight.quaternion);
  flight.velocity.copy(_forward).multiplyScalar(START_SPEED);
  flight.angularVelocity.set(0, 0, 0);
  flight.throttle = START_THROTTLE;
  flight.targetThrottle = START_THROTTLE;
  flight.airspeed = START_SPEED;
  flight.alpha = 0;
  flight.beta = 0;
  flight.gForce = 1;
  flight.stalling = false;
  flight.grounded = false;
  flight.flightTime = 0;
  // Move the Rapier body too, if it exists yet (it may still be loading the
  // WASM module on first mount — initPhysics captures the spawn transform).
  teleportBody(flight.position, flight.quaternion, flight.velocity);
}

/**
 * Advance the flight model by `dt` seconds.
 *
 * The aerodynamic model (below) computes forces and torques; Rapier owns the
 * 6-DoF dynamics: gravity, force/torque accumulation, semi-implicit
 * integration and the inertia tensor — including gyroscopic coupling between
 * the body axes, which the previous hand-rolled integrator didn't model.
 *
 * Aero model summary:
 *   - Angle of attack (α) and sideslip (β) come from the *wind-relative*
 *     velocity, so the world has a real air mass the aircraft moves through.
 *   - Lift coefficient rises linearly with α until the critical angle, then
 *     breaks down through a post-stall curve — stalls are caused by exceeding
 *     α, not by a magic speed, so a steep pull-up at speed can stall too.
 *   - Drag is parasitic + induced (∝ CL²) and opposes the flight path.
 *   - Propeller thrust decays with airspeed and with altitude (thin air).
 *   - Control surfaces are torques whose authority scales with dynamic
 *     pressure q: slow flight = mushy controls, fast = twitchy.
 *   - Adverse yaw, weathervane stability, engine torque and P-factor add the
 *     small asymmetric moments of a real single-engine prop.
 *   - Ground effect: within ~1 wingspan of the terrain, induced drag drops
 *     and lift rises — the float just before touchdown.
 */
export function stepFlight(dt: number): void {
  if (!physicsReady()) return; // Rapier WASM still loading

  _forward.copy(FORWARD_LOCAL).applyQuaternion(flight.quaternion);
  _up.copy(UP_LOCAL).applyQuaternion(flight.quaternion);
  _right.set(1, 0, 0).applyQuaternion(flight.quaternion);

  // --- Wind-relative air velocity (true airspeed vector) ---
  _airVel.copy(flight.velocity).sub(_wind);
  const airSpeed = _airVel.length();
  flight.airspeed = airSpeed;

  // --- Angle of attack & sideslip ---
  // Rotate the flight-path direction into the body frame: α is the elevation
  // of the path below the nose (pitch plane), β its lateral offset.
  if (airSpeed > 0.01) {
    _vHat.copy(_airVel).divideScalar(airSpeed);
    _qInv.copy(flight.quaternion).invert();
    _vLocal.copy(_vHat).applyQuaternion(_qInv);
    flight.alpha = Math.atan2(_vLocal.y, -_vLocal.z);
    flight.beta = Math.atan2(_vLocal.x, -_vLocal.z);
  } else {
    flight.alpha = 0;
    flight.beta = 0;
  }

  // --- Air density & dynamic pressure (thinner with altitude) ---
  const rho = Math.exp(-flight.position.y / AIR_DENSITY_H);
  const q = 0.5 * rho * airSpeed * airSpeed;

  // --- Throttle ---
  // Absolute requests (preset keys, touch slider) land first, then the
  // rate-based keyboard/gamepad input keeps integrating on top.
  const requested = consumeThrottleTarget();
  if (requested !== null) flight.targetThrottle = requested;
  flight.targetThrottle = clamp(
    flight.targetThrottle + input.throttle * dt,
    0,
    1,
  );
  flight.throttle = damp(
    flight.throttle,
    flight.targetThrottle,
    THROTTLE_RESPONSE * 6,
    dt,
  );

  // --- Control authority scales with dynamic pressure ---
  // At q = CONTROL_REF_Q the surfaces reach full authority; authority keeps
  // growing a little past that (twitchy when fast) and never fully vanishes
  // when slow (prop slipstream keeps the tail alive at high power).
  const authority = clamp(q / CONTROL_REF_Q, 0.1, 1.5);

  // --- Torques (body frame) ---
  const rates = flight.angularVelocity;
  _torque.set(0, 0, 0);

  // Pilot inputs: +pitch = nose up, +roll = bank right, +yaw = nose right.
  _torque.x = input.pitch * PITCH_RATE * authority;
  _torque.y = -input.yaw * YAW_RATE * authority;
  _torque.z = -input.roll * ROLL_RATE * authority;

  // Natural stability & damping:
  //  - pitch is damped and gently trimmed toward the horizon,
  //  - roll is damped and levels itself when the pilot isn't rolling,
  //  - yaw is damped and weathervanes into the relative wind (kills β).
  _torque.x += -rates.x * PITCH_DAMPING - _forward.y * PITCH_STABILITY * authority;
  _torque.y += -rates.y * YAW_DAMPING - flight.beta * YAW_STABILITY * authority;
  _torque.z += -rates.z * ROLL_DAMPING;
  if (input.roll === 0) {
    _torque.z += -_right.y * ROLL_LEVEL_RATE * authority;
  }

  // Adverse yaw: a rolling wing drags its down-going side, yawing the nose
  // away from the roll — the reason real turns need rudder coordination.
  _torque.y += rates.z * ADVERSE_YAW;

  // Engine torque & P-factor: power rolls and yaws the airframe slightly.
  const torqueEffect = flight.throttle * flight.throttle * TORQUE_FACTOR;
  _torque.z += torqueEffect;
  _torque.y += torqueEffect * 0.6;

  // Rapier takes torques in world space.
  _torque.applyQuaternion(flight.quaternion);

  // --- Forces (world space; gravity is applied by the Rapier world) ---
  _force.set(0, 0, 0);

  // Thrust: a propeller's pull decays with airspeed and with √ρ (thin air).
  const thrust =
    flight.throttle *
    THRUST_MAX *
    Math.max(0.25, 1 - (airSpeed / THRUST_SPEED_DROP) * 0.7) *
    Math.sqrt(rho);
  _force.addScaledVector(_forward, thrust);

  // Lift coefficient: linear in α up to the critical angle, then a post-stall
  // fall-off to a turbulent plateau — a stalled wing still makes some lift.
  const alphaDeg = THREE.MathUtils.radToDeg(flight.alpha);
  let cl: number;
  const absAlpha = Math.abs(alphaDeg);
  if (absAlpha < STALL_ALPHA) {
    cl = CL_ALPHA * flight.alpha;
  } else if (absAlpha < STALL_ALPHA + 8) {
    const t = (absAlpha - STALL_ALPHA) / 8;
    cl = (CL_MAX - t * (CL_MAX - CL_RECOVER)) * Math.sign(flight.alpha);
  } else {
    cl = CL_RECOVER * Math.sign(flight.alpha);
  }
  cl = clamp(cl, -CL_MAX * 1.1, CL_MAX * 1.1);

  // Ground effect: within ~1 wingspan, the ground plane weakens the tip
  // vortices — less induced drag, a little more lift.
  const groundEffect =
    flight.altitude < GROUND_EFFECT_SPAN && flight.altitude > -1
      ? 1 - flight.altitude / GROUND_EFFECT_SPAN
      : 0;

  // Lift acts perpendicular to the flight path, in the plane of symmetry:
  // the body-up vector with its along-path component removed.
  const liftMag = q * cl * (1 + groundEffect * LIFT_GROUND_EFFECT);
  if (airSpeed > 0.01) {
    _liftDir.copy(_up).addScaledVector(_vHat, -_up.dot(_vHat));
    if (_liftDir.lengthSq() > 1e-6) {
      _liftDir.normalize();
      _force.addScaledVector(_liftDir, liftMag);
    }
  }

  // Drag opposes the flight path: parasitic + induced (∝ CL², eased by
  // ground effect). A stalled wing is a very draggy wing.
  const cd = DRAG_K + DRAG_INDUCED_K * cl * cl * (1 - groundEffect * 0.45);
  if (airSpeed > 0.01) {
    _force.addScaledVector(_vHat, -q * cd);
  }

  // Sideslip drag: flying sideways through the air costs energy.
  if (airSpeed > 0.01 && Math.abs(flight.beta) > 0.01) {
    _force.addScaledVector(_right, -Math.sin(flight.beta) * q * 0.02);
  }

  // --- Hand the dynamics to Rapier and mirror the result back ---
  stepBody(dt, _force, _torque);
  readBodyState(flight);
  // Rapier reports angular velocity in world space; the aero model works in
  // body rates, so convert with the fresh orientation.
  _qInv.copy(flight.quaternion).invert();
  rates.applyQuaternion(_qInv);

  // --- Post-step rate limiting & ground handling ---
  // These modify the body rates, so they're written back to Rapier below.
  let ratesDirty = false;
  const clampedX = clamp(rates.x, -2.5, 2.5);
  const clampedY = clamp(rates.y, -1.2, 1.2);
  const clampedZ = clamp(rates.z, -3.0, 3.0);
  if (clampedX !== rates.x || clampedY !== rates.y || clampedZ !== rates.z) {
    rates.set(clampedX, clampedY, clampedZ);
    ratesDirty = true;
  }

  // On the ground the gear resists pitching/rolling until the wing is ready
  // to fly; the rudder steers the nose wheel instead of yawing the airframe.
  if (flight.grounded) {
    const rollAuthority = clamp(airSpeed / ROTATE_SPEED, 0.1, 1);
    rates.x *= rollAuthority;
    rates.z *= rollAuthority;
    if (Math.abs(input.yaw) > 0.01) {
      rates.y += -input.yaw * 0.8 * rollAuthority;
    }
    ratesDirty = true;
  }

  if (ratesDirty) {
    // Body rates → world space for Rapier.
    rates.applyQuaternion(flight.quaternion);
    setBodyAngvel(rates);
    rates.applyQuaternion(_qInv); // keep flight state in body rates
  }

  // --- Telemetry ---
  flight.gForce = clamp(liftMag / GRAVITY, -2, 5);
  flight.stalling = absAlpha > STALL_ALPHA;
}

/** Point ahead of the nose, for camera aim helpers. Writes into `out`. */
export function forwardPoint(distance: number, out: THREE.Vector3): THREE.Vector3 {
  return out
    .copy(FORWARD_LOCAL)
    .applyQuaternion(flight.quaternion)
    .multiplyScalar(distance)
    .add(flight.position);
}