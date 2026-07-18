"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { registerTerrain } from "@/game/systems/terrain";
import { flight } from "@/game/systems/flight";
import { TERRAIN_MODEL_URL, TERRAIN_SIZE } from "@/lib/constants";

/** Positive modulo → parity of a (possibly negative) grid index. */
const odd = (n: number) => ((n % 2) + 2) % 2 === 1;

/**
 * The endless landscape. One glTF tile is auto-scaled to TERRAIN_SIZE and
 * cloned into a 3×3 grid that re-centers on the aircraft every frame, so
 * there is always ground under and around the player however far they fly.
 *
 * Seams: adjacent tiles are *mirrored* (x and/or z scale flipped by grid
 * parity), so every shared edge meets its own mirror image and the surface is
 * continuous without the heightmap having to be tileable. Mirroring flips the
 * triangle winding, so tile materials are forced DoubleSide.
 *
 * The whole grid group is registered with the terrain-collision module; the
 * clones share one geometry (and its BVH), so the flight rig's rays stay fast.
 */
function TerrainTiles() {
  const gltf = useLoader(GLTFLoader, TERRAIN_MODEL_URL, (loader) => {
    loader.setMeshoptDecoder(MeshoptDecoder);
  });

  const { grid, tiles, pitchX, pitchZ } = useMemo(() => {
    // Normalize the source tile: centered on the origin, longest side =
    // TERRAIN_SIZE (same treatment <GltfModel> gives single models).
    const proto = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(proto);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = TERRAIN_SIZE / (Math.max(size.x, size.y, size.z) || 1);
    proto.scale.setScalar(scale);
    proto.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
    proto.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.receiveShadow = true;
        // Mirrored clones reverse winding; without this they'd render inside-out.
        for (const m of Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material]) {
          m.side = THREE.DoubleSide;
        }
      }
    });

    const pitchX = size.x * scale;
    const pitchZ = size.z * scale;

    const grid = new THREE.Group();
    const tiles: THREE.Group[] = [];
    for (let i = 0; i < 9; i++) {
      const tile = new THREE.Group();
      tile.add(proto.clone(true));
      grid.add(tile);
      tiles.push(tile);
    }
    return { grid, tiles, pitchX, pitchZ };
  }, [gltf]);

  useEffect(() => {
    registerTerrain(grid);
    return () => registerTerrain(null);
  }, [grid]);

  // Keep the 3×3 grid centered on the aircraft's current tile.
  const cell = useRef({ x: Infinity, z: Infinity });
  useFrame(() => {
    const cx = Math.round(flight.position.x / pitchX);
    const cz = Math.round(flight.position.z / pitchZ);
    if (cx === cell.current.x && cz === cell.current.z) return;
    cell.current.x = cx;
    cell.current.z = cz;
    let i = 0;
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const gx = cx + dx;
        const gz = cz + dz;
        const tile = tiles[i++];
        tile.position.set(gx * pitchX, 0, gz * pitchZ);
        tile.scale.set(odd(gx) ? -1 : 1, 1, odd(gz) ? -1 : 1);
      }
    }
  });

  return <primitive object={grid} />;
}

export function Terrain() {
  return (
    <Suspense fallback={null}>
      <ErrorBoundary label="Terrain" fallback={null}>
        <TerrainTiles />
      </ErrorBoundary>
    </Suspense>
  );
}
