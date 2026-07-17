"use client";

import { useEffect, type RefObject } from "react";
import { input } from "@/game/systems/input";

/**
 * Maps mouse / touch movement over the game surface to a normalized [-1, 1]
 * pointer target. Only engages while the pointer is actually over the canvas
 * so HUD clicks don't yank the ship around.
 */
export function usePointer(target: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = target.current;
    if (!el) return;

    const update = (clientX: number, clientY: number) => {
      const rect = el.getBoundingClientRect();
      const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((clientY - rect.top) / rect.height) * 2 - 1);
      input.pointer.x = nx;
      input.pointer.y = ny;
      input.pointerActive = true;
    };

    const onMove = (e: PointerEvent) => {
      // Touch is handled by the joystick; only mouse steers via pointer.
      if (e.pointerType === "touch") return;
      update(e.clientX, e.clientY);
    };

    el.addEventListener("pointermove", onMove);
    return () => el.removeEventListener("pointermove", onMove);
  }, [target]);
}
