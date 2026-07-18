import { setGamepadAxes } from "@/game/systems/input";

/**
 * Gamepad flight controls, polled once per frame from the flight rig (the
 * Gamepad API is poll-only — state doesn't fire events).
 *
 *   Left stick      roll / pitch (push forward = nose down, flight-sim style)
 *   Right stick X   rudder
 *   Right trigger   throttle up · Left trigger  throttle down
 */
const DEADZONE = 0.15;

const dz = (v: number): number =>
  Math.abs(v) < DEADZONE ? 0 : (v - Math.sign(v) * DEADZONE) / (1 - DEADZONE);

export function pollGamepad(): void {
  if (typeof navigator === "undefined" || !navigator.getGamepads) return;
  const pad = Array.from(navigator.getGamepads()).find(
    (p): p is Gamepad => !!p && p.connected,
  );
  if (!pad) return;

  const rt = pad.buttons[7]?.value ?? 0;
  const lt = pad.buttons[6]?.value ?? 0;
  setGamepadAxes({
    roll: dz(pad.axes[0] ?? 0),
    pitch: dz(pad.axes[1] ?? 0), // stick forward (-1) = dive
    yaw: dz(pad.axes[2] ?? 0),
    throttle: rt - lt,
  });
}
