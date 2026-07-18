"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { Aircraft } from "@/game/entities/Aircraft";
import { flight, resetFlight, stepFlight } from "@/game/systems/flight";
import {
  initPhysics,
  setBodyLinvel,
  setBodyTranslation,
  teleportBody,
} from "@/game/systems/physics";
import { groundHeightAt, terrainReady } from "@/game/systems/terrain";
import { homeBase, resolveHomeBase } from "@/game/systems/homeBase";
import { pollGamepad } from "@/game/systems/gamepad";
import { setMouseAxes } from "@/game/systems/input";
import { addTrauma, stepTrauma } from "@/game/effects/shake";
import { audio } from "@/lib/audio";
import { useGameStore } from "@/stores/gameStore";
import { useSettingsStore } from "@/stores/settingsStore";
import type { CrashReason } from "@/types/game";
import {
  CAMERA_DISTANCE,
  CAMERA_HEIGHT,
  CAMERA_LOOK_AHEAD,
  CAMERA_MIN_GROUND,
  CAMERA_SMOOTH,
  FOV_BASE,
  FOV_SPEED_KICK,
  FOV_SPEED_RANGE,
  GROUND_CLEARANCE,
  GROUND_FRICTION,
  LANDING_MAX_SINK,
  LANDING_MAX_SLOPE,
  LANDING_MIN_UP,
  PROBE_NOSE,
  PROBE_WING,
  RESPAWN_DELAY,
  STALL_BUFFET,
  START_ALTITUDE,
  START_SPEED,
} from "@/lib/constants";

// A fresh aircraft appears above the home base (the flat patch the runway sits
// on), facing down the strip so you can fly the pattern back to it.
const SPAWN_HEADING = 0; // faces -Z, toward the terrain

/** Once grounded, stay "grounded" until this high above the strip (hysteresis). */
const GROUND_RELEASE = GROUND_CLEARANCE + 1.5;

/**
 * Free-look orbit offsets (radians), driven by right-mouse drag. Non-reactive
 * module state, mutated by pointer handlers and eased every frame.
 */
const freeLook = { active: false, yaw: 0, pitch: 0 };

/**
 * Mouse steering response: dead zone around the screen center so a resting
 * cursor flies straight, then a squared ramp to full deflection at
 * MOUSE_FULL_AT of the way to the screen edge — gentle near center, decisive
 * at the rim.
 */
const MOUSE_DEADZONE = 0.1;
const MOUSE_FULL_AT = 0.85;
function mouseCurve(v: number): number {
  const a = Math.abs(v);
  if (a < MOUSE_DEADZONE) return 0;
  const t = Math.min(1, (a - MOUSE_DEADZONE) / (MOUSE_FULL_AT - MOUSE_DEADZONE));
  return Math.sign(v) * t * t;
}

const _spawn = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _boom = new THREE.Vector3();
const _boomRight = new THREE.Vector3();
const FORWARD_LOCAL = new THREE.Vector3(0, 0, -1);
const WORLD_UP = new THREE.Vector3(0, 1, 0);

/** Place a new aircraft above the ground over the home base. */
function spawn(): void {
  resolveHomeBase(); // pin the strip's flat patch if the terrain is ready
  const ground = groundHeightAt(homeBase.x, homeBase.z);
  const base = Number.isFinite(ground) ? ground : 0;
  _spawn.set(homeBase.x, base + START_ALTITUDE, homeBase.z);
  resetFlight(_spawn, SPAWN_HEADING);
}

/** Highest terrain point under the airframe's center, nose and wingtips. */
function probeGround(): { ground: number; spread: number } {
  const p = flight.position;
  _forward.copy(FORWARD_LOCAL).applyQuaternion(flight.quaternion);
  _right.set(1, 0, 0).applyQuaternion(flight.quaternion);
  let min = Infinity;
  let max = -Infinity;
  const sample = (x: number, z: number) => {
    const h = groundHeightAt(x, z);
    if (Number.isFinite(h)) {
      if (h < min) min = h;
      if (h > max) max = h;
    }
  };
  sample(p.x, p.z);
  sample(p.x + _forward.x * PROBE_NOSE, p.z + _forward.z * PROBE_NOSE);
  sample(p.x + _right.x * PROBE_WING, p.z + _right.z * PROBE_WING);
  sample(p.x - _right.x * PROBE_WING, p.z - _right.z * PROBE_WING);
  return max === -Infinity
    ? { ground: -Infinity, spread: 0 }
    : { ground: max, spread: max - min };
}

