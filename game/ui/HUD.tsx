"use client";

import { useEffect, useRef } from "react";
import { flight } from "@/game/systems/flight";

/** One instrument read-out (label + live value). */
function Gauge({
  label,
  unit,
  valueRef,
  align = "left",
}: {
  label: string;
  unit: string;
  valueRef: React.RefObject<HTMLSpanElement | null>;
  align?: "left" | "right";
}) {
  return (
    <div className={align === "right" ? "text-right" : "text-left"}>
      <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">
        {label}
      </div>
      <div className="font-mono text-3xl font-bold tabular-nums text-white drop-shadow">
        <span ref={valueRef}>0</span>
        <span className="ml-1 text-sm font-medium text-white/50">{unit}</span>
      </div>
    </div>
  );
}

/**
 * Flight instruments. Values are pushed straight from the non-reactive `flight`
 * state via a private requestAnimationFrame, so the numbers update every frame
 * with zero React re-renders.
 */
export function HUD() {
  const speedRef = useRef<HTMLSpanElement>(null);
  const altRef = useRef<HTMLSpanElement>(null);
  const thrRef = useRef<HTMLSpanElement>(null);
  const stallRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (speedRef.current)
        speedRef.current.textContent = Math.round(flight.airspeed).toString();
      if (altRef.current)
        altRef.current.textContent = Math.max(
          0,
          Math.round(flight.altitude),
        ).toString();
      if (thrRef.current)
        thrRef.current.textContent = Math.round(flight.throttle * 100).toString();
      if (stallRef.current)
        stallRef.current.style.opacity = flight.stalling ? "1" : "0";
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 p-5 sm:p-8">
      {/* Bottom-left: airspeed + throttle */}
      <div className="absolute bottom-6 left-6 flex items-end gap-6">
        <Gauge label="Airspeed" unit="kt" valueRef={speedRef} />
        <Gauge label="Throttle" unit="%" valueRef={thrRef} />
      </div>

      {/* Bottom-right: altitude */}
      <div className="absolute bottom-6 right-6">
        <Gauge label="Altitude" unit="ft" valueRef={altRef} align="right" />
      </div>

      {/* Center: stall warning */}
      <div
        ref={stallRef}
        style={{ opacity: 0, transition: "opacity 120ms" }}
        className="absolute left-1/2 top-10 -translate-x-1/2 rounded-lg border border-red-400/40 bg-red-500/20 px-4 py-1.5 text-sm font-bold uppercase tracking-widest text-red-200 backdrop-blur"
      >
        ⚠ Stall — lower the nose
      </div>

      {/* Top-right: back hint */}
      <div className="absolute right-6 top-6 text-[11px] uppercase tracking-widest text-white/40">
        Esc — menu
      </div>
    </div>
  );
}
