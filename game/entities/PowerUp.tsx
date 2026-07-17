"use client";

import { memo, useRef } from "react";
import type * as THREE from "three";
import type { Entity, PowerUpType } from "@/types/game";
import { useEntityMotion } from "@/game/hooks/useEntityMotion";
import { geometries, powerUpMaterials } from "./assets";

interface Props {
  entity: Entity;
  onCollide: (e: Entity) => void;
  onExpire: (e: Entity) => void;
}

/** Glowing ring with an inner core, tinted by its power-up type. */
function PowerUpImpl({ entity, onCollide, onExpire }: Props) {
  const group = useRef<THREE.Group>(null);
  useEntityMotion(entity, group, { onCollide, onExpire });
  const material = powerUpMaterials[entity.powerType as PowerUpType];
  return (
    <group ref={group}>
      <mesh geometry={geometries.ring} material={material} />
      <mesh geometry={geometries.core} material={material} />
    </group>
  );
}

export const PowerUp = memo(PowerUpImpl);
