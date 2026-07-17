"use client";

import { motion } from "framer-motion";
import { useGameStore } from "@/stores/gameStore";
import { Button, GlassPanel } from "./primitives";

/** Pause overlay: resume, restart, or bail to the menu. */
export function PauseMenu() {
  const resume = useGameStore((s) => s.resume);
  const restart = useGameStore((s) => s.restart);
  const toMenu = useGameStore((s) => s.toMenu);
  const score = useGameStore((s) => s.score);

  return (
    <motion.div
      className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/50 p-6 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <GlassPanel className="w-full max-w-sm p-8 text-center">
        <h2 className="text-3xl font-bold text-white">Paused</h2>
        <p className="mt-2 text-sm text-white/50">
          Score so far:{" "}
          <span className="font-semibold text-amber-300">
            {score.toLocaleString()}
          </span>
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Button onClick={resume} className="text-lg">
            ▶ Resume
          </Button>
          <Button variant="ghost" onClick={restart}>
            ↻ Restart
          </Button>
          <Button variant="ghost" onClick={toMenu}>
            ⌂ Main Menu
          </Button>
        </div>
      </GlassPanel>
    </motion.div>
  );
}
