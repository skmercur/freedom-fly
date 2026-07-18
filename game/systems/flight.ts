import * as THREE from "three";
import { clamp, damp } from "@/lib/math";
import {
  CONTROL_REF_SPEED,
  DRAG_K,
  GRAVITY,
  LIFT_K,
  PITCH_LEVEL_RATE,
  PITCH_RATE,
  ROLL_LEVEL_RATE,
  ROLL_RATE,
  STALL_SPEED,
  START_SPEED,
  START_THROTTLE,
  THROTTLE_RESPONSE,
  THRUST_MAX,
  YAW_RATE,
} from "@/lib/constants";
import { input } from "@/game/systems/input";

/**
 * Per-frame flight state.
 *
 * Lives OUTSIDE React on purpose: the physics step, the aircraft mesh and the
 * chase camera all read/write this every frame in `useFrame`, and routing that
 * through a store would trigger thousands of re-renders per second. React-facing
 * values (phase, crashed) live in the Zustand gameStore instead.
 */
export interface FlightState {
  /** World position of the aircraft. */
  position: THREE.Vector3;
  /** World velocity (units/s). */
  velocity: THREE.Vector3;
  /** Orientation of the airframe. Forward is the craft's local -Z. */
  quaternion: THREE.Quaternion;
  /** Current throttle setting, eased toward the target (0..1). */
  throttle: number;
  /** Target throttle set by input (0..1). */
  targetThrottle: number;
  /** Forward airspeed (velocity along the nose), for the HUD. */
  airspeed: number;
  /** Height above the ground directly below, written by the collision probe. */
  altitude: number;
  /** True while forward airspeed is under the stall threshold. */
  stalling: boolean;
  /** Whether the physics step should advance (false in menu / after a crash). */
  running: boolean;
}

export const flight: FlightState = {
  position: new THREE.Vector3(),
  velocity: new THREE.Vector3(),
  quaternion: new THREE.Quaternion(),
  throttle: START_THROTTLE,
  targetThrottle: START_THROTTLE,
  airspeed: 0,
  altitude: 0,
  stalling: false,
  running: false,
};

// Scratch objects reused every frame to avoid per-frame allocation.
const _forward = new THREE.Vector3();
const _up = new THREE.Vector3();
const _acc = new THREE.Vector3();
const _right = new THREE.Vector3();
const _dq = new THREE.Quaternion();
const _euler = new THREE.Euler();
const AXIS_X = new THREE.Vector3(1, 0, 0);
const AXIS_Y = new THREE.Vector3(0, 1, 0);
const AXIS_Z = new THREE.Vector3(0, 0, 1);
const FORWARD_LOCAL = new THREE.Vector3(0, 0, -1);
const UP_LOCAL = new THREE.Vector3(0, 1, 0);

/**
 * Reset the aircraft to a level, powered spawn state.
 * @param position  where to place the craft
 * @param heading   optional world-space yaw (radians); defaults to facing -Z
 */
export function resetFlight(position: THREE.Vector3, heading = 0): void {
  flight.position.copy(position);
  flight.quaternion.setFromEuler(_euler.set(0, heading, 0));
  // Launch already moving forward so the wing has lift from the first frame.
  _forward.copy(FORWARD_LOCAL).applyQuaternion(flight.quaternion);
  flight.velocity.copy(_forward).multiplyScalar(START_SPEED);
  flight.throttle = START_THROTTLE;
  flight.targetThrottle = START_THROTTLE;
  flight.airspeed = START_SPEED;
  flight.stalling = false;
}

/**
 * Advance the flight model by `dt` seconds. A simplified but honest aerodynamic
 * model: thrust along the nose, gravity down, quadratic drag opposing velocity,
 * and lift along the wing's up-axis proportional to forward airspeed² — which
 * collapses below the stall speed so slow flight makes the nose fall.
 */
export function stepFlight(dt: number): void {
  // Body axes in world space.
  _forward.copy(FORWARD_LOCAL).applyQuaternion(flight.quaternion);
  _up.copy(UP_LOCAL).applyQuaternion(flight.quaternion);

  const speed = flight.velocity.length();
  const forwardSpeed = Math.max(0, flight.velocity.dot(_forward));
  flight.airspeed = forwardSpeed;
  flight.stalling = forwardSpeed < STALL_SPEED;

  // --- Throttle ---
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

  // --- Attitude (control surfaces, weaker at low airspeed) ---
  const authority = clamp(forwardSpeed / CONTROL_REF_SPEED, 0.12, 1);
  // pitch: +input = nose up · roll: +input = bank right · yaw: +input = nose right.
  applyBodyRotation(AXIS_X, input.pitch * PITCH_RATE * authority * dt);
  applyBodyRotation(AXIS_Z, -input.roll * ROLL_RATE * authority * dt);
  applyBodyRotation(AXIS_Y, -input.yaw * YAW_RATE * authority * dt);

  // --- Stability augmentation ---
  // With no roll input, ease the wings back to level (right wing's y → 0), so a
  // released bank doesn't spiral the aircraft off sideways.
  if (input.roll === 0) {
    _right.copy(AXIS_X).applyQuaternion(flight.quaternion);
    applyBodyRotation(AXIS_Z, -_right.y * ROLL_LEVEL_RATE * authority * dt);
  }
  // With no pitch input, ease the nose toward the horizon (forward's y → 0).
  if (input.pitch === 0) {
    _forward.copy(FORWARD_LOCAL).applyQuaternion(flight.quaternion);
    applyBodyRotation(AXIS_X, -_forward.y * PITCH_LEVEL_RATE * authority * dt);
  }

  // --- Forces → acceleration ---
  // Refresh the body axes now that this frame's rotations have been applied.
  _forward.copy(FORWARD_LOCAL).applyQuaternion(flight.quaternion);
  _up.copy(UP_LOCAL).applyQuaternion(flight.quaternion);

  _acc.set(0, -GRAVITY, 0);
  // Thrust along the nose.
  _acc.addScaledVector(_forward, flight.throttle * THRUST_MAX);
  // Quadratic drag opposing the velocity vector.
  if (speed > 0) _acc.addScaledVector(flight.velocity, -DRAG_K * speed);
  // Lift along the wing's up-axis, proportional to forward airspeed².
  let lift = LIFT_K * forwardSpeed * forwardSpeed;
  if (flight.stalling) lift *= forwardSpeed / STALL_SPEED; // wing stalls out
  _acc.addScaledVector(_up, lift);

  // --- Integrate ---
  flight.velocity.addScaledVector(_acc, dt);
  flight.position.addScaledVector(flight.velocity, dt);
}

/** Multiply a local-axis rotation into the airframe orientation. */
function applyBodyRotation(axis: THREE.Vector3, angle: number): void {
  if (angle === 0) return;
  _dq.setFromAxisAngle(axis, angle);
  flight.quaternion.multiply(_dq).normalize();
}

/** Point ahead of the nose, for camera aim helpers. Writes into `out`. */
export function forwardPoint(distance: number, out: THREE.Vector3): THREE.Vector3 {
  return out
    .copy(FORWARD_LOCAL)
    .applyQuaternion(flight.quaternion)
    .multiplyScalar(distance)
    .add(flight.position);
}
