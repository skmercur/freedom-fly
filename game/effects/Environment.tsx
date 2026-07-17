"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Scenery } from "@/game/effects/Scenery";
import { BOUND_Y, COLORS } from "@/lib/constants";

/**
 * Inside-out sky dome with a baked vertex-color gradient.
 *
 * WebGPU can't run our old GLSL background shader, so the gradient is baked
 * into the geometry's vertex colors instead (top → bottom lerp) and drawn with
 * a plain `MeshBasicMaterial`. A slow rotation keeps the sky subtly alive.
 */
function Backdrop() {
  const ref = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(95, 32, 24);
    const top = new THREE.Color("#101a44");
    const bottom = new THREE.Color(COLORS.bg);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const h = (pos.getY(i) / 95) * 0.5 + 0.5; // 0 (bottom) → 1 (top)
      c.copy(bottom).lerp(top, Math.pow(h, 1.3));
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

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.01;
  });

  return <mesh ref={ref} geometry={geometry} material={material} />;
}

/**
 * Scene lighting + backdrop + optional scenery + a shadow-catching floor.
 * A single shadow-casting key light keeps the GPU budget in check while still
 * grounding the ship and rocks with real shadows.
 */
export function Environment() {
  return (
    <>
      <ambientLight intensity={0.5} color="#9fb0ff" />
      <hemisphereLight args={["#93c5fd", "#0b1030", 0.55]} />
      <directionalLight
        position={[6, 12, 4]}
        intensity={1.6}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
      />
      {/* Colored fill from behind the player for rim glow. */}
      <pointLight
        position={[0, 1, 10]}
        color={COLORS.player}
        intensity={30}
        distance={26}
      />

      <Backdrop />
      <Scenery />

      {/* Floor: receives shadows only, sits below the play field. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -(BOUND_Y + 2.6), -20]}
        receiveShadow
      >
        <planeGeometry args={[120, 220]} />
        <meshStandardMaterial
          color="#070b1c"
          metalness={0.2}
          roughness={0.85}
        />
      </mesh>
    </>
  );
}
