"use client";

import { Suspense, useCallback, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import { GltfModel } from "@/game/entities/GltfModel";
import { extractPropeller } from "@/game/entities/propeller";
import { registerPropeller, stepEngine } from "@/game/systems/engine";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  AIRCRAFT_MODEL_ROTATION,
  AIRCRAFT_MODEL_URL,
  AIRCRAFT_SIZE,
} from "@/lib/constants";

/** Simple placeholder shown while the model loads or if it fails. */
function Placeholder() {
  return (
    <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
      <coneGeometry args={[AIRCRAFT_SIZE * 0.25, AIRCRAFT_SIZE, 12]} />
      <meshStandardMaterial color="#dbe4ff" metalness={0.3} roughness={0.5} />
    </mesh>
  );
}

/**
 * The player aircraft's visual. It renders at the local origin; the parent
 * group (owned by <FlightRig>) carries the world position and orientation, so
 * the model just needs its nose pointing along the craft's forward axis (-Z).
 *
 * Once the model is ready, the propeller triangles are sliced out of the
 * airframe (see `extractPropeller`) and registered with the engine system,
 * which spins them every frame at a throttle-driven rpm.
 */
export function Aircraft() {
  const handleReady = useCallback((object: THREE.Object3D) => {
    // Null when the prop was already extracted from this object (StrictMode
    // double-effects) — keep the existing registration in that case.
    const visual = extractPropeller(object);
    if (visual) registerPropeller(visual);
  }, []);

  useEffect(() => () => registerPropeller(null), []);

  useFrame((_, delta) => stepEngine(Math.min(delta, 0.05)));

  return (
    <Suspense fallback={<Placeholder />}>
      <ErrorBoundary label="Aircraft" fallback={<Placeholder />}>
        <GltfModel
          url={AIRCRAFT_MODEL_URL}
          targetSize={AIRCRAFT_SIZE}
          rotation={AIRCRAFT_MODEL_ROTATION}
          castShadow
          onReady={handleReady}
        />
      </ErrorBoundary>
    </Suspense>
  );
}
