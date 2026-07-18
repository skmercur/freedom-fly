"use client";

import { Suspense, useCallback } from "react";
import type * as THREE from "three";
import { GltfModel } from "@/game/entities/GltfModel";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { registerTerrain } from "@/game/systems/terrain";
import { TERRAIN_MODEL_URL, TERRAIN_SIZE } from "@/lib/constants";

/**
 * The landscape the aircraft flies over. Loaded from a glTF, auto-scaled to
 * TERRAIN_SIZE and centered at the origin. Once ready it registers itself with
 * the terrain-collision module so the flight rig can probe ground height.
 */
function TerrainModel() {
  const handleReady = useCallback((object: THREE.Object3D) => {
    registerTerrain(object);
  }, []);

  return (
    <GltfModel
      url={TERRAIN_MODEL_URL}
      targetSize={TERRAIN_SIZE}
      receiveShadow
      onReady={handleReady}
    />
  );
}

export function Terrain() {
  return (
    <Suspense fallback={null}>
      <ErrorBoundary label="Terrain" fallback={null}>
        <TerrainModel />
      </ErrorBoundary>
    </Suspense>
  );
}
