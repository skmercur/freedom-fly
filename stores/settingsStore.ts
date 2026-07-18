import { create } from "zustand";
import { loadJSON, saveJSON } from "@/lib/storage";
import { setMouseAxes } from "@/game/systems/input";

const KEY = "freedom-fly:settings";

interface PersistedSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  /** Steer with the cursor's offset from the screen center. */
  mouseSteering: boolean;
  volume: number;
}

const DEFAULTS: PersistedSettings = {
  soundEnabled: true,
  musicEnabled: true,
  mouseSteering: true,
  volume: 0.7,
};

interface SettingsState extends PersistedSettings {
  toggleSound: () => void;
  toggleMusic: () => void;
  toggleMouseSteering: () => void;
  setVolume: (v: number) => void;
}

const persist = (s: PersistedSettings) => saveJSON(KEY, s);

export const useSettingsStore = create<SettingsState>((set, get) => ({
  // Merge over defaults so settings saved by older versions (missing newer
  // keys) still hydrate completely.
  ...DEFAULTS,
  ...loadJSON<Partial<PersistedSettings>>(KEY, DEFAULTS),

  toggleSound: () => {
    const soundEnabled = !get().soundEnabled;
    set({ soundEnabled });
    persist({ ...get(), soundEnabled });
  },

  toggleMusic: () => {
    const musicEnabled = !get().musicEnabled;
    set({ musicEnabled });
    persist({ ...get(), musicEnabled });
  },

  toggleMouseSteering: () => {
    const mouseSteering = !get().mouseSteering;
    // Let go of whatever deflection the cursor was holding.
    if (!mouseSteering) setMouseAxes(0, 0);
    set({ mouseSteering });
    persist({ ...get(), mouseSteering });
  },

  setVolume: (v) => {
    const volume = Math.max(0, Math.min(1, v));
    set({ volume });
    persist({ ...get(), volume });
  },
}));
