"use client";

import { motion } from "framer-motion";
import { useGameStore } from "@/stores/gameStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { Button, GlassPanel } from "./primitives";

/** A labelled on/off pill switch. */
function Toggle({
  label,
  icon,
  on,
  onToggle,
}: {
  label: string;
  icon: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
      <span className="flex items-center gap-2 font-medium text-white/85">
        <span className="text-lg">{icon}</span>
        {label}
      </span>
      <button
        onClick={onToggle}
        aria-pressed={on}
        className={`relative h-7 w-12 rounded-full transition-colors ${
          on ? "bg-teal-400" : "bg-white/15"
        }`}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 500, damping: 32 }}
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow ${
            on ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

/** Settings: SFX / music toggles and master volume. */
export function SettingsPanel() {
  const toMenu = useGameStore((s) => s.toMenu);
  const {
    soundEnabled,
    musicEnabled,
    mouseSteering,
    volume,
    toggleSound,
    toggleMusic,
    toggleMouseSteering,
    setVolume,
  } = useSettingsStore();

  return (
    <motion.div
      className="pointer-events-auto absolute inset-0 flex items-center justify-center p-6"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.3 }}
    >
      <GlassPanel className="w-full max-w-md p-8">
        <h2 className="mb-6 text-center text-3xl font-bold text-white">
          Settings
        </h2>

        <div className="flex flex-col gap-3">
          <Toggle
            label="Sound Effects"
            icon=""
            on={soundEnabled}
            onToggle={toggleSound}
          />
          <Toggle
            label="Music"
            icon=""
            on={musicEnabled}
            onToggle={toggleMusic}
          />
          <Toggle
            label="Mouse Steering"
            icon=""
            on={mouseSteering}
            onToggle={toggleMouseSteering}
          />

          <div className="rounded-2xl bg-white/5 px-4 py-3">
            <div className="mb-2 flex items-center justify-between font-medium text-white/85">
              <span className="flex items-center gap-2">
                <span className="text-lg"></span> Volume
              </span>
              <span className="text-white/50">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-teal-400"
            />
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <Button variant="ghost" onClick={toMenu}>
            Back
          </Button>
        </div>
      </GlassPanel>
    </motion.div>
  );
}
