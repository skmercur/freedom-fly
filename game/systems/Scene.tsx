"use client";

import { Environment } from "@/game/effects/Environment";
import { Clouds } from "@/game/effects/Clouds";
import { CrashBurst } from "@/game/effects/CrashBurst";
import { Terrain } from "@/game/entities/Terrain";
import { Landmarks } from "@/game/entities/Landmarks";
import { Runway } from "@/game/entities/Runway";
import { FlightRig } from "@/game/systems/FlightRig";

/**
 * The full scene graph rendered inside the Canvas.
 *
 * Sky + lights, the terrain to fly over, the FlightRig — which owns the
 * aircraft, steps the flight physics and drives the chase camera every frame —
 * and the one-shot crash debris burst.
 */
export function Scene() {
  return (
    <>
      <Environment />
      <Terrain />
      <Landmarks />
      <Runway />
      <Clouds />
      <FlightRig />
      <CrashBurst />
    </>
  );
}
