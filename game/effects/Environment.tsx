"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { flight } from "@/game/systems/flight";
import { COLORS } from "@/lib/constants";

/** Direction toward the sun (normalized below where needed). */
const SUN_DIR = new THREE.Vector3(600, 900, 400).normalize();

/**
 * Inside-out daytime sky dome with a baked vertex-color gradient.
 *
 * WebGPU can't run raw-GLSL shader materials, so the sky gradient is baked into
 * the geometry's vertex colors (horizon → zenith) and drawn with a plain
 * `MeshBasicMaterial`. The dome ignores fog/tone-mapping so it reads as an
 * even sky.
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

/**
 * Scene lighting + sky + sun.
 *
 * The sky dome and sun disc ride along with the camera (x/z only, so the
 * horizon stays put) — they read as "at infinity" and the world never visibly
 * ends, however far you fly. The shadow-casting sun light keeps a tight
 * orthographic frustum centered on the aircraft so shadows stay crisp instead
 * of stretching one huge map across the whole terrain.
 */
export function Environment() {
  const sky = useRef<THREE.Group>(null);
  const light = useRef<THREE.DirectionalLight>(null);
  const camera = useThree((s) => s.camera);
  const lightTarget = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    if (sky.current) {
      sky.current.position.set(camera.position.x, 0, camera.position.z);
    }
    if (light.current) {
      light.current.position
        .copy(flight.position)
        .addScaledVector(SUN_DIR, 700);
      lightTarget.position.copy(flight.position);
      lightTarget.updateMatrixWorld();
    }
  });

  return (
    <>
      <group ref={sky}>
        <SkyDome />
        {/* Sun disc, far away, unlit. */}
        <mesh position={[900, 1400, 700]}>
          <sphereGeometry args={[90, 24, 24]} />
          <meshBasicMaterial color={COLORS.sun} toneMapped={false} fog={false} />
        </mesh>
      </group>

      <hemisphereLight args={["#cfe6ff", "#5b6a55", 0.9]} />
      <ambientLight intensity={0.35} />
      <directionalLight
        ref={light}
        castShadow
        intensity={2.2}
        color={COLORS.sun}
        target={lightTarget}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-150}
        shadow-camera-right={150}
        shadow-camera-top={150}
        shadow-camera-bottom={-150}
        shadow-camera-near={50}
        shadow-camera-far={1800}
        shadow-bias={-0.0004}
        shadow-normalBias={1}
      />
      <primitive object={lightTarget} />
    </>
  );
}
