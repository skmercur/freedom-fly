"use client";

import { motion } from "framer-motion";
import { useGameStore } from "@/stores/gameStore";
import { Button, GlassPanel } from "./primitives";

/** End-of-run summary with a new-record celebration. */
export function GameOverScreen() {
  const score = useGameStore((s) => s.score);
  const highScore = useGameStore((s) => s.highScore);
  const bestCombo = useGameStore((s) => s.bestCombo);
  const restart = useGameStore((s) => s.restart);
  const toMenu = useGameStore((s) => s.toMenu);

  const isRecord = score > 0 && score >= highScore;

  return (
    <motion.div
      className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
    >
      <GlassPanel className="w-full max-w-md p-8 text-center">
        <motion.h2
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="text-4xl font-black text-rose-400"
        >
          Game Over
        </motion.h2>

        {isRecord && (
          <motion.div
            initial={{ scale: 0, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 260 }}
            className="mx-auto mt-3 w-fit rounded-full bg-amber-400/20 px-4 py-1 text-sm font-bold tracking-wide text-amber-300"
          >
            🏆 New Record!
          </motion.div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/5 py-4">
            <div className="text-xs uppercase tracking-widest text-white/40">
              Score
            </div>
            <div className="text-3xl font-black text-white">
              {score.toLocaleString()}
            </div>
          </div>
          <div className="rounded-2xl bg-white/5 py-4">
            <div className="text-xs uppercase tracking-widest text-white/40">
              Best
            </div>
            <div className="text-3xl font-black text-amber-300">
              {highScore.toLocaleString()}
            </div>
          </div>
        </div>
        <div className="mt-3 rounded-2xl bg-white/5 py-3 text-white/70">
          Best combo{" "}
          <span className="font-bold text-orange-300">×{bestCombo}</span>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <Button onClick={restart} className="text-lg">
            ↻ Play Again
          </Button>
          <Button variant="ghost" onClick={toMenu}>
            ⌂ Main Menu
          </Button>
        </div>
      </GlassPanel>
    </motion.div>
  );
}
