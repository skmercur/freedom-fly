import * as THREE from "three";
import {
  acceleratedRaycast,
  computeBoundsTree,
  disposeBoundsTree,
} from "three-mesh-bvh";
import { GROUND_PROBE_HEIGHT } from "@/lib/constants";

/**
 * Terrain collision registry.
 *
 * The <Terrain> component registers its loaded mesh here once, and the flight
 * rig queries the ground height beneath the aircraft every frame by casting
 * rays straight down. Keeping this outside React avoids threading the terrain
 * object through props/context into the per-frame loop.
 *
 * Raycasts are BVH-accelerated (three-mesh-bvh): the terrain is a single large
 * mesh, and three's stock raycast walks every triangle per ray — several rays
 * per frame would cost milliseconds. With a bounds tree built once at
 * registration each ray is microseconds.
 */
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

let terrainObject: THREE.Object3D | null = null;
/** Everything the ground probe collides with: terrain grid + extras (runway…). */
const colliders: THREE.Object3D[] = [];

const _raycaster = new THREE.Raycaster();
_raycaster.firstHitOnly = true; // BVH fast path: nearest hit only
const _origin = new THREE.Vector3();
const _down = new THREE.Vector3(0, -1, 0);

function buildBVH(object: THREE.Object3D): void {
  object.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh && !mesh.geometry.boundsTree) {
      mesh.geometry.computeBoundsTree();
    }
  });
}

export function registerTerrain(object: THREE.Object3D | null): void {
  if (terrainObject) {
    const i = colliders.indexOf(terrainObject);
    if (i >= 0) colliders.splice(i, 1);
  }
  terrainObject = object;
  if (object) {
    buildBVH(object);
    colliders.push(object);
  }
}

/**
 * Additional landable surfaces (e.g. the runway). They join the ground-probe
 * raycasts, so anything registered here can be rolled on and landed on — the
 * probe returns the *nearest hit from above*, i.e. whatever sits on top.
 */
export function addGroundCollider(object: THREE.Object3D): void {
  buildBVH(object);
  colliders.push(object);
}

export function removeGroundCollider(object: THREE.Object3D): void {
  const i = colliders.indexOf(object);
  if (i >= 0) colliders.splice(i, 1);
}

/** True once the terrain mesh is loaded and collidable. */
export function terrainReady(): boolean {
  return terrainObject !== null;
}

/**
 * Height of the topmost surface directly below (x, z), or -Infinity if the ray
 * misses everything (i.e. off the edge of the world).
 */
export function groundHeightAt(x: number, z: number): number {
  if (colliders.length === 0) return -Infinity;
  _origin.set(x, GROUND_PROBE_HEIGHT, z);
  _raycaster.set(_origin, _down);
  _raycaster.far = GROUND_PROBE_HEIGHT * 2;
  const hits = _raycaster.intersectObjects(colliders, true);
  return hits.length > 0 ? hits[0].point.y : -Infinity;
}
