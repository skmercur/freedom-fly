import * as THREE from "three";
import { GROUND_PROBE_HEIGHT } from "@/lib/constants";

/**
 * Terrain collision registry.
 *
 * The <Terrain> component registers its loaded mesh here once, and the flight
 * rig queries the ground height beneath the aircraft every frame by casting a
 * single ray straight down. Keeping this outside React avoids threading the
 * terrain object through props/context into the per-frame loop.
 */
let terrainObject: THREE.Object3D | null = null;

const _raycaster = new THREE.Raycaster();
const _origin = new THREE.Vector3();
const _down = new THREE.Vector3(0, -1, 0);

export function registerTerrain(object: THREE.Object3D | null): void {
  terrainObject = object;
}

/**
 * Height of the terrain surface directly below (x, z), or -Infinity if the ray
 * misses the mesh entirely (i.e. off the edge of the world).
 */
export function groundHeightAt(x: number, z: number): number {
  if (!terrainObject) return -Infinity;
  _origin.set(x, GROUND_PROBE_HEIGHT, z);
  _raycaster.set(_origin, _down);
  _raycaster.far = GROUND_PROBE_HEIGHT * 2;
  const hits = _raycaster.intersectObject(terrainObject, true);
  return hits.length > 0 ? hits[0].point.y : -Infinity;
}
