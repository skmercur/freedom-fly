"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo } from "react";
import * as THREE from "three";
import { shake } from "@/game/effects/effectsBus";
import { CAMERA_POS, CAMERA_TARGET } from "@/lib/constants";

/**
 * Trauma-based screen shake (Squirrel Eiserloh's model): the visible shake is
 * trauma², so small hits barely wobble while big ones kick hard. Trauma decays
 * linearly every frame. The camera has no other controller, so we can rebuild
 * its transform from the rest pose each frame and layer shake on top.
 */
export function CameraShake() {
  const camera = useThree((s) => s.camera);
  const base = useMemo(() => new THREE.Vector3(...CAMERA_POS), []);
  const target = useMemo(() => new THREE.Vector3(...CAMERA_TARGET), []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    shake.trauma = Math.max(0, shake.trauma - dt * 1.4);
    const amt = shake.trauma * shake.trauma;

    const ox = (Math.random() * 2 - 1) * amt * 0.7;
    const oy = (Math.random() * 2 - 1) * amt * 0.7;
    camera.position.set(base.x + ox, base.y + oy, base.z);
    camera.lookAt(target);
    // Roll last so it stacks on the look-at orientation.
    camera.rotateZ((Math.random() * 2 - 1) * amt * 0.06);
  });

  return null;
}
