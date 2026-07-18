"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useGameStore } from "@/stores/gameStore";
import { LoadingScreen } from "./LoadingScreen";
import { MainMenu } from "./MainMenu";
import { SettingsPanel } from "./SettingsPanel";
import { HUD } from "./HUD";

/** Brief "you hit the ground" overlay shown before the auto-respawn. */
function CrashOverlay() {
  return (
    <motion.div
      key="crashed"
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="rounded-2xl border border-white/10 bg-black/40 px-8 py-5 text-center backdrop-blur">
        <div className="text-2xl font-black tracking-tight text-white">
          Terrain contact
        </div>
        <div className="mt-1 text-sm text-white/60">Respawning…</div>
      </div>
    </motion.div>
  );
}

/**
 * The DOM overlay above the WebGL canvas. It swaps screens based on the current
 * phase. The layer is `pointer-events-none` so the canvas keeps input; panels
 * opt back into pointer events themselves.
 */
export function GameUI() {
  const phase = useGameStore((s) => s.phase);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden font-sans text-white">
      {(phase === "flying" || phase === "crashed") && <HUD />}

      <AnimatePresence mode="wait">
        {phase === "loading" && <LoadingScreen key="loading" />}
        {phase === "menu" && <MainMenu key="menu" />}
        {phase === "settings" && <SettingsPanel key="settings" />}
        {phase === "crashed" && <CrashOverlay key="crashed" />}
      </AnimatePresence>
    </div>
  );
}
