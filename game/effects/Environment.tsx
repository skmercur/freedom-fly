"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import {
  backgroundFragmentShader,
  backgroundVertexShader,
} from "@/game/shaders/backgroundShader";
import { BOUND_Y, COLORS } from "@/lib/constants";

/** Inside-out sky dome running the animated gradient/nebula shader. */
function Backdrop() {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uTop: { value: new THREE.Color("#0b1030") },
      uBottom: { value: new THREE.Color(COLORS.bg) },
    }),
    [],
  );
  useFrame((state) => {
    if (matRef.current)
      matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
  });
  return (
    <mesh>
      <sphereGeometry args={[95, 32, 32]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={backgroundVertexShader}
        fragmentShader={backgroundFragmentShader}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}

/**
 * Scene lighting + backdrop + a shadow-catching floor.
 * A single shadow-casting key light keeps the GPU budget in check while still
 * grounding the ship and rocks with real shadows.
 */
export function Environment() {
  return (
    <>
      <ambientLight intensity={0.45} color="#9fb0ff" />
      <hemisphereLight args={["#93c5fd", "#0b1030", 0.5]} />
      <directionalLight
        position={[6, 12, 4]}
        intensity={1.5}
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
