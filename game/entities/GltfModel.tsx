"use client";

import { useLoader } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

interface Props {
  url: string;
  /** Longest bounding-box dimension is scaled to this size (world units). */
  targetSize: number;
  rotation?: [number, number, number];
  castShadow?: boolean;
  receiveShadow?: boolean;
  /** Fired with the prepared object once it is ready (e.g. to register it). */
  onReady?: (object: THREE.Object3D) => void;
}

/**
 * Reusable glTF loader. Auto-centers and uniformly scales any model to a target
 * size so we don't have to hand-tune per-asset transforms, and toggles shadow
 * flags on every mesh. Suspends while loading; throws to the nearest
 * ErrorBoundary on failure.
 */
export function GltfModel({
  url,
  targetSize,
  rotation = [0, 0, 0],
  castShadow = false,
  receiveShadow = false,
  onReady,
}: Props) {
  const gltf = useLoader(GLTFLoader, url);

  const object = useMemo(() => {
    const root = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = targetSize / (Math.max(size.x, size.y, size.z) || 1);

    root.scale.setScalar(scale);
    root.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = castShadow;
        mesh.receiveShadow = receiveShadow;
      }
    });

    const container = new THREE.Group();
    container.add(root);
    return container;
  }, [gltf, targetSize, castShadow, receiveShadow]);

  useEffect(() => {
    onReady?.(object);
  }, [object, onReady]);

  return <primitive object={object} rotation={rotation} />;
}
