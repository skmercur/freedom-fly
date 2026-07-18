import { create } from "zustand";
import type { CrashReason, GamePhase } from "@/types/game";
import { resetInput } from "@/game/systems/input";

interface GameState {
  phase: GamePhase;
  /** What ended the last flight (shown by the crash overlay). */
  crashReason: CrashReason;
  /** True once the player has taken off at least once (unlocks audio). */
  started: boolean;
  /**
   * Increments every time a *fresh* aircraft should be spawned (take-off,
   * respawn, restart). <FlightRig> keys its spawn effect on this, so resuming
   * from pause — which only flips the phase — never teleports the plane.
   */
  flightId: number;

  /** Menu → in the air. The actual spawn is performed by <FlightRig>. */
  start: () => void;
  /** End of flight (ground impact, airframe failure): freeze + overlay. */
  crash: (reason?: CrashReason) => void;
  /** Put a fresh aircraft back in the air after a crash. */
  respawn: () => void;
  /** Freeze the sim mid-flight. */
  pause: () => void;
  /** Continue exactly where the sim was frozen. */
  resume: () => void;
  /** Return to the title screen. */
  toMenu: () => void;
  /** Open the settings panel. */
  toSettings: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: "loading",
  crashReason: "terrain",
  started: false,
  flightId: 0,

  start: () => {
    resetInput();
    set((s) => ({ phase: "flying", started: true, flightId: s.flightId + 1 }));
  },

  crash: (reason = "terrain") => {
    if (get().phase !== "flying") return;
    set({ phase: "crashed", crashReason: reason });
  },

  respawn: () => {
    resetInput();
    set((s) => ({ phase: "flying", flightId: s.flightId + 1 }));
  },

  pause: () => {
    if (get().phase !== "flying") return;
    set({ phase: "paused" });
  },

  resume: () => {
    if (get().phase !== "paused") return;
    resetInput();
    set({ phase: "flying" });
  },

  toMenu: () => set({ phase: "menu" }),

  toSettings: () => set({ phase: "settings" }),
}));
