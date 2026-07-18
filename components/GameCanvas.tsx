"use client";

import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { WebGPURenderer } from "three/webgpu";
import { Scene } from "@/game/systems/Scene";
import { COLORS, FOV_BASE } from "@/lib/constants";

/**
 * WebGL**GPU** canvas.
 *
 * The `gl` prop is an async factory that builds a Three.js `WebGPURenderer` and
 * awaits its `init()` before React Three Fiber uses it — the supported pattern
 * for WebGPU in R3F. `WebGPURenderer` automatically falls back to a WebGL2
 * backend when `navigator.gpu` is unavailable, so the sim runs everywhere.
 *
 * The camera's `far` plane is pushed out to enclose the large flyable world and
 * the sky dome; `dpr={[1, 2]}` caps device-pixel-ratio so high-DPI phones don't
 * render at 3–4× and tank the frame rate.
 */
export function GameCanvas() {
  return (
    <Canvas
      dpr={[1, 2]}
      shadows
      camera={{
        position: [0, 266, 722],
        fov: FOV_BASE,
        near: 0.5,
        far: 8000,
      }}
      gl={async (props) => {
        const renderer = new WebGPURenderer({
          ...(props as ConstructorParameters<typeof WebGPURenderer>[0]),
          antialias: true,
          powerPreference: "high-performance",
        });
        await renderer.init();
        renderer.setClearColor(new THREE.Color(COLORS.skyHorizon));
        return renderer;
      }}
    >
      {/* Distance haze so far terrain fades into the horizon colour. */}
      <fog attach="fog" args={[COLORS.fog, 900, 3800]} />
      <Scene />
    </Canvas>
  );
}
