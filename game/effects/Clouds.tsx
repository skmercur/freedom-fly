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

/** Soft round puff: white radial gradient on a small canvas. */
function makePuffTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  g.addColorStop(0, "rgba(255,255,255,0.9)");
  g.addColorStop(0.55, "rgba(255,255,255,0.45)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
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
    map: makePuffTexture(),
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
