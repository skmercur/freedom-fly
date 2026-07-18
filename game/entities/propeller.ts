import * as THREE from "three";
import { PROP_CUT_X } from "@/lib/constants";

/**
 * Propeller extraction for the Cessna model.
 *
 * The asset ships with the spinner and blades merged into the same static mesh
 * as the fuselage (every node is a generic `Object_*`), so the prop can't be
 * found by name. Geometrically, though, there is a clean gap between the
 * cowling and the blade plane, so everything forward of `PROP_CUT_X` is
 * propeller. This module slices those triangles out of the airframe geometry,
 * re-parents them under a pivot on the prop axis, and adds a translucent
 * "motion blur" disc that fades in as rpm rises (the MSFS look).
 *
 * The loader-cached geometry is never mutated: both the prop and the remaining
 * airframe get fresh geometries that share the original vertex buffers and
 * only filter the index list.
 */

export interface PropellerVisual {
  /** Group on the prop axis — spin its local X rotation to turn the prop. */
  pivot: THREE.Group;
  /** Cloned blade materials; fade their opacity out as rpm rises. */
  bladeMaterials: THREE.Material[];
  /** Motion-blur disc material; fade its opacity in as rpm rises. */
  discMaterial: THREE.MeshBasicMaterial;
}

const _rel = new THREE.Matrix4();
const _inv = new THREE.Matrix4();
const _box = new THREE.Box3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _p = new THREE.Vector3();

/**
 * Detach the propeller from a loaded <GltfModel> container. Returns the parts
 * the caller animates, or null when no propeller-shaped geometry was found.
 * Safe to call more than once on the same container (a no-op after the first).
 */
