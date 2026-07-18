import RAPIER from "@dimforge/rapier3d-compat";
import {
  GRAVITY,
  INERTIA_PITCH,
  INERTIA_ROLL,
  INERTIA_YAW,
} from "@/lib/constants";

/**
 * Rapier physics backend.
 *
 * The aircraft is a single dynamic rigid body — no colliders. Terrain contact
 * stays with the game's ground probes (`FlightRig`), because the world is
 * endless and wraps around the camera, which a Rapier heightfield cannot do.
 * What Rapier owns is the 6-DoF dynamics: force/torque accumulation, gravity,
 * semi-implicit integration and the inertia tensor (including the gyroscopic
 * coupling the hand-rolled integrator didn't have).
 *
 * The aero model is normalised (unit mass, unit wing area), so the body's mass
 * is 1 and the INERTIA_* tuning constants double as its principal moments.
 *
 * Like the flight state, this lives outside React: the WASM module and the
 * world are module singletons, stepped once per frame from `stepFlight`.
 */
let world: RAPIER.World | null = null;
let body: RAPIER.RigidBody | null = null;

/** True once the WASM module is loaded and the aircraft body exists. */
export function physicsReady(): boolean {
  return body !== null;
}

/**
 * Load the Rapier WASM module and create the world + aircraft body at the
 * given spawn transform. Safe to call once; later calls are no-ops.
 */
export async function initPhysics(
  position: { x: number; y: number; z: number },
  quaternion: { x: number; y: number; z: number; w: number },
): Promise<void> {
  if (body) return;
  await RAPIER.init();
  world = new RAPIER.World({ x: 0, y: -GRAVITY, z: 0 });
  body = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(position.x, position.y, position.z)
      .setRotation(quaternion)
      // Drag and angular damping come from the aero model, not Rapier.
      .setLinearDamping(0)
      .setAngularDamping(0)
      .setAdditionalMassProperties(
        1, // normalised mass
        { x: 0, y: 0, z: 0 }, // centre of mass at the origin
        { x: INERTIA_PITCH, y: INERTIA_YAW, z: INERTIA_ROLL },
        { w: 1, x: 0, y: 0, z: 0 },
      ),
  );
}

/**
 * Apply this frame's aerodynamic force and torque (both world space) and
 * advance the world by `dt` seconds. Gravity is added by the world itself.
 */
export function stepBody(
  dt: number,
  force: { x: number; y: number; z: number },
  torque: { x: number; y: number; z: number },
): void {
  if (!world || !body) return;
  body.resetForces(true);
  body.resetTorques(true);
  body.addForce(force, true);
  body.addTorque(torque, true);
  world.timestep = dt;
  world.step();
}

/**
 * Copy the body's transform and velocities into the flight state. Rapier
 * stores angular velocity in world space; it is converted to body rates here
 * because the aero model reasons in the body frame.
 */
export function readBodyState(state: {
  position: { x: number; y: number; z: number };
  quaternion: { x: number; y: number; z: number; w: number };
  velocity: { x: number; y: number; z: number };
  angularVelocity: { x: number; y: number; z: number };
}): void {
  if (!body) return;
  const p = body.translation();
  const r = body.rotation();
  const lv = body.linvel();
  const av = body.angvel(); // world space
  state.position.x = p.x;
  state.position.y = p.y;
  state.position.z = p.z;
  state.quaternion.x = r.x;
  state.quaternion.y = r.y;
  state.quaternion.z = r.z;
  state.quaternion.w = r.w;
  state.velocity.x = lv.x;
  state.velocity.y = lv.y;
  state.velocity.z = lv.z;
  state.angularVelocity.x = av.x;
  state.angularVelocity.y = av.y;
  state.angularVelocity.z = av.z;
}

/** Teleport the body (spawn/respawn) and clear its velocities. */
export function teleportBody(
  position: { x: number; y: number; z: number },
  quaternion: { x: number; y: number; z: number; w: number },
  linvel: { x: number; y: number; z: number },
): void {
  if (!body) return;
  body.setTranslation(position, true);
  body.setRotation(quaternion, true);
  body.setLinvel(linvel, true);
  body.setAngvel({ x: 0, y: 0, z: 0 }, true);
}

/** Hard-set the body's linear velocity (ground contact corrections). */
export function setBodyLinvel(v: { x: number; y: number; z: number }): void {
  body?.setLinvel(v, true);
}

/** Hard-set the body's translation (ground contact corrections). */
export function setBodyTranslation(v: {
  x: number;
  y: number;
  z: number;
}): void {
  body?.setTranslation(v, true);
}

/** Hard-set the body's angular velocity, world space (rate clamps, gear). */
export function setBodyAngvel(v: { x: number; y: number; z: number }): void {
  body?.setAngvel(v, true);
}