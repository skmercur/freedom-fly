import { create } from "zustand";
import { loadJSON, saveJSON } from "@/lib/storage";

const KEY = "freedom-fly:settings";

interface PersistedSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  volume: number;
}

const DEFAULTS: PersistedSettings = {
  soundEnabled: true,
  musicEnabled: true,
  volume: 0.7,
};

interface SettingsState extends PersistedSettings {
  toggleSound: () => void;
  toggleMusic: () => void;
  setVolume: (v: number) => void;
}

const persist = (s: PersistedSettings) => saveJSON(KEY, s);

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...loadJSON<PersistedSettings>(KEY, DEFAULTS),

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

  setVolume: (v) => {
    const volume = Math.max(0, Math.min(1, v));
    set({ volume });
    persist({ ...get(), volume });
  },
}));
