import { clamp } from "@/lib/math";

/**
 * Shared, non-reactive flight input.
 *
 * Every control source (keyboard, on-screen stick) writes here and the flight
 * physics reads it inside `useFrame`. Because it never lives in React state,
 * steering the aircraft costs zero re-renders. Each axis is in [-1, 1].
 */
export interface InputState {
  /** Elevator: +1 = nose up (climb), -1 = nose down (dive). */
  pitch: number;
  /** Ailerons: +1 = bank right, -1 = bank left. */
  roll: number;
  /** Rudder: +1 = nose right, -1 = nose left. */
  yaw: number;
  /** Throttle rate: +1 = opening up, -1 = closing. Integrated over time. */
  throttle: number;
}

export const input: InputState = {
  pitch: 0,
  roll: 0,
  yaw: 0,
  throttle: 0,
};

export function resetInput(): void {
  input.pitch = 0;
  input.roll = 0;
  input.yaw = 0;
  input.throttle = 0;
}

/** Called by the virtual joystick: x = roll, y = pitch, clamped to unit range. */
export function setStickAxis(x: number, y: number): void {
  input.roll = clamp(x, -1, 1);
  input.pitch = clamp(y, -1, 1);
}
