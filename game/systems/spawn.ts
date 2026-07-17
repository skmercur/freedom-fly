import * as THREE from "three";
import type { Entity, EntityKind, PowerUpType } from "@/types/game";
import {
  BOUND_X,
  BOUND_Y,
  COLLECTIBLE_RADIUS,
  COLORS,
  OBSTACLE_RADIUS,
  POWERUP_COLOR,
  POWERUP_RADIUS,
  SPAWN_WEIGHTS,
  SPAWN_Z,
} from "@/lib/constants";
import { randRange, weightedPick } from "@/lib/math";

const POWER_TYPES: PowerUpType[] = ["shield", "magnet", "slow"];

/**
 * Factory for a freshly spawned entity. Position is random within the play
 * field; kind is weighted so collectibles dominate, obstacles threaten, and
 * power-ups stay rare. Pure aside from the injected id, so it's easy to reason
 * about and test.
 */
export function createEntity(id: number): Entity {
  const kind = weightedPick(SPAWN_WEIGHTS) as EntityKind;
  const pos = new THREE.Vector3(
    randRange(-BOUND_X * 0.92, BOUND_X * 0.92),
    randRange(-BOUND_Y * 0.92, BOUND_Y * 0.92),
    SPAWN_Z,
  );
  const spin = randRange(0.7, 2.3) * (Math.random() < 0.5 ? -1 : 1);

  if (kind === "obstacle") {
    return {
      id,
      kind,
      pos,
      spin,
      radius: OBSTACLE_RADIUS,
      color: COLORS.obstacle,
      alive: true,
    };
  }

  if (kind === "powerup") {
    const powerType = POWER_TYPES[Math.floor(Math.random() * POWER_TYPES.length)];
    return {
      id,
      kind,
      powerType,
      pos,
      spin,
      radius: POWERUP_RADIUS,
      color: POWERUP_COLOR[powerType],
      alive: true,
    };
  }

  return {
    id,
    kind: "collectible",
    pos,
    spin,
    radius: COLLECTIBLE_RADIUS,
    color: COLORS.collectible,
    alive: true,
  };
}
