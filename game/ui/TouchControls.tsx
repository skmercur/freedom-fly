"use client";

import { useEffect, useRef, useState } from "react";
import { setStickAxis, setThrottleTarget } from "@/game/systems/input";
import { flight } from "@/game/systems/flight";

const STICK_RADIUS = 56; // px of knob travel

/**
 * On-screen controls for touch devices: a left thumb-stick (roll/pitch, drag
 * up = climb) and a right throttle rail (absolute 0–100%). Rendered only when
 * the device reports a coarse pointer. Knob/fill are moved by direct DOM
 * writes so dragging never re-renders React.
 */
export function TouchControls() {
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    setTouch(
      window.matchMedia("(pointer: coarse)").matches ||
        navigator.maxTouchPoints > 0,
    );
  }, []);

  if (!touch) return null;
  return (
    <>
      <Stick />
      <ThrottleRail />
    </>
  );
}

function Stick() {
  const knob = useRef<HTMLDivElement>(null);
  const base = useRef<HTMLDivElement>(null);

  const move = (e: React.PointerEvent) => {
    if (!base.current || !knob.current) return;
    const rect = base.current.getBoundingClientRect();
    let dx = e.clientX - (rect.left + rect.width / 2);
    let dy = e.clientY - (rect.top + rect.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > STICK_RADIUS) {
      dx = (dx / len) * STICK_RADIUS;
      dy = (dy / len) * STICK_RADIUS;
    }
    knob.current.style.transform = `translate(${dx}px, ${dy}px)`;
    // Drag up = climb (screen y grows downward, pitch is +up).
    setStickAxis(dx / STICK_RADIUS, -dy / STICK_RADIUS);
  };

  const release = () => {
    if (knob.current) knob.current.style.transform = "translate(0px, 0px)";
    setStickAxis(0, 0);
  };

  return (
    <div
      ref={base}
      className="pointer-events-auto absolute bottom-24 left-8 flex h-36 w-36 touch-none items-center justify-center rounded-full border border-white/15 bg-white/5 backdrop-blur-sm"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        move(e);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) move(e);
      }}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <div
        ref={knob}
        className="h-14 w-14 rounded-full bg-white/25 shadow-lg backdrop-blur"
      />
    </div>
  );
}

function ThrottleRail() {
  const track = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLDivElement>(null);

  // Reflect the sim's current throttle when not being dragged.
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (fill.current) {
        fill.current.style.height = `${flight.targetThrottle * 100}%`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const move = (e: React.PointerEvent) => {
    if (!track.current) return;
    const rect = track.current.getBoundingClientRect();
    const v = 1 - (e.clientY - rect.top) / rect.height;
    setThrottleTarget(v);
  };

  return (
    <div
      ref={track}
      className="pointer-events-auto absolute bottom-24 right-8 h-44 w-12 touch-none overflow-hidden rounded-2xl border border-white/15 bg-white/5 backdrop-blur-sm"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        move(e);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) move(e);
      }}
    >
      <div
        ref={fill}
        className="absolute bottom-0 w-full rounded-b-2xl bg-gradient-to-t from-teal-400/70 to-cyan-300/70"
        style={{ height: "35%" }}
      />
      <div className="absolute inset-x-0 top-1.5 text-center text-[9px] font-bold uppercase tracking-widest text-white/50">
        THR
      </div>
    </div>
  );
}
