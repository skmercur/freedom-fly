"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { Aircraft } from "@/game/entities/Aircraft";
import { flight, resetFlight, stepFlight } from "@/game/systems/flight";
import { groundHeightAt } from "@/game/systems/terrain";
import { useGameStore } from "@/stores/gameStore";
import {
  CAMERA_DISTANCE,
  CAMERA_HEIGHT,
  CAMERA_LOOK_AHEAD,
  CAMERA_SMOOTH,
  GROUND_CLEARANCE,
  RESPAWN_DELAY,
  START_ALTITUDE,
} from "@/lib/constants";

// Where a fresh aircraft appears (world x/z) and which way it faces.
const SPAWN_X = 0;
const SPAWN_Z = 700;
const SPAWN_HEADING = 0; // faces -Z, toward the terrain

const _spawn = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _forward = new THREE.Vector3();
const FORWARD_LOCAL = new THREE.Vector3(0, 0, -1);
const WORLD_UP = new THREE.Vector3(0, 1, 0);

/** Place a new aircraft above the ground at the spawn point. */
function spawn(): void {
  const ground = groundHeightAt(SPAWN_X, SPAWN_Z);
  const base = Number.isFinite(ground) ? ground : 0;
  _spawn.set(SPAWN_X, base + START_ALTITUDE, SPAWN_Z);
  resetFlight(_spawn, SPAWN_HEADING);
}

/**
 * The heart of the sim. Owns the aircraft's transform group and, every frame:
 * steps the flight physics, checks for ground contact, and drives the chase
 * camera. Physics and camera share one `useFrame` so their order is guaranteed.
 */
export function FlightRig() {
  const rig = useRef<THREE.Group>(null);
  const camera = useThree((s) => s.camera);
  const phase = useGameStore((s) => s.phase);

  // Park an aircraft in view for the menu, and re-spawn on entering flight.
  useEffect(() => {
    spawn();
  }, []);

  useEffect(() => {
    if (phase === "flying") spawn();
  }, [phase]);

  // Auto-respawn a short beat after crashing.
  useEffect(() => {
    if (phase !== "crashed") return;
    const id = setTimeout(
      () => useGameStore.getState().respawn(),
      RESPAWN_DELAY * 1000,
    );
    return () => clearTimeout(id);
  }, [phase]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const flying = useGameStore.getState().phase === "flying";

    if (flying) {
      stepFlight(dt);

      // Ground contact → crash.
      const ground = groundHeightAt(flight.position.x, flight.position.z);
      flight.altitude = Number.isFinite(ground)
        ? flight.position.y - ground
        : flight.position.y;
      if (Number.isFinite(ground) && flight.altitude < GROUND_CLEARANCE) {
        useGameStore.getState().crash();
      }
    }

    // Apply the airframe transform to the visible model.
    if (rig.current) {
      rig.current.position.copy(flight.position);
      rig.current.quaternion.copy(flight.quaternion);
    }

    // --- Behind-the-tail chase camera ---
    // Nose direction in world space drives where "behind" is; height comes from
    // world-up so banking doesn't roll the camera with the aircraft.
    _forward.copy(FORWARD_LOCAL).applyQuaternion(flight.quaternion);
    _camTarget
      .copy(flight.position)
      .addScaledVector(_forward, -CAMERA_DISTANCE)
      .addScaledVector(WORLD_UP, CAMERA_HEIGHT);
    const k = 1 - Math.exp(-CAMERA_SMOOTH * dt);
    camera.position.lerp(_camTarget, k);

    _lookTarget
      .copy(flight.position)
      .addScaledVector(_forward, CAMERA_LOOK_AHEAD);
    camera.up.copy(WORLD_UP);
    camera.lookAt(_lookTarget);
  });

  return (
    <group ref={rig}>
      <Aircraft />
    </group>
  );
}
