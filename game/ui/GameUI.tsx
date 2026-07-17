"use client";

import { AnimatePresence } from "framer-motion";
import { useGameStore } from "@/stores/gameStore";
import { useIsTouch } from "@/game/hooks/useIsTouch";
import { LoadingScreen } from "./LoadingScreen";
import { MainMenu } from "./MainMenu";
import { SettingsPanel } from "./SettingsPanel";
import { HUD } from "./HUD";
import { PauseMenu } from "./PauseMenu";
import { GameOverScreen } from "./GameOverScreen";
import { Joystick } from "./Joystick";

/**
 * The DOM overlay. It sits above the WebGL canvas and swaps screens based on
 * the current game phase. The whole layer is `pointer-events-none` so the
 * canvas keeps receiving mouse steering; individual panels/controls opt back
 * in to pointer events themselves.
 */
export function GameUI() {
  const phase = useGameStore((s) => s.phase);
  const isTouch = useIsTouch();

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden font-sans text-white">
      {(phase === "playing" || phase === "paused") && <HUD />}
      {isTouch && phase === "playing" && <Joystick />}

      <AnimatePresence mode="wait">
        {phase === "loading" && <LoadingScreen key="loading" />}
        {phase === "menu" && <MainMenu key="menu" />}
        {phase === "settings" && <SettingsPanel key="settings" />}
        {phase === "paused" && <PauseMenu key="paused" />}
        {phase === "gameover" && <GameOverScreen key="gameover" />}
      </AnimatePresence>
    </div>
  );
}
