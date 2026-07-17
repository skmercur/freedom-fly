import { create } from "zustand";
import type { ActivePowerUp, GamePhase, PowerUpType } from "@/types/game";
import {
  COLLECTIBLE_POINTS,
  MAX_COMBO,
  MAX_LIVES,
  POWERUP_DURATION,
  START_LIVES,
} from "@/lib/constants";
import { loadHighScore, saveHighScore } from "@/lib/storage";
import { resetRuntime, runtime } from "@/game/systems/runtime";

interface GameState {
  phase: GamePhase;
  score: number;
  highScore: number;
  /** Current combo multiplier (1..MAX_COMBO). */
  combo: number;
  bestCombo: number;
  lives: number;
  /** Whole difficulty level shown in the HUD. */
  level: number;
  /** Timed power-ups currently affecting the player. */
  activePowerUps: ActivePowerUp[];
  /** True once a game has ever begun (unlocks the AudioContext). */
  started: boolean;

  // --- flow -------------------------------------------------------------
  start: () => void;
  restart: () => void;
  pause: () => void;
  resume: () => void;
  togglePause: () => void;
  gameOver: () => void;
  toMenu: () => void;
  toSettings: () => void;

  // --- gameplay events --------------------------------------------------
  /** Player grabbed a collectible → score + combo up. Returns points gained. */
  collect: () => number;
  /** Player struck an obstacle → life down, combo reset. Returns lives left. */
  hit: () => number;
  addLife: () => void;
  setLevel: (level: number) => void;
  activatePowerUp: (type: PowerUpType) => void;
  deactivatePowerUp: (type: PowerUpType) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: "loading",
  score: 0,
  highScore: loadHighScore(),
  combo: 1,
  bestCombo: 1,
  lives: START_LIVES,
  level: 1,
  activePowerUps: [],
  started: false,

  start: () => {
    resetRuntime();
    runtime.running = true;
    set({
      phase: "playing",
      score: 0,
      combo: 1,
      bestCombo: 1,
      lives: START_LIVES,
      level: 1,
      activePowerUps: [],
      started: true,
    });
  },

  restart: () => get().start(),

  pause: () => {
    if (get().phase !== "playing") return;
    runtime.running = false;
    set({ phase: "paused" });
  },

  resume: () => {
    if (get().phase !== "paused") return;
    runtime.running = true;
    set({ phase: "playing" });
  },

  togglePause: () => {
    const p = get().phase;
    if (p === "playing") get().pause();
    else if (p === "paused") get().resume();
  },

  gameOver: () => {
    runtime.running = false;
    const { score, highScore } = get();
    const newHigh = Math.max(score, highScore);
    if (newHigh > highScore) saveHighScore(newHigh);
    set({ phase: "gameover", highScore: newHigh, activePowerUps: [] });
  },

  toMenu: () => {
    runtime.running = false;
    resetRuntime();
    set({ phase: "menu", activePowerUps: [] });
  },

  toSettings: () => set({ phase: "settings" }),

  collect: () => {
    const { combo, score, bestCombo } = get();
    const nextCombo = Math.min(combo + 1, MAX_COMBO);
    // Slow-mo doubles as a scoring bonus by keeping combos alive longer.
    const gained = COLLECTIBLE_POINTS * combo;
    set({
      score: score + gained,
      combo: nextCombo,
      bestCombo: Math.max(bestCombo, nextCombo),
    });
    return gained;
  },

  hit: () => {
    // Shield absorbs the blow entirely.
    if (runtime.shield) return get().lives;
    const lives = get().lives - 1;
    set({ lives, combo: 1 });
    if (lives <= 0) get().gameOver();
    return lives;
  },

  addLife: () =>
    set((s) => ({ lives: Math.min(s.lives + 1, MAX_LIVES) })),

  setLevel: (level) => {
    if (level !== get().level) set({ level });
  },

  activatePowerUp: (type) => {
    const duration = POWERUP_DURATION[type];
    runtime.powerRemaining[type] = duration;
    if (type === "shield") runtime.shield = true;
    if (type === "magnet") runtime.magnet = true;
    // "slow" needs no flag — the loop eases runtime.slow while its timer runs.
    set((s) => ({
      // Replace any existing instance of the same type so the HUD bar restarts.
      activePowerUps: [
        ...s.activePowerUps.filter((p) => p.type !== type),
        { type, duration, remaining: duration },
      ],
    }));
  },

  deactivatePowerUp: (type) => {
    runtime.powerRemaining[type] = 0;
    if (type === "shield") runtime.shield = false;
    if (type === "magnet") runtime.magnet = false;
    set((s) => ({
      activePowerUps: s.activePowerUps.filter((p) => p.type !== type),
    }));
  },
}));
