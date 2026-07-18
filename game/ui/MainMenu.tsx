"use client";

import { motion } from "framer-motion";
import { useGameStore } from "@/stores/gameStore";
import { Button, GlassPanel } from "./primitives";

/** Title screen: take off, open settings, and a quick controls reference. */
export function MainMenu() {
  const start = useGameStore((s) => s.start);
  const toSettings = useGameStore((s) => s.toSettings);

  return (
    <motion.div
      className="pointer-events-auto absolute inset-0 flex items-center justify-center p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <GlassPanel className="w-full max-w-md p-8 text-center">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.05, type: "spring", stiffness: 120 }}
        >
          <div className="mb-1 text-5xl">🛩️</div>
          <h1 className="bg-gradient-to-r from-sky-300 via-cyan-200 to-blue-400 bg-clip-text text-5xl font-black tracking-tight text-transparent">
            FREEDOM FLY
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Open skies over the mountains. No goals, no clock — just fly.
          </p>
        </motion.div>

        <div className="mt-7 flex flex-col gap-3">
          <Button onClick={start} className="text-lg">
            🛫 Take off
          </Button>
          <Button variant="ghost" onClick={toSettings}>
            ⚙ Settings
          </Button>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-x-6 gap-y-2 text-left text-xs text-white/55">
          <ControlRow keys="↑ / ↓" action="Pitch (climb / dive)" />
          <ControlRow keys="← / →" action="Roll (bank)" />
          <ControlRow keys="Z / S" action="Throttle up / down" />
          <ControlRow keys="Q / D" action="Rudder (yaw)" />
          <ControlRow keys="1 – 4" action="Throttle presets" />
          <ControlRow keys="Esc" action="Pause" />
        </div>

        <p className="mt-5 text-[11px] leading-relaxed text-white/35">
          Keep your airspeed up — fly too slow and the wing{" "}
          <span className="text-white/60">stalls</span>. Touch down gently,
          wings level, and you can <span className="text-white/60">land</span>{" "}
          and take off again. Gamepad and touch supported; hold the right mouse
          button to look around.
        </p>
      </GlassPanel>
    </motion.div>
  );
}

function ControlRow({ keys, action }: { keys: string; action: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[11px] text-white/80">
        {keys}
      </span>
      <span>{action}</span>
    </div>
  );
}
