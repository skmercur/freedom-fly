import { groundHeightAt, terrainReady } from "./terrain";
import { RUNWAY_SIZE, RUNWAY_X, RUNWAY_Z } from "@/lib/constants";

/**
 * Where the home airstrip (and the air spawn above it) live.
 *
 * A runway wants level ground. Dropping it at a fixed point drops it wherever
 * the terrain happens to be there — often a hillside, so the strip floats at
 * one end and buries at the other. Instead we probe `terrain.glb` around the
 * nominal home point and pick the flattest footprint-sized patch, so the strip
 * sits flush and there's honest room to land and take off.
 *
 * Resolved once, the first frame the terrain is collidable (the search casts
 * ground-probe rays, so it needs the BVH built). Until then callers read the
 * nominal point as a fallback. `ground` is the terrain height the strip deck
 * rests on — the top of the footprint, so no corner pokes through.
 */
export const homeBase = {
  x: RUNWAY_X,
  z: RUNWAY_Z,
  ground: 0,
  resolved: false,
};

// Runway runs along world z; its footprint is long in z, narrow in x.
const HALF_LEN = RUNWAY_SIZE * 0.5;
const HALF_WIDTH = RUNWAY_SIZE * 0.04;
// Sample offsets across the footprint (fractions of length / half-width).
const LEN_FRACS = [-0.5, -0.25, 0, 0.25, 0.5];
const WIDTH_FRACS = [-1, 0, 1];

// How far from the nominal point we're willing to move the strip, and how
// finely we search. Kept inside the central terrain tile so no mirror seam
// crosses the footprint.
const SEARCH_RADIUS = 1600;
const SEARCH_STEP = 160;
// Each unit of drift from home costs this much "flatness" — a tie-breaker so
// the strip stays near the nominal home rather than wandering for a marginally
// flatter patch.
const DRIFT_PENALTY = 0.01;

/**
 * Height spread (max − min) over the runway footprint centred at (cx, cz), plus
 * the top height. Returns null if any probe misses the terrain — a footprint
 * hanging off the edge of the world is never a valid strip.
 */
function footprint(cx: number, cz: number): { spread: number; top: number } | null {
  let min = Infinity;
  let max = -Infinity;
  for (const fz of LEN_FRACS) {
    for (const fx of WIDTH_FRACS) {
      const h = groundHeightAt(cx + fx * HALF_WIDTH, cz + fz * (2 * HALF_LEN));
      if (!Number.isFinite(h)) return null;
      if (h < min) min = h;
      if (h > max) max = h;
    }
  }
  return { spread: max - min, top: max };
}

/**
 * Find the flattest patch near the nominal home point and lock the strip/spawn
 * to it. Idempotent and cheap after the first success; a no-op until the
 * terrain is ready. Returns whether the home base is resolved.
 */
export function resolveHomeBase(): boolean {
  if (homeBase.resolved || !terrainReady()) return homeBase.resolved;

  let bestScore = Infinity;
  let bestX = RUNWAY_X;
  let bestZ = RUNWAY_Z;
  let bestTop = 0;
  for (let dz = -SEARCH_RADIUS; dz <= SEARCH_RADIUS; dz += SEARCH_STEP) {
    for (let dx = -SEARCH_RADIUS; dx <= SEARCH_RADIUS; dx += SEARCH_STEP) {
      const cx = RUNWAY_X + dx;
      const cz = RUNWAY_Z + dz;
      const fp = footprint(cx, cz);
      if (!fp) continue;
      const score = fp.spread + Math.hypot(dx, dz) * DRIFT_PENALTY;
      if (score < bestScore) {
        bestScore = score;
        bestX = cx;
        bestZ = cz;
        bestTop = fp.top;
      }
    }
  }

  if (!Number.isFinite(bestScore)) return false; // terrain not probeable yet

  homeBase.x = bestX;
  homeBase.z = bestZ;
  homeBase.ground = bestTop;
  homeBase.resolved = true;
  return true;
}
