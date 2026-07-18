"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { flight } from "@/game/systems/flight";
import { useGameStore } from "@/stores/gameStore";

const COUNT = 70;
const DURATION = 1.3; // seconds
const GRAVITY = 22;

/**
 * The burst's three.js objects live outside React (built lazily on first use,
 * mutated every frame) — the same non-reactive pattern as the flight state.
 */
interface Burst {
  points: THREE.Points;
  position: THREE.BufferAttribute;
  material: THREE.PointsMaterial;
  velocities: Float32Array;
  age: number;
}

let burst: Burst | null = null;

function getBurst(): Burst {
  if (burst) return burst;

  const geometry = new THREE.BufferGeometry();
  const position = new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3);
  geometry.setAttribute("position", position);

  // Dust browns with a few ember-orange flecks.
  const colors = new Float32Array(COUNT * 3);
  const dust = new THREE.Color("#6b5843");
  const ember = new THREE.Color("#ff8c3b");
  const c = new THREE.Color();
  for (let i = 0; i < COUNT; i++) {
    c.copy(dust).lerp(ember, Math.random() < 0.25 ? Math.random() : 0);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 2.2,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });

  const points = new THREE.Points(geometry, material);
  points.visible = false;
  points.frustumCulled = false;

  burst = {
    points,
    position,
    material,
    velocities: new Float32Array(COUNT * 3),
    age: Infinity,
  };
  return burst;
}

/**
 * A one-shot debris/dust burst at the crash point: a point cloud thrown
 * outward, falling under gravity and fading out. Re-armed each time the phase
 * enters "crashed"; invisible otherwise.
 */
export function CrashBurst() {
  const holder = useRef<THREE.Group>(null);
  const phase = useGameStore((s) => s.phase);

  // Mount the (lazily built) point cloud into the scene graph.
  useEffect(() => {
    const b = getBurst();
    const h = holder.current;
    h?.add(b.points);
    return () => {
      h?.remove(b.points);
    };
  }, []);

  // Arm the burst at the aircraft's position when a crash lands in the store.
  useEffect(() => {
    if (phase !== "crashed") return;
    const b = getBurst();
    for (let i = 0; i < COUNT; i++) {
      b.position.setXYZ(
        i,
        flight.position.x,
        flight.position.y,
        flight.position.z,
      );
      // Mostly-upward cone of debris with lateral spread.
      b.velocities[i * 3] = (Math.random() - 0.5) * 34;
      b.velocities[i * 3 + 1] = 6 + Math.random() * 26;
      b.velocities[i * 3 + 2] = (Math.random() - 0.5) * 34;
    }
    b.position.needsUpdate = true;
    b.age = 0;
    b.points.visible = true;
  }, [phase]);

  useFrame((_, delta) => {
    const b = burst;
    if (!b || b.age > DURATION) return;
    b.age += delta;
    for (let i = 0; i < COUNT; i++) {
      b.velocities[i * 3 + 1] -= GRAVITY * delta;
      b.position.setXYZ(
        i,
        b.position.getX(i) + b.velocities[i * 3] * delta,
        b.position.getY(i) + b.velocities[i * 3 + 1] * delta,
        b.position.getZ(i) + b.velocities[i * 3 + 2] * delta,
      );
    }
    b.position.needsUpdate = true;
    b.material.opacity = Math.max(0, 1 - b.age / DURATION);
    if (b.age > DURATION) b.points.visible = false;
  });

  return <group ref={holder} />;
}
