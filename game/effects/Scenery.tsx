"use client";

import { Suspense } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GltfModel } from "@/game/entities/GltfModel";
import { SCENERY_MODEL_URL } from "@/lib/constants";

/**
 * Optional glTF scenery, loaded lazily and defensively.
 *
 * - Renders nothing when `SCENERY_MODEL_URL` is empty (the default): the
 *   procedural starfield/gradient world is used instead.
 * - When a URL is set, the model loads inside a Suspense boundary and an
 *   ErrorBoundary. If it's too heavy for the device or fails to parse, the
 *   ErrorBoundary swallows the error and the game keeps running — the "lazy +
 *   graceful fallback" behaviour.
 */
export function Scenery() {
  if (!SCENERY_MODEL_URL) return null;
  return (
    <ErrorBoundary label="Scenery">
      <Suspense fallback={null}>
        <group position={[0, -8, -45]}>
          <GltfModel url={SCENERY_MODEL_URL} targetSize={140} receiveShadow />
        </group>
      </Suspense>
    </ErrorBoundary>
  );
}
