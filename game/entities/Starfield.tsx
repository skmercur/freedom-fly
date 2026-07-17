"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { runtime } from "@/game/systems/runtime";
import { randRange } from "@/lib/math";

const COUNT = 1400;
const FAR = -130;
const NEAR = 16;
const SPREAD = 45;

/**
 * Streaming starfield. Stars drift toward the camera and wrap around when they
 * pass it, so faster world speed reads instantly as faster travel. One Points
 * object, updated on the CPU — negligible cost.
 */
export function Starfield() {
  const ref = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const arr = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3] = randRange(-SPREAD, SPREAD);
      arr[i * 3 + 1] = randRange(-SPREAD, SPREAD);
      arr[i * 3 + 2] = randRange(FAR, NEAR);
    }
    return arr;
  }, []);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [positions]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    // Parallax: stars move at a fraction of gameplay speed, plus a base drift.
    const speed = runtime.worldSpeed * runtime.slow * 0.28 + 5;
    const arr = geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < COUNT; i++) {
      const zi = i * 3 + 2;
      arr[zi] += speed * dt;
      if (arr[zi] > NEAR) {
        arr[zi] = FAR;
        arr[i * 3] = randRange(-SPREAD, SPREAD);
        arr[i * 3 + 1] = randRange(-SPREAD, SPREAD);
      }
    }
    geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        color="#cfe0ff"
        size={0.18}
        sizeAttenuation
        transparent
        opacity={0.9}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
