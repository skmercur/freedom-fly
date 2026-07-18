"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useProgress } from "@react-three/drei";
import { useGameStore } from "@/stores/gameStore";
import { LoadingScreen } from "./LoadingScreen";
import { MainMenu } from "./MainMenu";
import { SettingsPanel } from "./SettingsPanel";
import { HUD } from "./HUD";
import { TouchControls } from "./TouchControls";
import { Button, GlassPanel } from "./primitives";

const CRASH_TEXT = {
  terrain: {
    title: "Terrain contact",
    detail: "Respawning…",
  },
  overstress: {
    title: "Airframe failure",
    detail: "Too much stress — the wings gave way. Respawning…",
  },
} as const;

/** Brief end-of-flight overlay shown before the auto-respawn. */
function CrashOverlay() {
  const reason = useGameStore((s) => s.crashReason);
  const text = CRASH_TEXT[reason];
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
          {text.title}
        </div>
        <div className="mt-1 text-sm text-white/60">{text.detail}</div>
      </div>
    </motion.div>
  );
}

/** Mid-flight pause: resume where you were, restart the flight, or bail out. */
function PauseOverlay() {
  const resume = useGameStore((s) => s.resume);
  const restart = useGameStore((s) => s.start);
  const toMenu = useGameStore((s) => s.toMenu);

  return (
    <motion.div
      key="paused"
      className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/30 p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <GlassPanel className="w-full max-w-xs p-8 text-center">
        <h2 className="mb-6 text-3xl font-bold text-white">Paused</h2>
        <div className="flex flex-col gap-3">
          <Button onClick={resume}>Resume</Button>
          <Button variant="ghost" onClick={restart}>
            Restart flight
          </Button>
          <Button variant="ghost" onClick={toMenu}>
            Quit to menu
          </Button>
        </div>
        <p className="mt-5 text-[11px] text-white/35">Esc also resumes</p>
      </GlassPanel>
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
  const { progress } = useProgress();
  const inFlight =
    phase === "flying" || phase === "paused" || phase === "crashed";

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden font-sans text-white">
      {inFlight && <HUD />}
      {phase === "flying" && <TouchControls />}

      <AnimatePresence mode="wait">
        {phase === "loading" && (
          <LoadingScreen key="loading" progress={progress} />
        )}
        {phase === "menu" && <MainMenu key="menu" />}
        {phase === "settings" && <SettingsPanel key="settings" />}
        {phase === "paused" && <PauseOverlay key="paused" />}
        {phase === "crashed" && <CrashOverlay key="crashed" />}
      </AnimatePresence>
    </div>
  );
}
