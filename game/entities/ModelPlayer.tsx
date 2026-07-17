"use client";

import { GltfModel } from "@/game/entities/GltfModel";
import { PLAYER_MODEL_URL } from "@/lib/constants";

/**
 * Player craft rendered from a glTF model (used when `PLAYER_MODEL_URL` is set).
 * The default rotation assumes the model faces +Z and flips it to fly into the
 * screen (-Z); tweak per asset.
 */
export function ModelPlayer() {
  return (
    <GltfModel
      url={PLAYER_MODEL_URL}
      targetSize={2.6}
      rotation={[0, Math.PI, 0]}
      castShadow
    />
  );
}
