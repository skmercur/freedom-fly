"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { registerEmitter } from "@/game/effects/effectsBus";

/** Ring-buffer pool size — one draw call renders all live particles. */
const MAX = 500;

/** A soft round sprite drawn on a canvas (no external texture needed). */
function makeCircleTexture(): THREE.Texture {
  const size = 64;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.4, "rgba(255,255,255,0.7)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * A single point cloud that every effect in the game draws into.
 *
 * WebGPU can't run raw-GLSL ShaderMaterials, so instead of a shader we use a
 * classic `PointsMaterial` with additive blending: a particle fades simply by
 * scaling its color toward black (invisible under additive blending). All
 * simulation is plain CPU math on typed arrays; only the two GPU attributes
 * needed for rendering are uploaded each frame.
 */
export function Particles() {
  const data = useMemo(
    () => ({
      positions: new Float32Array(MAX * 3),
      colors: new Float32Array(MAX * 3), // rendered color (= base × life)
      base: new Float32Array(MAX * 3), // full-brightness color
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
    g.setAttribute("color", new THREE.BufferAttribute(data.colors, 3));
    return g;
  }, [data]);

  const material = useMemo(() => {
    const tex = makeCircleTexture();
    return new THREE.PointsMaterial({
      size: 0.9,
      map: tex,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    });
  }, []);

  useEffect(
    () => () => {
      geometry.dispose();
      material.map?.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  // Register the emit callback so gameplay code can spawn bursts.
  useEffect(() => {
    const col = new THREE.Color();
    registerEmitter((pos, colorStr, count, speed = 6) => {
      col.set(colorStr);
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
        data.base[p3] = col.r;
        data.base[p3 + 1] = col.g;
        data.base[p3 + 2] = col.b;
        data.colors[p3] = col.r;
        data.colors[p3 + 1] = col.g;
        data.colors[p3 + 2] = col.b;
        const ml = 0.45 + Math.random() * 0.55;
        data.maxLife[idx] = ml;
        data.life[idx] = ml;
      }
    });
    return () => registerEmitter(null);
  }, [data]);

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
      // Fade: scale color toward black (invisible under additive blending).
      const k = Math.max(0, data.life[i] / data.maxLife[i]);
      data.colors[p3] = data.base[p3] * k;
      data.colors[p3 + 1] = data.base[p3 + 1] * k;
      data.colors[p3 + 2] = data.base[p3 + 2] * k;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  });

  return (
    <points geometry={geometry} material={material} frustumCulled={false} />
  );
}
