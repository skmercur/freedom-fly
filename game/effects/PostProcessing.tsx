"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { PostProcessing as WebGPUPostProcessing } from "three/webgpu";
import { pass } from "three/tsl";
import { bloom } from "three/examples/jsm/tsl/display/BloomNode.js";

/**
 * WebGPU post-processing (bloom) built with TSL — the node-based shading
 * language that WebGPU uses in place of GLSL.
 *
 * A scene `pass` is combined additively with a `bloom` of that pass. We then
 * take over rendering: subscribing to `useFrame` with a **positive priority**
 * tells R3F to stop auto-rendering and hand control to us, so every frame is
 * drawn through the post pipeline. If the pipeline can't be built (e.g. an
 * unexpected renderer), we fall back to a plain render so the screen is never
 * black.
 */
export function PostProcessing() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  const post = useMemo(() => {
    try {
      const pipeline = new WebGPUPostProcessing(
        gl as unknown as ConstructorParameters<typeof WebGPUPostProcessing>[0],
      );
      const scenePass = pass(scene, camera);
      // bloom(node, strength, radius, threshold)
      const bloomPass = bloom(scenePass, 0.9, 0.6, 0.1);
      pipeline.outputNode = scenePass.add(bloomPass);
      return pipeline;
    } catch (err) {
      console.error("[PostProcessing] falling back to direct render:", err);
      return null;
    }
  }, [gl, scene, camera]);

  useFrame(({ gl: renderer, scene: s, camera: c }) => {
    if (post) post.renderAsync();
    else renderer.render(s, c);
  }, 1);

  useEffect(() => () => post?.dispose?.(), [post]);

  return null;
}
