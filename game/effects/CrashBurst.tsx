"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { flight } from "@/game/systems/flight";
import { useGameStore } from "@/stores/gameStore";

const COUNT = 70;
const DURATION = 1.3; // seconds
const GRAVITY = 22;

/**
 * A one-shot debris/dust burst at the crash point: a point cloud thrown
 * outward, falling under gravity and fading out. Rebuilt (re-armed) each time
 * the phase enters "crashed"; invisible otherwise.
 */
export function CrashBurst() {
  const points = useRef<THREE.Points>(null);
  const velocities = useMemo(() => new Float32Array(COUNT * 3), []);
  const age = useRef(Infinity);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3),
    );
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
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geo;
  }, []);

  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 2.2,
        vertexColors: true,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    [],
  );

  // Arm the burst at the aircraft's position when a crash lands in the store.
  const phase = useGameStore((s) => s.phase);
  useEffect(() => {
    if (phase !== "crashed" || !points.current) return;
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < COUNT; i++) {
      pos.setXYZ(i, flight.position.x, flight.position.y, flight.position.z);
      // Mostly-upward cone of debris with lateral spread.
      velocities[i * 3] = (Math.random() - 0.5) * 34;
      velocities[i * 3 + 1] = 6 + Math.random() * 26;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 34;
    }
    pos.needsUpdate = true;
    age.current = 0;
    points.current.visible = true;
  }, [phase, geometry, velocities]);

  useFrame((_, delta) => {
    if (age.current > DURATION || !points.current) return;
    age.current += delta;
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < COUNT; i++) {
      velocities[i * 3 + 1] -= GRAVITY * delta;
      pos.setXYZ(
        i,
        pos.getX(i) + velocities[i * 3] * delta,
        pos.getY(i) + velocities[i * 3 + 1] * delta,
        pos.getZ(i) + velocities[i * 3 + 2] * delta,
      );
    }
    pos.needsUpdate = true;
    material.opacity = Math.max(0, 1 - age.current / DURATION);
    if (age.current > DURATION) points.current.visible = false;
  });

  return (
    <points
      ref={points}
      geometry={geometry}
      material={material}
      visible={false}
      frustumCulled={false}
    />
  );
}
