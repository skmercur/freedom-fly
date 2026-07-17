"use client";

import { useEffect } from "react";
import { input } from "@/game/systems/input";
import { useGameStore } from "@/stores/gameStore";

const UP = new Set(["KeyW", "ArrowUp"]);
const DOWN = new Set(["KeyS", "ArrowDown"]);
const LEFT = new Set(["KeyA", "ArrowLeft"]);
const RIGHT = new Set(["KeyD", "ArrowRight"]);
const PAUSE = new Set(["Escape", "KeyP"]);

/**
 * Global keyboard handler: WASD / arrow keys drive the movement axis and
 * Esc / P toggle pause. Keys are tracked as a live set so diagonal movement
 * and simultaneous presses resolve correctly.
 */
export function useKeyboard(): void {
  useEffect(() => {
    const pressed = new Set<string>();

    const recompute = () => {
      let x = 0;
      let y = 0;
      pressed.forEach((code) => {
        if (LEFT.has(code)) x -= 1;
        if (RIGHT.has(code)) x += 1;
        if (UP.has(code)) y += 1;
        if (DOWN.has(code)) y -= 1;
      });
      input.axis.x = x;
      input.axis.y = y;
      // Any directional key hands control back to the keyboard.
      if (x !== 0 || y !== 0) input.pointerActive = false;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (PAUSE.has(e.code)) {
        e.preventDefault();
        useGameStore.getState().togglePause();
        return;
      }
      pressed.add(e.code);
      recompute();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      pressed.delete(e.code);
      recompute();
    };

    // Reset axis when the tab loses focus so the ship doesn't drift.
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
