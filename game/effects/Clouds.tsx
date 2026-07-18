"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { randRange } from "@/lib/math";
import {
  CLOUD_COUNT,
  CLOUD_DRIFT,
  CLOUD_FIELD,
  CLOUD_MAX_Y,
  CLOUD_MIN_Y,
} from "@/lib/constants";

let puffTexture: THREE.CanvasTexture | null = null;

/**
 * Soft, irregular puff: several overlapping radial blobs painted onto a canvas
 * give a non-uniform cloudy silhouette instead of a flat disc. Cached once and
 * shared by every sprite — each cloud gets its own tinted material so the field
 * reads as depth and light rather than a wall of identical stamps.
 */
function getPuffTexture(): THREE.CanvasTexture {
  if (puffTexture) return puffTexture;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  // A handful of overlapping blobs of varying radius and offset build a fluffy,
  // asymmetric outline. Centered loosely on the lower-middle so a sprite reads
  // as a heap with a lit top and a shadowed base.
  const blobs = 9;
  const cx = size * 0.5;
  const cy = size * 0.58;
  for (let i = 0; i < blobs; i++) {
    const a = (Math.PI * 2 * i) / blobs + Math.random() * 0.6;
    const r = size * (0.28 + Math.random() * 0.16);
    const px = cx + Math.cos(a) * size * (0.08 + Math.random() * 0.12);
    const py = cy + Math.sin(a) * size * (0.05 + Math.random() * 0.10);
    const g = ctx.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.45, "rgba(255,255,255,0.5)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  // Lift the top edge a touch and recess the bottom for a sense of light from
  // above. Drawing a soft, brighter dome on the upper half sells "sunlit crown".
  const crown = ctx.createRadialGradient(
    cx,
    cy - size * 0.18,
    0,
    cx,
    cy - size * 0.18,
    size * 0.42,
  );
  crown.addColorStop(0, "rgba(255,255,255,0.55)");
  crown.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = crown;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  puffTexture = tex;
  return tex;
}

/**
 * The cloud field's three.js objects live outside React (lazily built, mutated
 * every frame) — the same non-reactive pattern as the flight state.
 */
interface CloudField {
  group: THREE.Group;
  clouds: THREE.Group[];
  bases: THREE.Vector3[];
}

let field: CloudField | null = null;

function getField(): CloudField {
  if (field) return field;

  const material = new THREE.SpriteMaterial({
    map: getPuffTexture(),
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    fog: true,
  });

  const group = new THREE.Group();
  const clouds: THREE.Group[] = [];
  const bases: THREE.Vector3[] = [];
  for (let i = 0; i < CLOUD_COUNT; i++) {
    const cloud = new THREE.Group();
    const puffs = 4 + Math.floor(Math.random() * 4);
    const width = randRange(120, 260);
    for (let p = 0; p < puffs; p++) {
      const sprite = new THREE.Sprite(material);
      sprite.position.set(
        randRange(-width * 0.5, width * 0.5),
        randRange(-24, 24),
        randRange(-width * 0.35, width * 0.35),
      );
      const s = randRange(width * 0.55, width * 1.1);
      sprite.scale.set(s, s * randRange(0.45, 0.6), 1);
      cloud.add(sprite);
    }
    group.add(cloud);
    clouds.push(cloud);
    bases.push(
      new THREE.Vector3(
        randRange(-CLOUD_FIELD / 2, CLOUD_FIELD / 2),
        randRange(CLOUD_MIN_Y, CLOUD_MAX_Y),
        randRange(-CLOUD_FIELD / 2, CLOUD_FIELD / 2),
      ),
    );
  }
  field = { group, clouds, bases };
  return field;
}

/**
 * Drifting cumulus layer. Each cloud is a cluster of a few soft sprite puffs;
 * the whole field wraps around the camera on x/z (same endless-world trick as
 * the terrain), so clouds always stream past — which doubles as the strongest
 * visual speed cue in the empty sky. No custom shaders, so it runs on the
 * WebGPU and WebGL2 backends alike.
 */
export function Clouds() {
  const holder = useRef<THREE.Group>(null);

  useEffect(() => {
    const f = getField();
    const h = holder.current;
    h?.add(f.group);
    return () => {
      h?.remove(f.group);
    };
  }, []);

  // Wrap each cloud into the field window centered on the camera, with a slow
  // wind drift so the sky is alive even when parked on the ground.
  useFrame((state, delta) => {
    const f = field;
    if (!f) return;
    const cam = state.camera.position;
    const wrap = (v: number): number =>
      ((((v + CLOUD_FIELD / 2) % CLOUD_FIELD) + CLOUD_FIELD) % CLOUD_FIELD) -
      CLOUD_FIELD / 2;
    for (let i = 0; i < f.clouds.length; i++) {
      const base = f.bases[i];
      base.x += CLOUD_DRIFT * delta;
      f.clouds[i].position.set(
        cam.x + wrap(base.x - cam.x),
        base.y,
        cam.z + wrap(base.z - cam.z),
      );
    }
  });

  return <group ref={holder} />;
}
