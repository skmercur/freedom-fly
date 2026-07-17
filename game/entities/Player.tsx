"use client";

import { useFrame } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import * as THREE from "three";
import { Airplane } from "@/game/entities/Airplane";
import { ModelPlayer } from "@/game/entities/ModelPlayer";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { input } from "@/game/systems/input";
import { runtime } from "@/game/systems/runtime";
import { clamp, damp } from "@/lib/math";
import {
  BOUND_X,
  BOUND_Y,
  COLORS,
  PLAYER_MODEL_URL,
  PLAYER_SMOOTH,
  PLAYER_SPEED,
  PLAYER_Z,
} from "@/lib/constants";

/**
 * The player craft.
 *
 * Movement is fully delta-time based and unifies every input source: keyboard
 * and joystick nudge a target position (velocity), while the mouse sets it
 * absolutely. The visible ship eases toward that target and banks into turns
 * for a lively, responsive feel. The live position is published to
 * `runtime.playerPos` so entities can test collisions against it.
 */
export function Player() {
  const group = useRef<THREE.Group>(null);
  const ship = useRef<THREE.Group>(null);
  const shield = useRef<THREE.Mesh>(null);
  const target = useRef({ x: 0, y: 0 });
  const pos = useRef({ x: 0, y: 0 });

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;

    // 1. Resolve the movement target from whichever input is active — but only
    //    while a run is live, so the ship stays put in menus and on pause.
    if (runtime.running) {
      if (input.pointerActive) {
        target.current.x = input.pointer.x * BOUND_X;
        target.current.y = input.pointer.y * BOUND_Y;
      } else {
        target.current.x += input.axis.x * PLAYER_SPEED * dt;
        target.current.y += input.axis.y * PLAYER_SPEED * dt;
      }
      target.current.x = clamp(target.current.x, -BOUND_X, BOUND_X);
      target.current.y = clamp(target.current.y, -BOUND_Y, BOUND_Y);
    }

    // 2. Ease the actual position toward the target (buttery, FPS-independent).
    pos.current.x = damp(pos.current.x, target.current.x, PLAYER_SMOOTH, dt);
    pos.current.y = damp(pos.current.y, target.current.y, PLAYER_SMOOTH, dt);

    // 3. Publish position for the collision system.
    runtime.playerPos.set(pos.current.x, pos.current.y, PLAYER_Z);

    const g = group.current;
    const s = ship.current;
    if (g) g.position.set(pos.current.x, pos.current.y, PLAYER_Z);
    if (s) {
      // Bank into horizontal motion, pitch into vertical motion.
      const dx = target.current.x - pos.current.x;
      const dy = target.current.y - pos.current.y;
      s.rotation.z = damp(s.rotation.z, clamp(-dx * 0.5, -0.6, 0.6), 12, dt);
      s.rotation.x = damp(s.rotation.x, clamp(-dy * 0.4, -0.5, 0.5), 12, dt);
      // Idle hover bob.
      s.position.y = Math.sin(t * 2.5) * 0.07;
    }
    // Shield bubble follows the shield power-up state.
    if (shield.current) {
      shield.current.visible = runtime.shield;
      shield.current.scale.setScalar(1 + Math.sin(t * 6) * 0.04);
    }
  });

  return (
    <group ref={group}>
      <group ref={ship}>
        {/* The craft: a valid glTF model if configured, else the procedural
            airplane. The model is lazy-loaded and falls back to the procedural
            plane if it is missing or fails to load. */}
        {PLAYER_MODEL_URL ? (
          <Suspense fallback={<Airplane />}>
            <ErrorBoundary label="PlayerModel" fallback={<Airplane />}>
              <ModelPlayer />
            </ErrorBoundary>
          </Suspense>
        ) : (
          <Airplane />
        )}

        {/* Shield bubble (only visible while the shield power-up is active). */}
        <mesh ref={shield} visible={false}>
          <sphereGeometry args={[1.3, 20, 20]} />
          <meshStandardMaterial
            color={COLORS.shield}
            emissive={COLORS.shield}
            emissiveIntensity={0.8}
            transparent
            opacity={0.22}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  );
}
