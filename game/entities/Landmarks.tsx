"use client";

import { Suspense, useEffect, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { flight } from "@/game/systems/flight";
import { groundHeightAt, terrainReady } from "@/game/systems/terrain";
import { homeBase } from "@/game/systems/homeBase";
import {
  LANDMARK_CELL,
  LANDMARK_DENSITY,
  LANDMARK_HOME_CLEAR,
  LANDMARK_MODEL_URL,
  LANDMARK_RADIUS,
  LANDMARK_SINK,
  LANDMARK_SIZE,
} from "@/lib/constants";

/**
 * Deterministic hash of an integer cell coordinate to [0, 1). `salt` draws
 * independent streams from the same cell (does this cell get a landmark? where
 * inside it? what rotation?), so the whole scatter is a pure function of world
 * position — a landmark you fly past is in the exact same place when you circle
 * back, with no per-cell state to store.
 */
function hash(x: number, z: number, salt: number): number {
  let h = (x | 0) * 374761393 + (z | 0) * 668265263 + salt * 2246822519;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 4294967296;
}

/**
 * The landmark pool lives outside React (built once from the loaded model,
 * mutated every frame) — the same non-reactive singleton pattern as the cloud
 * field and flight state, and what the React Compiler lint requires (mutating
 * a useMemo'd object in useFrame is rejected).
 */
interface LandmarkPool {
  root: THREE.Group;
  slots: THREE.Group[];
  /** Lowest point of the normalized model, for burying the base in the ground. */
  bottomY: number;
}

let pool: LandmarkPool | null = null;

function buildPool(gltf: { scene: THREE.Group }): LandmarkPool {
  // Normalize the source: center on origin, longest side = LANDMARK_SIZE.
  const proto = gltf.scene.clone(true);
  const box = new THREE.Box3().setFromObject(proto);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const scale = LANDMARK_SIZE / (Math.max(size.x, size.y, size.z) || 1);
  proto.scale.setScalar(scale);
  proto.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
  proto.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = false;
      mesh.receiveShadow = true;
    }
  });
  const bottomY = new THREE.Box3().setFromObject(proto).min.y;

  // Pool big enough for the worst case: every cell in range populated.
  const span = 2 * LANDMARK_RADIUS + 1;
  const root = new THREE.Group();
  const slots: THREE.Group[] = [];
  for (let i = 0; i < span * span; i++) {
    const group = new THREE.Group();
    group.add(proto.clone(true)); // clones share geometry — cheap on the GPU
    group.visible = false;
    root.add(group);
    slots.push(group);
  }
  return { root, slots, bottomY };
}

/**
 * Scattered scenery: big terrain2 plateaus/islands strewn over the base terrain
 * so the horizon isn't the same tiled ridge in every direction. Placement is a
 * deterministic per-cell hash (stable, non-repeating), and only the cells
 * within LANDMARK_RADIUS of the aircraft are ever built — a small pool of
 * clones is re-homed whenever the player crosses into a new cell, the same
 * endless-world trick the terrain grid uses.
 *
 * Visual only: landmarks are NOT registered as ground colliders. They're
 * re-homed as the player moves, and rebuilding their BVH each time (plus the
 * straight-down ground probe treating a peak as "ground") would cost far more
 * than it's worth for background scenery. The collidable world stays the base
 * terrain grid + runway.
 */
function LandmarkField() {
  const gltf = useLoader(GLTFLoader, LANDMARK_MODEL_URL, (loader) => {
    loader.setMeshoptDecoder(MeshoptDecoder);
  });

  const holder = useRef<THREE.Group>(null);
  useEffect(() => {
    if (!pool) pool = buildPool(gltf);
    const h = holder.current;
    h?.add(pool.root);
    return () => {
      if (pool) h?.remove(pool.root);
    };
  }, [gltf]);

  // Re-home the pool only when the aircraft crosses into a new cell.
  const cell = useRef({ x: Infinity, z: Infinity });
  useFrame(() => {
    const p = pool;
    if (!p || !terrainReady()) return;
    const px = Math.round(flight.position.x / LANDMARK_CELL);
    const pz = Math.round(flight.position.z / LANDMARK_CELL);
    if (px === cell.current.x && pz === cell.current.z) return;
    cell.current.x = px;
    cell.current.z = pz;

    let s = 0;
    for (let dz = -LANDMARK_RADIUS; dz <= LANDMARK_RADIUS; dz++) {
      for (let dx = -LANDMARK_RADIUS; dx <= LANDMARK_RADIUS; dx++) {
        const cx = px + dx;
        const cz = pz + dz;
        const group = p.slots[s++];
        if (hash(cx, cz, 0) >= LANDMARK_DENSITY) {
          group.visible = false;
          continue;
        }
        // Jitter within the cell so the scatter never reads as a grid.
        const x = (cx + (hash(cx, cz, 1) - 0.5) * 0.7) * LANDMARK_CELL;
        const z = (cz + (hash(cx, cz, 2) - 0.5) * 0.7) * LANDMARK_CELL;
        // Never let a landmark swallow the runway.
        if (Math.hypot(x - homeBase.x, z - homeBase.z) < LANDMARK_HOME_CLEAR) {
          group.visible = false;
          continue;
        }
        const ground = groundHeightAt(x, z);
        if (!Number.isFinite(ground)) {
          group.visible = false;
          continue;
        }
        const extra = 0.75 + hash(cx, cz, 3) * 0.6; // per-landmark size variance
        group.scale.setScalar(extra);
        group.rotation.set(0, hash(cx, cz, 4) * Math.PI * 2, 0);
        // Sit the (scaled) base in the ground, sunk a touch so it merges.
        group.position.set(x, ground - p.bottomY * extra - LANDMARK_SINK, z);
        group.visible = true;
      }
    }
  });

  return <group ref={holder} />;
}

export function Landmarks() {
  return (
    <Suspense fallback={null}>
      <ErrorBoundary label="Landmarks" fallback={null}>
        <LandmarkField />
      </ErrorBoundary>
    </Suspense>
  );
}
