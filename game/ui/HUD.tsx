"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { flight } from "@/game/systems/flight";
import { wind } from "@/game/systems/wind";
import { FLAP_NOTCH_DEG } from "@/lib/constants";

/** World units are ~metres; convert for aviation-style instruments. */
const MS_TO_KT = 1.94384;
const M_TO_FT = 3.28084;

const _fwd = new THREE.Vector3();

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
  const gRef = useRef<HTMLSpanElement>(null);
  const flapsRef = useRef<HTMLSpanElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const windSpeedRef = useRef<HTMLSpanElement>(null);
  const windArrowRef = useRef<HTMLSpanElement>(null);
  const stallRef = useRef<HTMLDivElement>(null);
  const stressRef = useRef<HTMLDivElement>(null);
  const groundRef = useRef<HTMLDivElement>(null);
  const fpsRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let raf = 0;
    let frames = 0;
    let fpsWindowStart = performance.now();
    const tick = () => {
      // FPS over a rolling half-second window (per-frame numbers just flicker).
      frames++;
      const now = performance.now();
      if (now - fpsWindowStart >= 500) {
        if (fpsRef.current)
          fpsRef.current.textContent = Math.round(
            (frames * 1000) / (now - fpsWindowStart),
          ).toString();
        frames = 0;
        fpsWindowStart = now;
      }
      if (speedRef.current)
        speedRef.current.textContent = Math.round(
          flight.airspeed * MS_TO_KT,
        ).toString();
      if (altRef.current)
        altRef.current.textContent = Math.max(
          0,
          Math.round(flight.altitude * M_TO_FT),
        ).toString();
      if (thrRef.current)
        thrRef.current.textContent = Math.round(flight.throttle * 100).toString();
      if (gRef.current)
        gRef.current.textContent = flight.gForce.toFixed(1);
      if (flapsRef.current)
        flapsRef.current.textContent =
          FLAP_NOTCH_DEG[flight.flapNotch].toString();
      if (windSpeedRef.current)
        windSpeedRef.current.textContent = Math.round(
          wind.length() * MS_TO_KT,
        ).toString();
      if (windArrowRef.current) {
        // Arrow shows where the wind blows *toward*, relative to the nose:
        // straight up = tailwind, straight down = headwind.
        _fwd.set(0, 0, -1).applyQuaternion(flight.quaternion);
        const heading = Math.atan2(-_fwd.x, -_fwd.z);
        const windTo = Math.atan2(-wind.x, -wind.z);
        windArrowRef.current.style.transform = `rotate(${windTo - heading}rad)`;
      }
      if (timeRef.current) {
        const t = Math.floor(flight.flightTime);
        const m = Math.floor(t / 60);
        const s = (t % 60).toString().padStart(2, "0");
        timeRef.current.textContent = `${m}:${s}`;
      }
      if (stallRef.current)
        stallRef.current.style.opacity = flight.stalling ? "1" : "0";
      if (stressRef.current)
        stressRef.current.style.opacity = flight.overLimit ? "1" : "0";
      if (groundRef.current)
        groundRef.current.style.opacity = flight.grounded ? "1" : "0";
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 p-5 sm:p-8">
      {/* Top-left: flight time + wind */}
      <div className="absolute left-6 top-6 text-left">
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">
          Flight time
        </div>
        <div className="font-mono text-xl font-bold tabular-nums text-white/85 drop-shadow">
          <span ref={timeRef}>0:00</span>
        </div>
        <div className="mt-2 text-[10px] uppercase tracking-[0.2em] text-white/50">
          Wind
        </div>
        <div className="font-mono text-sm font-bold tabular-nums text-white/75 drop-shadow">
          <span
            ref={windArrowRef}
            className="mr-1 inline-block"
            style={{ transform: "rotate(0rad)" }}
          >
            ↑
          </span>
          <span ref={windSpeedRef}>0</span>
          <span className="ml-1 font-medium text-white/50">kt</span>
        </div>
      </div>

      {/* Bottom-left: airspeed + throttle + load factor */}
      <div className="absolute bottom-6 left-6 flex items-end gap-6">
        <Gauge label="Airspeed" unit="kt" valueRef={speedRef} />
        <Gauge label="Throttle" unit="%" valueRef={thrRef} />
        <Gauge label="Load" unit="g" valueRef={gRef} />
      </div>

      {/* Bottom-right: flaps + altitude */}
      <div className="absolute bottom-6 right-6 flex items-end gap-6">
        <Gauge label="Flaps" unit="°" valueRef={flapsRef} align="right" />
        <Gauge label="Altitude" unit="ft" valueRef={altRef} align="right" />
      </div>

      {/* Center: stall warning */}
      <div
        ref={stallRef}
        style={{ opacity: 0, transition: "opacity 120ms" }}
        className="absolute left-1/2 top-10 -translate-x-1/2 rounded-lg border border-red-400/40 bg-red-500/20 px-4 py-1.5 text-sm font-bold uppercase tracking-widest text-red-200 backdrop-blur"
      >
        Stall — lower the nose
      </div>

      {/* Center: airframe overstress warning */}
      <div
        ref={stressRef}
        style={{ opacity: 0, transition: "opacity 120ms" }}
        className="absolute left-1/2 top-24 -translate-x-1/2 rounded-lg border border-amber-300/40 bg-amber-400/15 px-4 py-1.5 text-sm font-bold uppercase tracking-widest text-amber-100 backdrop-blur"
      >
        Overstress — ease off
      </div>

      {/* Center-bottom: on-ground hint */}
      <div
        ref={groundRef}
        style={{ opacity: 0, transition: "opacity 200ms" }}
        className="absolute bottom-28 left-1/2 -translate-x-1/2 rounded-lg bg-black/30 px-4 py-1.5 text-xs uppercase tracking-widest text-white/70 backdrop-blur"
      >
        On the ground — full throttle and pull up to take off
      </div>

      {/* Top-right: fps + pilot + pause hint */}
      <div className="absolute right-6 top-6 text-right">
        <div className="font-mono text-xs tabular-nums text-white/50">
          <span ref={fpsRef}>—</span>
          <span className="ml-1 text-white/35">fps</span>
        </div>
        <div className="mt-1 text-[11px] uppercase tracking-widest text-white/40">
          Esc — pause
        </div>
        <a
          href="https://github.com/skmercur/"
          target="_blank"
          rel="noreferrer"
          className="pointer-events-auto mt-1 block text-[10px] tracking-widest text-white/30 transition hover:text-white/60"
        >
          Created by Sofiane KHOUDOUR
        </a>
      </div>
    </div>
  );
}
