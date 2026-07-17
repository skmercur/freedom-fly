/** Typed, SSR-safe localStorage wrappers. */

const HIGH_SCORE_KEY = "freedom-fly:highscore";

const hasStorage = (): boolean =>
  typeof window !== "undefined" && !!window.localStorage;

export const loadHighScore = (): number => {
  if (!hasStorage()) return 0;
  const raw = window.localStorage.getItem(HIGH_SCORE_KEY);
  const n = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(n) ? n : 0;
};

export const saveHighScore = (score: number): void => {
  if (!hasStorage()) return;
  window.localStorage.setItem(HIGH_SCORE_KEY, String(Math.floor(score)));
};

export function loadJSON<T>(key: string, fallback: T): T {
  if (!hasStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJSON<T>(key: string, value: T): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota / serialization errors */
  }
}
