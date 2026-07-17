"use client";

import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { WebGPURenderer } from "three/webgpu";
import { Scene } from "@/game/systems/Scene";
import { CAMERA_POS, COLORS } from "@/lib/constants";

/**
 * WebGL**GPU** canvas.
 *
 * The `gl` prop is an async factory that builds a Three.js `WebGPURenderer` and
 * awaits its `init()` before React Three Fiber uses it — the supported pattern
 * for WebGPU in R3F. `WebGPURenderer` automatically falls back to a WebGL2
 * backend when `navigator.gpu` is unavailable, so the game runs everywhere.
 *
 * `dpr={[1, 2]}` caps the device-pixel-ratio so high-DPI phones don't render at
 * 3–4× and tank the frame rate.
 */
export function GameCanvas() {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: CAMERA_POS, fov: 60, near: 0.1, far: 220 }}
      gl={async (props) => {
        const renderer = new WebGPURenderer({
          ...(props as ConstructorParameters<typeof WebGPURenderer>[0]),
          antialias: true,
          powerPreference: "high-performance",
        });
        await renderer.init();
        renderer.setClearColor(new THREE.Color(COLORS.bg));
        return renderer;
      }}
    >
      {/* Depth fog so entities fade in from the far distance. */}
      <fog attach="fog" args={[COLORS.bg, 32, 96]} />
      <Scene />
    </Canvas>
  );
}
