"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { COLORS } from "@/lib/constants";

/**
 * Inside-out daytime sky dome with a baked vertex-color gradient.
 *
 * WebGPU can't run raw-GLSL shader materials, so the sky gradient is baked into
 * the geometry's vertex colors (horizon → zenith) and drawn with a plain
 * `MeshBasicMaterial`. The dome is large enough to enclose the whole flyable
 * world and ignores fog/tone-mapping so it reads as an even sky.
 */
function SkyDome() {
  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(6000, 32, 20);
    const top = new THREE.Color(COLORS.skyTop);
    const horizon = new THREE.Color(COLORS.skyHorizon);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const h = THREE.MathUtils.clamp(pos.getY(i) / 6000, -1, 1);
      // Sharpen the blend near the horizon, ease it toward the zenith.
      const t = Math.pow(THREE.MathUtils.clamp(h, 0, 1), 0.55);
      c.copy(horizon).lerp(top, t);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geo;
  }, []);

  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        toneMapped: false,
      }),
    [],
  );

  return <mesh geometry={geometry} material={material} renderOrder={-1} />;
}

/** Scene lighting + sky + a soft sun disc high in the sky. */
export function Environment() {
  return (
    <>
      <SkyDome />

      <hemisphereLight args={["#cfe6ff", "#5b6a55", 0.9]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[600, 900, 400]} intensity={2.2} color={COLORS.sun} />

      {/* Sun disc, far away, unlit. */}
      <mesh position={[900, 1400, 700]}>
        <sphereGeometry args={[90, 24, 24]} />
        <meshBasicMaterial color={COLORS.sun} toneMapped={false} fog={false} />
      </mesh>
    </>
  );
}
