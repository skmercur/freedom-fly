"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import { useProgress } from "@react-three/drei";
import { useGameStore } from "@/stores/gameStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useKeyboard } from "@/game/hooks/useKeyboard";
import { GameUI } from "@/game/ui/GameUI";
import { audio } from "@/lib/audio";

/**
 * The WebGL canvas is loaded with `ssr: false` so Three.js never touches the
 * server. Per Next 16, a dynamic import with `ssr: false` must live inside a
 * Client Component — which this is.
 */
const GameCanvas = dynamic(
  () => import("@/components/GameCanvas").then((m) => m.GameCanvas),
  { ssr: false },
);

/**
 * Top-level client orchestrator: owns the DOM/canvas layout, wires global
 * input, drives the loading→menu boot, and keeps the audio engine in sync with
 * settings. It intentionally holds no game state itself.
 */
export function GameShell() {
  const containerRef = useRef<HTMLDivElement>(null);
  const phase = useGameStore((s) => s.phase);
  const toMenu = useGameStore((s) => s.toMenu);
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const musicEnabled = useSettingsStore((s) => s.musicEnabled);
  const volume = useSettingsStore((s) => s.volume);

  // Global input: keyboard flight controls.
  useKeyboard();

  // Boot: hold the loading screen until the models have actually downloaded
  // (useProgress taps three's DefaultLoadingManager), with a floor so the
  // screen doesn't flash on cached loads and a ceiling so a stalled or failed
  // download can never trap the player on it.
  const { active, progress, total } = useProgress();
  const bootAt = useRef(0);
  useEffect(() => {
    bootAt.current = Date.now();
  }, []);
  useEffect(() => {
    if (phase !== "loading") return;
    const ready = total > 0 && progress >= 100 && !active;
    const wait = ready
      ? Math.max(400, 1200 - (Date.now() - bootAt.current))
      : 20000;
    const id = setTimeout(toMenu, wait);
    return () => clearTimeout(id);
  }, [phase, active, progress, total, toMenu]);

  // AudioContext can only start after a user gesture — unlock on first input.
  useEffect(() => {
    const unlock = () => {
      const a = audio();
      a.ensure();
      if (useSettingsStore.getState().musicEnabled) a.startMusic();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // Mirror settings into the audio engine.
  useEffect(() => {
    const a = audio();
    a.setEnabled(soundEnabled);
    a.setMusicEnabled(musicEnabled);
    a.setVolume(volume);
    if (musicEnabled) a.startMusic();
    else a.stopMusic();
  }, [soundEnabled, musicEnabled, volume]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 touch-none overflow-hidden bg-[#05060f]"
    >
      <GameCanvas />
      <GameUI />
    </div>
  );
}
