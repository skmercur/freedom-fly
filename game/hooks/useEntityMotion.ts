"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, type RefObject } from "react";
import type * as THREE from "three";
import type { Entity } from "@/types/game";
import { runtime } from "@/game/systems/runtime";
import { distanceSq, spheresOverlap } from "@/game/physics/collision";
import { damp } from "@/lib/math";
import {
  DESPAWN_Z,
  MAGNET_RADIUS,
  MAGNET_STRENGTH,
  PLAYER_RADIUS,
} from "@/lib/constants";

interface Handlers {
  /** Player touched this entity. */
  onCollide: (entity: Entity) => void;
  /** Entity flew past the camera without being touched. */
  onExpire: (entity: Entity) => void;
}

/**
 * The one place entity movement lives. Every entity kind shares this:
 *  - streams toward the camera at the current world speed (slow-mo aware)
 *  - collectibles curve toward the player while the magnet is active
 *  - spins for an idle "float" animation and scales in when it spawns
 *  - reports collision with the player and its own despawn
 *
 * All of this runs on plain refs — no React state — so a screen full of
 * entities never triggers a re-render.
 */
export function useEntityMotion(
  entity: Entity,
  group: RefObject<THREE.Group | null>,
  handlers: Handlers,
): void {
  const age = useRef(0);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g || !entity.alive) return;
    // Freeze in place while paused / in menus, but keep the mesh visible.
    if (!runtime.running) {
      g.position.copy(entity.pos);
      return;
    }

    const dt = Math.min(delta, 0.05);
    age.current += dt;

    // Forward streaming (delta-time based → identical at any frame rate).
    entity.pos.z += runtime.worldSpeed * runtime.slow * dt;

    // Magnet: ease collectibles toward the player when in range.
    if (
      entity.kind === "collectible" &&
      runtime.magnet &&
      distanceSq(entity.pos, runtime.playerPos) < MAGNET_RADIUS * MAGNET_RADIUS
    ) {
      entity.pos.x = damp(entity.pos.x, runtime.playerPos.x, MAGNET_STRENGTH, dt);
      entity.pos.y = damp(entity.pos.y, runtime.playerPos.y, MAGNET_STRENGTH, dt);
    }

    // Idle spin.
    g.rotation.y += entity.spin * dt;
    g.rotation.x += entity.spin * 0.55 * dt;

    // Spawn "pop" — smoothstep scale-in over the first ~0.28s.
    const s = Math.min(1, age.current / 0.28);
    g.scale.setScalar(s * s * (3 - 2 * s));
    g.position.copy(entity.pos);

    // Collision with the player.
    if (spheresOverlap(entity.pos, entity.radius, runtime.playerPos, PLAYER_RADIUS)) {
      entity.alive = false;
      handlers.onCollide(entity);
      return;
    }

    // Recycle once past the camera.
    if (entity.pos.z > DESPAWN_Z) {
      entity.alive = false;
      handlers.onExpire(entity);
    }
  });
}
