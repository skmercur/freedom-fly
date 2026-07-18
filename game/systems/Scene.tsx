"use client";

import { Environment } from "@/game/effects/Environment";
import { Terrain } from "@/game/entities/Terrain";
import { FlightRig } from "@/game/systems/FlightRig";

/**
 * The full scene graph rendered inside the Canvas.
 *
 * Sky + lights, the terrain to fly over, and the FlightRig — which owns the
 * aircraft, steps the flight physics and drives the chase camera every frame.
 */
export function Scene() {
  return (
    <>
      <Environment />
      <Terrain />
      <FlightRig />
    </>
  );
}
