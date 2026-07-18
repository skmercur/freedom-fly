"use client";

import { useEffect } from "react";
import { input } from "@/game/systems/input";
import { useGameStore } from "@/stores/gameStore";

/**
 * Controls are matched by the key's *label* (`event.key`), not its physical
 * position, so the same letters work on QWERTY and AZERTY alike:
 *   ↑ / ↓            pitch (climb / dive)
 *   ← / →            roll (bank left / right)
 *   W·Z / S          throttle up / down   (Z = AZERTY's "W")
 *   A·Q / D·E        rudder (yaw left / right)  (Q = AZERTY's "A")
 *   Esc              back to menu
 */
const PITCH_UP = new Set(["arrowup"]);
const PITCH_DOWN = new Set(["arrowdown"]);
const ROLL_LEFT = new Set(["arrowleft"]);
const ROLL_RIGHT = new Set(["arrowright"]);
const YAW_LEFT = new Set(["a", "q"]);
const YAW_RIGHT = new Set(["d", "e"]);
const THROTTLE_UP = new Set(["w", "z"]);
const THROTTLE_DOWN = new Set(["s"]);

/** Normalize a KeyboardEvent to a lowercase label token. */
const token = (e: KeyboardEvent) => e.key.toLowerCase();

export function useKeyboard(): void {
  useEffect(() => {
    const pressed = new Set<string>();

    const recompute = () => {
      let pitch = 0;
      let roll = 0;
      let yaw = 0;
      let throttle = 0;
      pressed.forEach((k) => {
        if (PITCH_UP.has(k)) pitch += 1;
        if (PITCH_DOWN.has(k)) pitch -= 1;
        if (ROLL_RIGHT.has(k)) roll += 1;
        if (ROLL_LEFT.has(k)) roll -= 1;
        if (YAW_RIGHT.has(k)) yaw += 1;
        if (YAW_LEFT.has(k)) yaw -= 1;
        if (THROTTLE_UP.has(k)) throttle += 1;
        if (THROTTLE_DOWN.has(k)) throttle -= 1;
      });
      input.pitch = pitch;
      input.roll = roll;
      input.yaw = yaw;
      input.throttle = throttle;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const k = token(e);
      if (k === "escape") {
        e.preventDefault();
        useGameStore.getState().toMenu();
        return;
      }
      if (e.repeat) return;
      if (k.startsWith("arrow")) e.preventDefault(); // stop page scroll
      pressed.add(k);
      recompute();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      pressed.delete(token(e));
      recompute();
    };

    // Release everything when the tab loses focus so the craft doesn't drift.
    const onBlur = () => {
      pressed.clear();
      recompute();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);
}
