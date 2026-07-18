"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { flight } from "@/game/systems/flight";
import { COLORS } from "@/lib/constants";

/** Direction toward the sun (normalized below where needed). */
const SUN_DIR = new THREE.Vector3(600, 900, 400).normalize();

/**
 * Sun-ray billboard texture: a bright core glow with radial streaks, drawn on
 * a canvas (WebGPU can't take raw-GLSL shaders, and a sprite is far cheaper
 * than a god-ray post pass). Rendered additively so rays bloom over the sky.
 */
function makeRaysTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const cx = size / 2;

  // Radial streaks of varying length and alpha.
  ctx.translate(cx, cx);
  for (let i = 0; i < 72; i++) {
    const angle = (i / 72) * Math.PI * 2 + Math.sin(i * 12.9898) * 0.05;
    const len = cx * (0.45 + 0.5 * Math.abs(Math.sin(i * 78.233)));
    const alpha = 0.05 + 0.07 * Math.abs(Math.sin(i * 3.7));
    const g = ctx.createLinearGradient(0, 0, Math.cos(angle) * len, Math.sin(angle) * len);
    g.addColorStop(0, `rgba(255,246,224,${alpha})`);
    g.addColorStop(1, "rgba(255,246,224,0)");
    ctx.strokeStyle = g;
    ctx.lineWidth = 3 + 4 * Math.abs(Math.sin(i * 1.3));
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(angle) * len, Math.sin(angle) * len);
    ctx.stroke();
  }

  // Core glow on top.
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, cx * 0.5);
  glow.addColorStop(0, "rgba(255,250,235,0.85)");
  glow.addColorStop(0.4, "rgba(255,246,224,0.28)");
  glow.addColorStop(1, "rgba(255,246,224,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(-cx, -cx, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Additive glow + streak billboard sitting on the sun. */
function SunRays() {
  const material = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: makeRaysTexture(),
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        fog: false,
        toneMapped: false,
      }),
    [],
  );
  return <sprite material={material} scale={[2400, 2400, 1]} />;
}

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
        {/* Sun: unlit disc + additive ray billboard, riding with the camera
            like the dome so it reads as at-infinity. */}
        <group position={[1800, 2800, 1400]}>
          <mesh>
            <sphereGeometry args={[110, 24, 24]} />
            <meshBasicMaterial
              color={COLORS.sun}
              toneMapped={false}
              fog={false}
            />
          </mesh>
          <SunRays />
        </group>
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
