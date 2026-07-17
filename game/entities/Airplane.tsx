"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type * as THREE from "three";
import { runtime } from "@/game/systems/runtime";
import { COLORS } from "@/lib/constants";

/**
 * A stylized low-poly airplane, built entirely from primitives — the default
 * player visual. Faces forward (-Z). The propeller spins faster as the world
 * speed rises, and emissive accents (core, nav lights) catch the bloom pass.
 *
 * (When a valid glTF is provided via PLAYER_MODEL_URL, <ModelPlayer/> replaces
 * this — see Player.tsx.)
 */
export function Airplane() {
  const prop = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!prop.current) return;
    const rate = runtime.running ? 8 + runtime.worldSpeed * 0.7 : 4;
    prop.current.rotation.z += rate * delta;
  });

  const body = COLORS.player;
  return (
    <group>
      {/* Fuselage */}
      <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.33, 1.5, 8, 16]} />
        <meshStandardMaterial
          color="#eaf0ff"
          metalness={0.35}
          roughness={0.35}
        />
      </mesh>

      {/* Nose cone */}
      <mesh position={[0, 0, -1.15]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
        <coneGeometry args={[0.32, 0.5, 16]} />
        <meshStandardMaterial color="#cdd8f5" metalness={0.4} roughness={0.3} />
      </mesh>

      {/* Glowing core (visible through the cockpit, feeds bloom) */}
      <mesh position={[0, 0.05, -0.1]}>
        <icosahedronGeometry args={[0.18, 0]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive={body}
          emissiveIntensity={2.6}
        />
      </mesh>

      {/* Cockpit glass */}
      <mesh position={[0, 0.22, -0.35]}>
        <sphereGeometry args={[0.26, 16, 12]} />
        <meshStandardMaterial
          color="#0a2540"
          metalness={0.2}
          roughness={0.05}
          transparent
          opacity={0.55}
        />
      </mesh>

      {/* Main wings */}
      <mesh position={[0, -0.02, 0.05]} castShadow>
        <boxGeometry args={[3.1, 0.07, 0.72]} />
        <meshStandardMaterial
          color="#dfe7fb"
          emissive={body}
          emissiveIntensity={0.35}
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>

      {/* Tailplane (horizontal stabilizer) */}
      <mesh position={[0, 0.02, 0.95]} castShadow>
        <boxGeometry args={[1.25, 0.06, 0.4]} />
        <meshStandardMaterial color="#dfe7fb" metalness={0.5} roughness={0.3} />
      </mesh>

      {/* Vertical fin */}
      <mesh position={[0, 0.28, 1.0]} castShadow>
        <boxGeometry args={[0.06, 0.5, 0.42]} />
        <meshStandardMaterial
          color={body}
          emissive={body}
          emissiveIntensity={0.5}
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>

      {/* Propeller (spins) */}
      <group ref={prop} position={[0, 0, -1.42]}>
        <mesh>
          <cylinderGeometry args={[0.08, 0.08, 0.12, 8]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive={body}
            emissiveIntensity={1.4}
          />
        </mesh>
        <mesh rotation={[0, 0, 0]}>
          <boxGeometry args={[0.06, 1.5, 0.02]} />
          <meshStandardMaterial color="#2a3350" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.06, 1.5, 0.02]} />
          <meshStandardMaterial color="#2a3350" metalness={0.6} roughness={0.4} />
        </mesh>
      </group>

      {/* Wingtip navigation lights (emissive → bloom) */}
      <mesh position={[-1.55, -0.02, 0.05]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial
          color="#ff2d55"
          emissive="#ff2d55"
          emissiveIntensity={3}
        />
      </mesh>
      <mesh position={[1.55, -0.02, 0.05]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial
          color="#30ff6a"
          emissive="#30ff6a"
          emissiveIntensity={3}
        />
      </mesh>
    </group>
  );
}
