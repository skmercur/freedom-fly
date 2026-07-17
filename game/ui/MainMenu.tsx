"use client";

import { motion } from "framer-motion";
import { useGameStore } from "@/stores/gameStore";
import { Button, GlassPanel } from "./primitives";

/** Title screen: play, open settings, and a quick how-to. */
export function MainMenu() {
  const start = useGameStore((s) => s.start);
  const toSettings = useGameStore((s) => s.toSettings);
  const highScore = useGameStore((s) => s.highScore);

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
          <div className="mb-1 text-5xl">🕊️</div>
          <h1 className="bg-gradient-to-r from-teal-300 via-cyan-300 to-sky-400 bg-clip-text text-5xl font-black tracking-tight text-transparent">
            FREEDOM FLY
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Weave through the void. Grab the light. Never stop.
          </p>
        </motion.div>

        <div className="my-6 rounded-2xl bg-white/5 py-3 text-white/80">
          <span className="text-xs uppercase tracking-widest text-white/40">
            Best
          </span>
          <div className="text-3xl font-bold text-amber-300">
            {highScore.toLocaleString()}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={start} className="text-lg">
            ▶ Play
          </Button>
          <Button variant="ghost" onClick={toSettings}>
            ⚙ Settings
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2 text-xs text-white/45">
          <div>
            <div className="text-lg">🟡</div>
            Collect for combo
          </div>
          <div>
            <div className="text-lg">🔴</div>
            Dodge the rocks
          </div>
          <div>
            <div className="text-lg">✨</div>
            Grab power-ups
          </div>
        </div>

        <p className="mt-5 text-[11px] leading-relaxed text-white/35">
          Move with <span className="text-white/60">WASD / Arrows</span>, the{" "}
          <span className="text-white/60">mouse</span>, or the on-screen stick.
          Press <span className="text-white/60">Esc</span> to pause.
        </p>
      </GlassPanel>
    </motion.div>
  );
}