export function extractPropeller(
  container: THREE.Object3D,
  cutX: number = PROP_CUT_X,
): PropellerVisual | null {
  if (container.userData.propExtracted) return null;
  container.userData.propExtracted = true;

  // <GltfModel> wraps the model in a single scaled + re-centered child group;
  // its transform converts model-space units (where PROP_CUT_X lives) into
  // container-space ones.
  const root = container.children[0];
  if (!root || root.scale.x <= 0) return null;
  const cut = root.scale.x * cutX + root.position.x;

  container.updateMatrixWorld(true);
  _inv.copy(container.matrixWorld).invert();

  // --- Pass 1: classify every triangle as prop vs airframe ---------------
  interface Source {
    mesh: THREE.Mesh;
    rel: THREE.Matrix4;
    propIndices: number[];
    restIndices: number[];
  }
  const sources: Source[] = [];

  container.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || (mesh as THREE.SkinnedMesh).isSkinnedMesh) return;
    if (Array.isArray(mesh.material)) return; // groups would break re-indexing
    const geo = mesh.geometry as THREE.BufferGeometry;
    const pos = geo.attributes.position;
    if (!pos) return;

    _rel.multiplyMatrices(_inv, mesh.matrixWorld);
    if (!geo.boundingBox) geo.computeBoundingBox();
    _box.copy(geo.boundingBox!).applyMatrix4(_rel);
    if (_box.min.x >= cut) return; // whole mesh sits behind the cut plane

    const src: Source = {
      mesh,
      rel: _rel.clone(),
      propIndices: [],
      restIndices: [],
    };
    const index = geo.index;
    const vertAt = (t: number, k: number) =>
      index ? index.getX(t * 3 + k) : t * 3 + k;
    const triCount = (index ? index.count : pos.count) / 3;
    for (let t = 0; t < triCount; t++) {
      _a.fromBufferAttribute(pos, vertAt(t, 0)).applyMatrix4(_rel);
      _b.fromBufferAttribute(pos, vertAt(t, 1)).applyMatrix4(_rel);
      _c.fromBufferAttribute(pos, vertAt(t, 2)).applyMatrix4(_rel);
      const isProp = _a.x < cut && _b.x < cut && _c.x < cut;
      const out = isProp ? src.propIndices : src.restIndices;
      out.push(vertAt(t, 0), vertAt(t, 1), vertAt(t, 2));
    }
    if (src.propIndices.length > 0) sources.push(src);
  });

  if (sources.length === 0) return null;

  // --- Pass 2: locate the prop axis --------------------------------------
  // The spinner tip is the foremost prop vertex; the crank axis runs through
  // it. Blade radius is the max distance from that axis, and the blade plane
  // (for the blur disc) is the mean x of the fast-moving outer geometry.
  let tipX = Infinity;
  let hubY = 0;
  let hubZ = 0;
  for (const src of sources) {
    const pos = src.mesh.geometry.attributes.position;
    for (const i of src.propIndices) {
      _p.fromBufferAttribute(pos, i).applyMatrix4(src.rel);
      if (_p.x < tipX) {
        tipX = _p.x;
        hubY = _p.y;
        hubZ = _p.z;
      }
    }
  }
  let radius = 0;
  for (const src of sources) {
    const pos = src.mesh.geometry.attributes.position;
    for (const i of src.propIndices) {
      _p.fromBufferAttribute(pos, i).applyMatrix4(src.rel);
      radius = Math.max(radius, Math.hypot(_p.y - hubY, _p.z - hubZ));
    }
  }
  let bladeXSum = 0;
  let bladeXCount = 0;
  for (const src of sources) {
    const pos = src.mesh.geometry.attributes.position;
    for (const i of src.propIndices) {
      _p.fromBufferAttribute(pos, i).applyMatrix4(src.rel);
      if (Math.hypot(_p.y - hubY, _p.z - hubZ) > radius * 0.6) {
        bladeXSum += _p.x;
        bladeXCount++;
      }
    }
  }
  const bladeX = bladeXCount > 0 ? bladeXSum / bladeXCount : tipX;

  // --- Pass 3: rebuild geometries ----------------------------------------
  // The pivot sits on the prop axis; x is irrelevant for an X-axis spin, so
  // the spinner tip's x is as good as any.
  const pivot = new THREE.Group();
  pivot.name = "PropellerPivot";
  pivot.position.set(tipX, hubY, hubZ);
  container.add(pivot);

  const bladeMaterials: THREE.Material[] = [];
  const propMeshes: THREE.Mesh[] = [];

  for (const src of sources) {
    const geo = src.mesh.geometry;

    // A view over the same vertex buffers with a filtered index — the
    // loader's cached original geometry is never mutated.
    const slice = (indices: number[]): THREE.BufferGeometry => {
      const g = new THREE.BufferGeometry();
      for (const [name, attr] of Object.entries(geo.attributes)) {
        g.setAttribute(name, attr);
      }
      g.setIndex(indices);
      return g;
    };

    // Airframe keeps every triangle behind the cut.
    if (src.restIndices.length > 0) {
      src.mesh.geometry = slice(src.restIndices);
    } else {
      src.mesh.visible = false;
    }

    // Blades keep the source material's texture but get a private clone so
    // rpm cross-fade never dims the rest of the airframe.
    const bladeMat = (src.mesh.material as THREE.Material).clone();
    bladeMat.transparent = true;
    bladeMaterials.push(bladeMat);

    const propMesh = new THREE.Mesh(slice(src.propIndices), bladeMat);
    propMesh.castShadow = src.mesh.castShadow;
    propMesh.applyMatrix4(src.rel);
    container.add(propMesh);
    propMeshes.push(propMesh);
  }

  // Re-parent the blades under the pivot, preserving their world transform.
  container.updateMatrixWorld(true);
  for (const propMesh of propMeshes) {
    pivot.attach(propMesh);
  }

  // --- Pass 4: motion-blur disc ------------------------------------------
  // A soft dark disc at the blade plane that fades in as the blades fade out.
  const discMaterial = new THREE.MeshBasicMaterial({
    color: "#14181d",
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 48),
    discMaterial,
  );
  disc.rotation.y = Math.PI / 2; // face along the prop axis (container X)
  disc.position.set(bladeX - tipX, 0, 0); // pivot-local: pivot sits at the tip
  pivot.add(disc);

  return { pivot, bladeMaterials, discMaterial };
}
