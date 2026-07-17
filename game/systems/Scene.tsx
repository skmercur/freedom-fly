"use client";

import { Environment } from "@/game/effects/Environment";
import { Starfield } from "@/game/entities/Starfield";
import { Player } from "@/game/entities/Player";
import { World } from "@/game/systems/World";
import { Particles } from "@/game/effects/Particles";
import { CameraShake } from "@/game/effects/CameraShake";
import { PostProcessing } from "@/game/effects/PostProcessing";

/**
 * The full scene graph rendered inside the Canvas.
 *
 * Render order mirrors the per-frame update order: the camera settles first,
 * the Player publishes its position, then the World loop and entities run
 * against that fresh position, and finally particles and post-processing.
 */
export function Scene() {
  return (
    <>
      <CameraShake />
      <Environment />
      <Starfield />
      <Player />
      <World />
      <Particles />
      <PostProcessing />
    </>
  );
}
