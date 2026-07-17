"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import type { ActivePowerUp, PowerUpType } from "@/types/game";
import { useGameStore } from "@/stores/gameStore";
import { runtime } from "@/game/systems/runtime";
import { MAX_LIVES, POWERUP_COLOR } from "@/lib/constants";

const POWER_META: Record<PowerUpType, { icon: string; label: string }> = {
  shield: { icon: "🛡️", label: "Shield" },
  magnet: { icon: "🧲", label: "Magnet" },
  slow: { icon: "⏳", label: "Slow-Mo" },
};

/**
 * Power-up badge with a depleting bar. The bar width is driven by a private
 * requestAnimationFrame reading the non-reactive `runtime` timer, so it stays
 * perfectly in sync with gameplay and automatically freezes while paused —
 * with zero React re-renders.
 */
function PowerUpBadge({ pu }: { pu: ActivePowerUp }) {
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const pct = Math.max(0, runtime.powerRemaining[pu.type] / pu.duration);
      if (barRef.current) barRef.current.style.transform = `scaleX(${pct})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pu.type, pu.duration]);

  const color = POWERUP_COLOR[pu.type];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.9 }}
      className="flex w-36 items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 backdrop-blur"
    >
      <span className="text-lg">{POWER_META[pu.type].icon}</span>
      <div className="flex-1">
        <div className="text-[11px] font-semibold text-white/80">
          {POWER_META[pu.type].label}
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            ref={barRef}
            className="h-full origin-left rounded-full"
            style={{ backgroundColor: color }}
          />
        </div>
      </div>
    </motion.div>
  );
}

/** The in-game heads-up display. */
export function HUD() {
  const score = useGameStore((s) => s.score);
  const combo = useGameStore((s) => s.combo);
  const lives = useGameStore((s) => s.lives);
  const level = useGameStore((s) => s.level);
  const powerUps = useGameStore((s) => s.activePowerUps);
  const pause = useGameStore((s) => s.pause);

  return (
    <div className="pointer-events-none absolute inset-0 p-4 sm:p-6">
      {/* Top-left: score */}
      <div className="absolute left-4 top-4 sm:left-6 sm:top-6">
        <div className="text-xs uppercase tracking-widest text-white/40">
          Score
        </div>
        <motion.div
          key={score}
          initial={{ scale: 1.15 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="text-4xl font-black tabular-nums text-white drop-shadow"
        >
          {score.toLocaleString()}
        </motion.div>
      </div>

      {/* Top-right: level + pause */}
      <div className="absolute right-4 top-4 flex items-center gap-3 sm:right-6 sm:top-6">
        <div className="text-right">
          <div className="text-xs uppercase tracking-widest text-white/40">
            Level
          </div>
          <div className="text-2xl font-bold text-cyan-300">{level}</div>
        </div>
        <button
          onClick={pause}
          className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-lg text-white/80 backdrop-blur transition-colors hover:bg-white/10"
          aria-label="Pause"
        >
          ⏸
        </button>
      </div>

      {/* Center-top: combo */}
      <div className="absolute left-1/2 top-4 -translate-x-1/2 sm:top-6">
        <AnimatePresence>
          {combo > 1 && (
            <motion.div
              key="combo"
              initial={{ opacity: 0, y: -10, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center"
            >
              <motion.span
                key={combo}
                initial={{ scale: 1.4 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 18 }}
                className="bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-3xl font-black text-transparent"
              >
                ×{combo}
              </motion.span>
              <span className="text-[10px] uppercase tracking-widest text-amber-200/60">
                Combo
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom-left: lives */}
      <div className="absolute bottom-4 left-4 flex gap-1.5 sm:bottom-6 sm:left-6">
        {Array.from({ length: MAX_LIVES }).map((_, i) => (
          <motion.span
            key={i}
            animate={{
              scale: i < lives ? 1 : 0.8,
              opacity: i < lives ? 1 : 0.25,
            }}
            className="text-2xl"
          >
            {i < lives ? "❤️" : "🖤"}
          </motion.span>
        ))}
      </div>

      {/* Bottom-right: active power-ups */}
      <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2 sm:bottom-6 sm:right-6">
        <AnimatePresence>
          {powerUps.map((pu) => (
            <PowerUpBadge key={pu.type} pu={pu} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
