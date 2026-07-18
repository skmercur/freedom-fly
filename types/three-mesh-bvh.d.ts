/**
 * three-mesh-bvh extends three's prototypes at runtime (see
 * game/systems/terrain.ts); this mirrors those additions for the type-checker,
 * per the library's documented setup.
 */
import type { MeshBVH, MeshBVHOptions } from "three-mesh-bvh";

declare module "three" {
  interface BufferGeometry {
    boundsTree?: MeshBVH;
    computeBoundsTree(options?: MeshBVHOptions): MeshBVH;
    disposeBoundsTree(): void;
  }
  interface Raycaster {
    /** three-mesh-bvh: stop at the nearest hit instead of collecting all. */
    firstHitOnly?: boolean;
  }
}
