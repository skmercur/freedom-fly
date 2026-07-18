import { clamp, damp } from "@/lib/math";
import { flight } from "@/game/systems/flight";
import { useGameStore } from "@/stores/gameStore";
import { audio } from "@/lib/audio";
import type { PropellerVisual } from "@/game/entities/propeller";
import {
  PROP_BLUR_DISC_OPACITY,
  PROP_BLUR_FULL,
  PROP_BLUR_START,
  PROP_RPM_IDLE,
  PROP_RPM_MAX,
  PROP_RPM_SPOOL,
} from "@/lib/constants";

/**
 * Engine/propeller state.
 *
 * Lives OUTSIDE React for the same reason as `flight`: the prop pivot and the
 * blade/disc materials are mutated every frame, and routing that through
 * React state would re-render constantly. <Aircraft> registers the extracted
 * propeller here and calls `stepEngine` from its `useFrame`.
 */
let visual: PropellerVisual | null = null;
/** Current engine speed, eased toward the throttle-driven target. */
let rpm = 0;

export function registerPropeller(v: PropellerVisual | null): void {
  visual = v;
}

/**
 * Advance the engine by `dt` seconds. Rpm eases from PROP_RPM_IDLE toward
 * PROP_RPM_MAX with throttle — the piston-engine feel from MSFS, including
 * the spool-up lag. The engine only "runs" in the flying phase: parked in the
 * menu, paused, or after a crash the prop winds down to a stop. As rpm climbs,
 * the physical blades cross-fade into the motion-blur disc. The rpm and
 * airspeed also drive the synthesized engine-drone/wind loop.
 */
export function stepEngine(dt: number): void {
  const running = useGameStore.getState().phase === "flying";
  const target = running
    ? PROP_RPM_IDLE + flight.throttle * (PROP_RPM_MAX - PROP_RPM_IDLE)
    : 0;
  rpm = damp(rpm, target, PROP_RPM_SPOOL, dt);

  audio().setFlightAudio(rpm / PROP_RPM_MAX, running ? flight.airspeed / 170 : 0);

  if (!visual) return;
  visual.pivot.rotation.x += ((rpm / 60) * 2 * Math.PI) * dt;

  const blur = clamp(
    (rpm / PROP_RPM_MAX - PROP_BLUR_START) / (PROP_BLUR_FULL - PROP_BLUR_START),
    0,
    1,
  );
  visual.discMaterial.opacity = blur * PROP_BLUR_DISC_OPACITY;
  for (const m of visual.bladeMaterials) m.opacity = 1 - 0.85 * blur;
}
