import { clamp } from "@/lib/math";

/**
 * Shared, non-reactive flight input.
 *
 * Several control sources (keyboard, gamepad, on-screen touch stick) each write
 * their own axes here; `recompute()` sums and clamps them into the combined
 * `input` that the flight physics reads inside `useFrame`. Because none of it
 * lives in React state, steering the aircraft costs zero re-renders.
 * Each axis is in [-1, 1].
 */
export interface InputAxes {
  /** Elevator: +1 = nose up (climb), -1 = nose down (dive). */
  pitch: number;
  /** Ailerons: +1 = bank right, -1 = bank left. */
  roll: number;
  /** Rudder: +1 = nose right, -1 = nose left. */
  yaw: number;
  /** Throttle rate: +1 = opening up, -1 = closing. Integrated over time. */
  throttle: number;
}

const zeroAxes = (): InputAxes => ({ pitch: 0, roll: 0, yaw: 0, throttle: 0 });

/** Combined input, read by the physics. Do not write directly — use a source. */
export const input: InputAxes = zeroAxes();

const keyboard = zeroAxes();
const gamepad = zeroAxes();
const stick = { pitch: 0, roll: 0 };

/**
 * Absolute throttle request (0..1) from the touch slider or a preset key.
 * The physics consumes it once via `consumeThrottleTarget` so rate-based
 * sources (keyboard/gamepad) can still adjust it afterwards.
 */
let throttleTarget: number | null = null;

function recompute(): void {
  input.pitch = clamp(keyboard.pitch + gamepad.pitch + stick.pitch, -1, 1);
  input.roll = clamp(keyboard.roll + gamepad.roll + stick.roll, -1, 1);
  input.yaw = clamp(keyboard.yaw + gamepad.yaw, -1, 1);
  input.throttle = clamp(keyboard.throttle + gamepad.throttle, -1, 1);
}

export function setKeyboardAxes(axes: InputAxes): void {
  Object.assign(keyboard, axes);
  recompute();
}

/** Called every frame by the gamepad poller (already deadzoned). */
export function setGamepadAxes(axes: InputAxes): void {
  Object.assign(gamepad, axes);
  recompute();
}

/** Called by the virtual joystick: x = roll, y = pitch, clamped to unit range. */
export function setStickAxis(x: number, y: number): void {
  stick.roll = clamp(x, -1, 1);
  stick.pitch = clamp(y, -1, 1);
  recompute();
}

/** Request an absolute throttle setting (presets 1–4, touch slider). */
export function setThrottleTarget(v: number): void {
  throttleTarget = clamp(v, 0, 1);
}

/** One-shot read of the pending absolute throttle request, if any. */
export function consumeThrottleTarget(): number | null {
  const v = throttleTarget;
  throttleTarget = null;
  return v;
}

export function resetInput(): void {
  Object.assign(keyboard, zeroAxes());
  Object.assign(gamepad, zeroAxes());
  stick.pitch = 0;
  stick.roll = 0;
  throttleTarget = null;
  recompute();
}
