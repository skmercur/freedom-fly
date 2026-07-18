import * as THREE from "three";
import { WIND_BASE_SPEED, WIND_GUST, WIND_VERTICAL } from "@/lib/constants";

/**
 * Live wind field, stepped once per physics frame.
 *
 * The direction wanders slowly (minutes-scale sines), the speed breathes
 * around its mean, and a product-of-sines gust envelope adds irregular
 * bursts on top — smooth but never periodic-feeling, with no RNG needed.
 * A small vertical component provides gentle turbulence. The aero model
 * subtracts this from ground velocity to get true airspeed, and the clouds
 * drift with it, so what you feel matches what you see.
 */
export const wind = new THREE.Vector3(WIND_BASE_SPEED, 0, 0);

let t = 0;

export function stepWind(dt: number): void {
  t += dt;
  // Heading wanders ±~55° around +x over a few minutes.
  const dir = 0.6 * Math.sin(t * 0.021) + 0.35 * Math.sin(t * 0.0057 + 2.1);
  // Two incommensurate envelopes multiplied = irregular gust bursts.
  const gust =
    WIND_GUST *
    (0.5 + 0.5 * Math.sin(t * 0.31)) *
    (0.5 + 0.5 * Math.sin(t * 0.113 + 4.0));
  const speed = WIND_BASE_SPEED * (1 + 0.3 * Math.sin(t * 0.043 + 1.0)) + gust;
  wind.set(
    Math.cos(dir) * speed,
    WIND_VERTICAL * Math.sin(t * 0.17) * Math.sin(t * 0.071 + 1.3),
    Math.sin(dir) * speed,
  );
}
