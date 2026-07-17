"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { registerEmitter } from "@/game/effects/effectsBus";
import {
  particleFragmentShader,
  particleVertexShader,
} from "@/game/shaders/particleShader";

/** Ring-buffer pool size — one draw call renders all live particles. */
const MAX = 500;

/**
 * A single instanced point cloud that every effect in the game draws into.
 * Positions/velocities/lifetimes are plain typed arrays mutated on the CPU;
 * only the three GPU attributes needed for rendering are uploaded per frame.
 */
export function Particles() {
  const data = useMemo(
    () => ({
      positions: new Float32Array(MAX * 3),
      colors: new Float32Array(MAX * 3),
      lifeAttr: new Float32Array(MAX), // 0 = dead, drives size & alpha
      vel: new Float32Array(MAX * 3),
      life: new Float32Array(MAX),
      maxLife: new Float32Array(MAX),
      cursor: 0,
    }),
    [],
  );

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(data.positions, 3));
    g.setAttribute("aColor", new THREE.BufferAttribute(data.colors, 3));
    g.setAttribute("aLife", new THREE.BufferAttribute(data.lifeAttr, 1));
    return g;
  }, [data]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: particleVertexShader,
        fragmentShader: particleFragmentShader,
        uniforms: { uSize: { value: 30 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  // Dispose GPU resources on unmount.
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  // Register the emit callback so gameplay code can spawn bursts.
  useEffect(() => {
    const color = new THREE.Color();
    registerEmitter((pos, colorStr, count, speed = 6) => {
      color.set(colorStr);
      for (let i = 0; i < count; i++) {
        const idx = data.cursor;
        data.cursor = (data.cursor + 1) % MAX;
        const p3 = idx * 3;
        data.positions[p3] = pos.x;
        data.positions[p3 + 1] = pos.y;
        data.positions[p3 + 2] = pos.z;
        // Random point on a sphere → spherical burst.
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        const s = speed * (0.4 + Math.random() * 0.9);
        data.vel[p3] = Math.sin(phi) * Math.cos(theta) * s;
        data.vel[p3 + 1] = Math.sin(phi) * Math.sin(theta) * s;
        data.vel[p3 + 2] = Math.cos(phi) * s;
        data.colors[p3] = color.r;
        data.colors[p3 + 1] = color.g;
        data.colors[p3 + 2] = color.b;
        const ml = 0.45 + Math.random() * 0.55;
        data.maxLife[idx] = ml;
        data.life[idx] = ml;
        data.lifeAttr[idx] = 1;
      }
      geometry.attributes.aColor.needsUpdate = true;
    });
    return () => registerEmitter(null);
  }, [data, geometry]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    for (let i = 0; i < MAX; i++) {
      if (data.life[i] <= 0) continue;
      data.life[i] -= dt;
      const p3 = i * 3;
      data.positions[p3] += data.vel[p3] * dt;
      data.positions[p3 + 1] += data.vel[p3 + 1] * dt;
      data.positions[p3 + 2] += data.vel[p3 + 2] * dt;
      data.vel[p3] *= 0.93;
      data.vel[p3 + 1] *= 0.93;
      data.vel[p3 + 2] *= 0.93;
      data.lifeAttr[i] = Math.max(0, data.life[i] / data.maxLife[i]);
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aLife.needsUpdate = true;
  });

  return (
    <points geometry={geometry} material={material} frustumCulled={false} />
  );
}
