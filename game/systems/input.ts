import { clamp } from "@/lib/math";

/**
 * Shared, non-reactive input state.
 *
 * Every input source (keyboard, mouse, touch joystick) writes here and the
 * Player reads it inside `useFrame`. Because it never lives in React state,
 * moving the ship costs zero re-renders.
 */
export interface InputState {
  /** Directional axis from keyboard / joystick, each component in [-1, 1]. */
  axis: { x: number; y: number };
  /** Absolute pointer target in normalized space [-1, 1]. */
  pointer: { x: number; y: number };
  /** True when the pointer is the active control (mouse/touch drag). */
  pointerActive: boolean;
}

export const input: InputState = {
  axis: { x: 0, y: 0 },
  pointer: { x: 0, y: 0 },
  pointerActive: false,
};

export function resetInput(): void {
  input.axis.x = 0;
  input.axis.y = 0;
  input.pointer.x = 0;
  input.pointer.y = 0;
  input.pointerActive = false;
}

/** Called by the virtual joystick; magnitude is clamped to the unit circle. */
export function setJoystickAxis(x: number, y: number): void {
  input.axis.x = clamp(x, -1, 1);
  input.axis.y = clamp(y, -1, 1);
  input.pointerActive = false;
}
