"use client";

import { useRef, useState } from "react";
import { setJoystickAxis } from "@/game/systems/input";

const RADIUS = 56; // px travel of the knob from center

/**
 * Virtual thumb-stick for touch devices. Drag inside the ring to steer; the
 * knob is clamped to the unit circle and its offset is written straight into
 * the shared input state (normalized to [-1, 1], Y inverted for screen space).
 */
export function Joystick() {
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const origin = useRef({ x: 0, y: 0 });
  const active = useRef(false);

  const move = (clientX: number, clientY: number) => {
    let dx = clientX - origin.current.x;
    let dy = clientY - origin.current.y;
    const dist = Math.hypot(dx, dy);
    if (dist > RADIUS) {
      dx = (dx / dist) * RADIUS;
      dy = (dy / dist) * RADIUS;
    }
    setKnob({ x: dx, y: dy });
    // Screen-Y grows downward, so invert for "up = positive".
    setJoystickAxis(dx / RADIUS, -dy / RADIUS);
  };

  const start = (e: React.PointerEvent) => {
    active.current = true;
    origin.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const drag = (e: React.PointerEvent) => {
    if (active.current) move(e.clientX, e.clientY);
  };

  const end = () => {
    active.current = false;
    setKnob({ x: 0, y: 0 });
    setJoystickAxis(0, 0);
  };

  return (
    <div className="pointer-events-none absolute bottom-24 left-1/2 -translate-x-1/2 select-none sm:bottom-10 sm:left-10 sm:translate-x-0">
      <div
        onPointerDown={start}
        onPointerMove={drag}
        onPointerUp={end}
        onPointerCancel={end}
        className="pointer-events-auto relative flex h-36 w-36 touch-none items-center justify-center rounded-full border border-white/15 bg-white/5 backdrop-blur"
      >
        <div
          className="h-16 w-16 rounded-full bg-gradient-to-br from-teal-300/80 to-cyan-500/80 shadow-lg shadow-cyan-500/30"
          style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
        />
      </div>
    </div>
  );
}