/**
 * The heart of the sim. Owns the aircraft's transform group and, every frame:
 * polls the gamepad, steps the flight physics, resolves ground contact
 * (landing, ground roll or crash), keeps the craft inside the world bounds,
 * and drives the chase camera (smoothing, terrain avoidance, speed-FOV,
 * crash shake, right-drag free-look). One `useFrame` so ordering is fixed.
 */
export function FlightRig() {
  const rig = useRef<THREE.Group>(null);
  const phase = useGameStore((s) => s.phase);
  const flightId = useGameStore((s) => s.flightId);
  const spawnedOnTerrain = useRef(false);

  // A fresh aircraft per flightId: fires at mount (parked menu plane) and on
  // every take-off/respawn — but NOT on pause/resume, which keeps flightId.
  useEffect(() => {
    spawn();
    // Kick off the Rapier WASM load (no-op after the first call), then snap
    // the body to the *current* flight state: if loading outlasted a
    // take-off/respawn, the transform captured at call time is stale — the
    // body would otherwise materialize at the mount-time position (probed
    // before the terrain existed, i.e. possibly underground) and crash.
    void initPhysics(
      { x: flight.position.x, y: flight.position.y, z: flight.position.z },
      {
        x: flight.quaternion.x,
        y: flight.quaternion.y,
        z: flight.quaternion.z,
        w: flight.quaternion.w,
      },
    ).then(() => {
      teleportBody(flight.position, flight.quaternion, flight.velocity);
    });
  }, [flightId]);

  // Auto-respawn a short beat after crashing.
  useEffect(() => {
    if (phase !== "crashed") return;
    const id = setTimeout(
      () => useGameStore.getState().respawn(),
      RESPAWN_DELAY * 1000,
    );
    return () => clearTimeout(id);
  }, [phase]);

  // Right-mouse drag = free-look orbit around the aircraft (snaps back on
  // release). Otherwise the cursor's offset from the screen center steers:
  // aim right to bank right, aim up to climb. Steering pauses while
  // free-looking so glancing around never veers the plane.
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (e.button === 2) freeLook.active = true;
    };
    const onPointerUp = (e: PointerEvent) => {
      if (e.button === 2) freeLook.active = false;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (freeLook.active) {
        freeLook.yaw -= e.movementX * 0.005;
        freeLook.pitch = THREE.MathUtils.clamp(
          freeLook.pitch + e.movementY * 0.004,
          -0.4,
          1.1,
        );
        return;
      }
      if (e.pointerType !== "mouse") return;
      if (!useSettingsStore.getState().mouseSteering) return;
      if (useGameStore.getState().phase !== "flying") return;
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      // Inverted (yoke-style): push the mouse DOWN to climb, pull UP to dive.
      setMouseAxes(mouseCurve(nx), mouseCurve(ny));
    };
    const onContextMenu = (e: Event) => e.preventDefault();
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("contextmenu", onContextMenu);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("contextmenu", onContextMenu);
    };
  }, []);

  useFrame((state, delta) => {
    const camera = state.camera;
    const dt = Math.min(delta, 0.05);
    const store = useGameStore.getState();
    const flying = store.phase === "flying";

    // The mount-time spawn ran before the terrain streamed in, so the parked
    // menu plane sits at a guessed altitude (possibly inside a mountain).
    // Re-spawn once, as soon as the ground can actually be probed.
    if (!spawnedOnTerrain.current && terrainReady() && !flying) {
      spawnedOnTerrain.current = true;
      spawn();
    }

    if (flying) {
      pollGamepad();
      stepFlight(dt);
      flight.flightTime += dt;

      // --- Ground contact: land, roll or crash ---
      const { ground, spread } = probeGround();
      const center = groundHeightAt(flight.position.x, flight.position.z);
      flight.altitude = Number.isFinite(center)
        ? flight.position.y - center
        : flight.position.y;

      if (Number.isFinite(ground)) {
        const height = flight.position.y - ground;
        if (height < GROUND_CLEARANCE) {
          _up.set(0, 1, 0).applyQuaternion(flight.quaternion);
          const gentle =
            -flight.velocity.y < LANDING_MAX_SINK &&
            _up.y > LANDING_MIN_UP &&
            spread < LANDING_MAX_SLOPE;
          if (flight.grounded || gentle) {
            if (!flight.grounded) {
              flight.grounded = true;
              audio().touchdown();
              addTrauma(0.25);
            }
            // Settle on the surface and roll out with friction. The Rapier
            // body owns the dynamics, so corrections go through its setters.
            flight.position.y = ground + GROUND_CLEARANCE;
            if (flight.velocity.y < 0) flight.velocity.y = 0;
            const hSpeed = Math.hypot(flight.velocity.x, flight.velocity.z);
            if (hSpeed > 0) {
              const drop = Math.min(hSpeed, GROUND_FRICTION * dt);
              flight.velocity.x -= (flight.velocity.x / hSpeed) * drop;
              flight.velocity.z -= (flight.velocity.z / hSpeed) * drop;
            }
            setBodyTranslation(flight.position);
            setBodyLinvel(flight.velocity);
            // Rolling into steep terrain is still a wreck.
            if (spread > LANDING_MAX_SLOPE * 2 && hSpeed > STALL_ROLL_SAFE) {
              wreck("terrain");
            }
          } else {
            wreck("terrain");
          }
        } else if (flight.grounded && height > GROUND_RELEASE) {
          flight.grounded = false; // lifted off again
        }
      } else if (flight.grounded) {
        flight.grounded = false; // rolled off the world edge somehow
      }
      if (flight.grounded) flight.stalling = false;

      // Stall buffet: a stalled wing shakes the airframe (and the camera).
      if (flight.stalling && !flight.grounded) {
        addTrauma(STALL_BUFFET * dt);
      }

      // Overstress buffet grows with accumulated stress; at stress 1 the
      // airframe lets go mid-air.
      if (flight.overLimit) {
        addTrauma((0.8 + flight.stress) * dt);
      }
      if (flight.overstressed) {
        wreck("overstress");
      }
    }

    // Apply the airframe transform to the visible model.
    if (rig.current) {
      rig.current.position.copy(flight.position);
      rig.current.quaternion.copy(flight.quaternion);
    }

    // --- Behind-the-tail chase camera ---
    // Nose direction in world space drives where "behind" is; height comes from
    // world-up so banking doesn't roll the camera with the aircraft. Free-look
    // rotates the boom around the craft and eases back when released.
    if (!freeLook.active) {
      const ease = 1 - Math.exp(-6 * dt);
      freeLook.yaw += (0 - freeLook.yaw) * ease;
      freeLook.pitch += (0 - freeLook.pitch) * ease;
    }
    _forward.copy(FORWARD_LOCAL).applyQuaternion(flight.quaternion);
    _boom.copy(_forward).negate();
    if (freeLook.yaw !== 0 || freeLook.pitch !== 0) {
      _boom.applyAxisAngle(WORLD_UP, freeLook.yaw);
      _boomRight.crossVectors(WORLD_UP, _boom).normalize();
      _boom.applyAxisAngle(_boomRight, freeLook.pitch);
    }
    _camTarget
      .copy(flight.position)
      .addScaledVector(_boom, CAMERA_DISTANCE)
      .addScaledVector(WORLD_UP, CAMERA_HEIGHT);
    const k = 1 - Math.exp(-CAMERA_SMOOTH * dt);
    camera.position.lerp(_camTarget, k);

    // Never let the camera sink into a mountainside.
    const camGround = groundHeightAt(camera.position.x, camera.position.z);
    if (Number.isFinite(camGround)) {
      camera.position.setY(
        Math.max(camera.position.y, camGround + CAMERA_MIN_GROUND),
      );
    }

    _lookTarget
      .copy(flight.position)
      .addScaledVector(_forward, freeLook.active ? 0 : CAMERA_LOOK_AHEAD);
    camera.up.copy(WORLD_UP);
    camera.lookAt(_lookTarget);

    // Crash shake: jitter the view by trauma², decaying over time.
    const shake = stepTrauma(dt);
    if (shake > 0) {
      camera.rotation.x += (Math.random() - 0.5) * 0.09 * shake;
      camera.rotation.y += (Math.random() - 0.5) * 0.09 * shake;
      camera.rotation.z += (Math.random() - 0.5) * 0.05 * shake;
    }

    // Speed widens the FOV a touch for a sense of pace.
    const pc = camera as THREE.PerspectiveCamera;
    if (pc.isPerspectiveCamera) {
      const kick =
        THREE.MathUtils.clamp(
          (flight.airspeed - START_SPEED) / FOV_SPEED_RANGE,
          0,
          1,
        ) * FOV_SPEED_KICK;
      const fov = pc.fov + (FOV_BASE + kick - pc.fov) * (1 - Math.exp(-3 * dt));
      if (Math.abs(fov - pc.fov) > 0.01) {
        pc.fov = fov;
        pc.updateProjectionMatrix();
      }
    }
  });

  return (
    <group ref={rig}>
      <Aircraft />
    </group>
  );
}

/** Horizontal roll speed below which hitting rough ground is forgiven. */
const STALL_ROLL_SAFE = 8;

/** End of flight: hand the phase machine the crash and make it felt. */
function wreck(reason: CrashReason): void {
  useGameStore.getState().crash(reason);
  audio().crash();
  addTrauma(1);
}
