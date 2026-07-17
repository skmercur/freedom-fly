"use client";

import { memo, useRef } from "react";
import type * as THREE from "three";
import type { Entity } from "@/types/game";
import { useEntityMotion } from "@/game/hooks/useEntityMotion";
import { geometries, obstacleMaterial } from "./assets";

interface Props {
  entity: Entity;
  onCollide: (e: Entity) => void;
  onExpire: (e: Entity) => void;
}

/** Dark, faceted rock — costs a life on contact. */
function ObstacleImpl({ entity, onCollide, onExpire }: Props) {
  const group = useRef<THREE.Group>(null);
  useEntityMotion(entity, group, { onCollide, onExpire });
  return (
    <group ref={group}>
      <mesh geometry={geometries.rock} material={obstacleMaterial} castShadow />
    </group>
  );
}

export const Obstacle = memo(ObstacleImpl);
