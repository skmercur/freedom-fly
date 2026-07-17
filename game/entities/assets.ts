import * as THREE from "three";
import { COLORS, POWERUP_COLOR } from "@/lib/constants";
import type { PowerUpType } from "@/types/game";

/**
 * Shared geometries & materials.
 *
 * Entities are cheap because every instance of a kind reuses one geometry and
 * one material rather than allocating its own — dozens of crystals cost a
 * handful of GPU objects, not hundreds. Created once at module load (pure math,
 * no WebGL context needed) and reused for the app's lifetime.
 */

export const geometries = {
  crystal: new THREE.OctahedronGeometry(0.55, 0),
  rock: new THREE.IcosahedronGeometry(0.85, 0),
  ring: new THREE.TorusGeometry(0.52, 0.16, 14, 28),
  core: new THREE.IcosahedronGeometry(0.22, 0),
} as const;

const std = (opts: THREE.MeshStandardMaterialParameters) =>
  new THREE.MeshStandardMaterial(opts);

export const collectibleMaterial = std({
  color: COLORS.collectible,
  emissive: COLORS.collectible,
  emissiveIntensity: 1.4,
  metalness: 0.3,
  roughness: 0.15,
});

export const obstacleMaterial = std({
  color: COLORS.obstacle,
  emissive: COLORS.obstacle,
  emissiveIntensity: 0.5,
  metalness: 0.6,
  roughness: 0.4,
  flatShading: true,
});

export const powerUpMaterials: Record<PowerUpType, THREE.MeshStandardMaterial> =
  {
    shield: std({
      color: POWERUP_COLOR.shield,
      emissive: POWERUP_COLOR.shield,
      emissiveIntensity: 1.6,
      metalness: 0.4,
      roughness: 0.2,
    }),
    magnet: std({
      color: POWERUP_COLOR.magnet,
      emissive: POWERUP_COLOR.magnet,
      emissiveIntensity: 1.6,
      metalness: 0.4,
      roughness: 0.2,
    }),
    slow: std({
      color: POWERUP_COLOR.slow,
      emissive: POWERUP_COLOR.slow,
      emissiveIntensity: 1.6,
      metalness: 0.4,
      roughness: 0.2,
    }),
  };
