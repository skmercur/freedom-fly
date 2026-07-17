"use client";

import { memo, useRef } from "react";
import type * as THREE from "three";
import type { Entity } from "@/types/game";
import { useEntityMotion } from "@/game/hooks/useEntityMotion";
import { collectibleMaterial, geometries } from "./assets";

interface Props {
  entity: Entity;
  onCollide: (e: Entity) => void;
  onExpire: (e: Entity) => void;
}

/** Bright spinning gold crystal — the thing you chase. */
function CollectibleImpl({ entity, onCollide, onExpire }: Props) {
  const group = useRef<THREE.Group>(null);
  useEntityMotion(entity, group, { onCollide, onExpire });
  return (
    <group ref={group}>
      <mesh geometry={geometries.crystal} material={collectibleMaterial} />
    </group>
  );
}

export const Collectible = memo(CollectibleImpl);
