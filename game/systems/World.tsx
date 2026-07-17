"use client";

import { useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Entity, PowerUpType } from "@/types/game";
import { Collectible } from "@/game/entities/Collectible";
import { Obstacle } from "@/game/entities/Obstacle";
import { PowerUp } from "@/game/entities/PowerUp";
import { createEntity } from "@/game/systems/spawn";
import { runtime } from "@/game/systems/runtime";
import {
  difficultyFromTime,
  spawnIntervalForDifficulty,
  speedForDifficulty,
} from "@/game/systems/difficulty";
import { addTrauma, burst } from "@/game/effects/effectsBus";
import { useGameStore } from "@/stores/gameStore";
import { audio } from "@/lib/audio";
import { damp, randRange } from "@/lib/math";
import { COLORS, SLOW_FACTOR } from "@/lib/constants";

const POWER_TYPES: PowerUpType[] = ["shield", "magnet", "slow"];

/**
 * The World owns the streaming entities and runs the master game loop.
 *
 * Two update paths, deliberately separated:
 *  - The *list* of entities lives in React state and only changes on spawn or
 *    despawn (a few times per second) — cheap.
 *  - Everything per-frame (difficulty ramp, power-up timers, spawning, and each
 *    entity's motion) runs through refs/`useFrame`, never touching React state.
 */
export function World() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const spawnTimer = useRef(0.6);
  const nextId = useRef(0);
  const phase = useGameStore((s) => s.phase);
  const prevPhase = useRef(phase);

  // Reset on a fresh run; clear the field when leaving gameplay.
  useEffect(() => {
    const startingRun = phase === "playing" && prevPhase.current !== "paused";
    if (startingRun) {
      setEntities([]);
      spawnTimer.current = 0.6;
      nextId.current = 0;
    } else if (phase === "menu" || phase === "gameover") {
      setEntities([]);
    }
    prevPhase.current = phase;
  }, [phase]);

  const remove = useCallback(
    (e: Entity) => setEntities((prev) => prev.filter((x) => x.id !== e.id)),
    [],
  );

  // Resolve what happens when the player touches an entity.
  const onCollide = useCallback(
    (e: Entity) => {
      const g = useGameStore.getState();
      switch (e.kind) {
        case "collectible": {
          const combo = g.combo;
          g.collect();
          audio().collect(combo);
          burst(e.pos, e.color, 16, 7);
          break;
        }
        case "obstacle": {
          if (runtime.shield) {
            // Shield deflects the rock instead of costing a life.
            audio().power();
            burst(e.pos, COLORS.shield, 20, 9);
            addTrauma(0.22);
          } else {
            g.hit();
            audio().hit();
            burst(e.pos, e.color, 26, 10);
            addTrauma(0.55);
            if (useGameStore.getState().phase === "gameover") audio().gameover();
          }
          break;
        }
        case "powerup": {
          if (e.powerType) g.activatePowerUp(e.powerType);
          audio().power();
          burst(e.pos, e.color, 22, 8);
          addTrauma(0.15);
          break;
        }
      }
      remove(e);
    },
    [remove],
  );

  const onExpire = useCallback((e: Entity) => remove(e), [remove]);

  // --- Master game loop ---------------------------------------------------
  useFrame((_, delta) => {
    if (!runtime.running) return;
    const dt = Math.min(delta, 0.05);
    const g = useGameStore.getState();

    // Difficulty ramp.
    runtime.elapsed += dt;
    runtime.difficulty = difficultyFromTime(runtime.elapsed);
    runtime.worldSpeed = damp(
      runtime.worldSpeed,
      speedForDifficulty(runtime.difficulty),
      2.5,
      dt,
    );

    // Slow-mo easing (target depends on whether the timer is running).
    const slowTarget = runtime.powerRemaining.slow > 0 ? SLOW_FACTOR : 1;
    runtime.slow = damp(runtime.slow, slowTarget, 5, dt);

    // Level milestones give a little feedback kick.
    const level = Math.floor(runtime.difficulty) + 1;
    if (level !== g.level) {
      g.setLevel(level);
      addTrauma(0.12);
    }

    // Tick down active power-ups; expire when they hit zero.
    for (const t of POWER_TYPES) {
      if (runtime.powerRemaining[t] > 0) {
        runtime.powerRemaining[t] -= dt;
        if (runtime.powerRemaining[t] <= 0) {
          runtime.powerRemaining[t] = 0;
          g.deactivatePowerUp(t);
        }
      }
    }

    // Spawn manager.
    spawnTimer.current -= dt;
    if (spawnTimer.current <= 0) {
      spawnTimer.current =
        spawnIntervalForDifficulty(runtime.difficulty) * randRange(0.8, 1.2);
      const e = createEntity(nextId.current++);
      setEntities((prev) => [...prev, e]);
    }
  });

  return (
    <>
      {entities.map((e) => {
        if (e.kind === "collectible")
          return (
            <Collectible
              key={e.id}
              entity={e}
              onCollide={onCollide}
              onExpire={onExpire}
            />
          );
        if (e.kind === "obstacle")
          return (
            <Obstacle
              key={e.id}
              entity={e}
              onCollide={onCollide}
              onExpire={onExpire}
            />
          );
        return (
          <PowerUp
            key={e.id}
            entity={e}
            onCollide={onCollide}
            onExpire={onExpire}
          />
        );
      })}
    </>
  );
}
