"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { addGroundCollider, removeGroundCollider } from "@/game/systems/terrain";
import { homeBase, resolveHomeBase } from "@/game/systems/homeBase";
import { RUNWAY_MODEL_URL, RUNWAY_ROTATION, RUNWAY_SIZE } from "@/lib/constants";

/**
 * The home airstrip, directly under the air-spawn point so there is always a
 * proper place to land and take off from.
 *
 * Placement has to wait for the terrain: the home base picks the flattest
 * patch of `terrain.glb` near the nominal point (see homeBase), and the strip
 * sits there with its deck flush on that ground. Once placed it registers as a
 * ground collider, which makes its surface landable — the probes return the
 * nearest hit from above, i.e. the runway deck rather than the terrain beneath.
 */
function RunwayModel() {
  const gltf = useLoader(GLTFLoader, RUNWAY_MODEL_URL, (loader) => {
    loader.setMeshoptDecoder(MeshoptDecoder);
  });

  const { object, bottomY } = useMemo(() => {
    // Normalize like <GltfModel>: center on the origin, longest dimension
    // scaled to RUNWAY_SIZE, then yaw the strip onto the world z axis.
    const root = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = RUNWAY_SIZE / (Math.max(size.x, size.y, size.z) || 1);
    root.scale.setScalar(scale);
    root.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) mesh.receiveShadow = true;
    });

    const object = new THREE.Group();
    object.add(root);
    object.rotation.set(...RUNWAY_ROTATION);

    const rotated = new THREE.Box3().setFromObject(object);
    return { object, bottomY: rotated.min.y };
  }, [gltf]);

  const group = useRef<THREE.Group>(null);
  const placed = useRef(false);
  const registered = useRef<THREE.Object3D | null>(null);

  useFrame(() => {
    if (placed.current || !group.current) return;
    if (!resolveHomeBase()) return; // wait for the flat-patch search
    group.current.position.set(
      homeBase.x,
      homeBase.ground - bottomY + 0.2,
      homeBase.z,
    );
    group.current.visible = true;
    placed.current = true;
    addGroundCollider(group.current);
    registered.current = group.current;
  });

  useEffect(
    () => () => {
      if (registered.current) removeGroundCollider(registered.current);
    },
    [],
  );

  return (
    <group ref={group} visible={false}>
      <primitive object={object} />
    </group>
  );
}

export function Runway() {
  return (
    <Suspense fallback={null}>
      <ErrorBoundary label="Runway" fallback={null}>
        <RunwayModel />
      </ErrorBoundary>
    </Suspense>
  );
}
