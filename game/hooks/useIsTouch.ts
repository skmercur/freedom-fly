"use client";

import { useEffect, useState } from "react";

/**
 * True on coarse-pointer (touch) devices. Used to decide whether to show the
 * virtual joystick. Evaluated after mount to stay SSR-safe.
 */
export function useIsTouch(): boolean {
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setIsTouch(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isTouch;
}
