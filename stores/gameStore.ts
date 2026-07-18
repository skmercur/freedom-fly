import { create } from "zustand";
import type { GamePhase } from "@/types/game";
import { resetInput } from "@/game/systems/input";

interface GameState {
  phase: GamePhase;
  /** True once the player has taken off at least once (unlocks audio). */
  started: boolean;

  /** Menu → in the air. The actual spawn is performed by <FlightRig>. */
  start: () => void;
  /** Ground contact: freeze and show the crash overlay. */
  crash: () => void;
  /** Put a fresh aircraft back in the air after a crash. */
  respawn: () => void;
  /** Return to the title screen. */
  toMenu: () => void;
  /** Open the settings panel. */
  toSettings: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: "loading",
  started: false,

  start: () => {
    resetInput();
    set({ phase: "flying", started: true });
  },

  crash: () => {
    if (get().phase !== "flying") return;
    set({ phase: "crashed" });
  },

  respawn: () => {
    resetInput();
    set({ phase: "flying" });
  },

  toMenu: () => set({ phase: "menu" }),

  toSettings: () => set({ phase: "settings" }),
}));
