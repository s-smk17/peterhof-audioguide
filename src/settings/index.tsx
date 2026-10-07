import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ThemePreference } from '../theme';

export type PlaybackRate = 1 | 1.25 | 1.5 | 2;
export type TriggerTiming = 'early' | 'normal' | 'late';

export type Settings = {
  theme: ThemePreference;
  /** Сам запускать рассказ у остановки */
  autoPlay: boolean;
  /** Голосом сообщать «вы не на маршруте» / «вы снова на маршруте» */
  routeAnnouncements: boolean;
  playbackRate: PlaybackRate;
  /** Насколько заранее начинать рассказ до остановки */
  triggerTiming: TriggerTiming;
};

/** Расстояние до остановки вдоль маршрута, с которого начинается рассказ, м */
export const TRIGGER_DISTANCE: Record<TriggerTiming, number> = {
  early: 250,
  normal: 120,
  late: 50,
};

const DEFAULTS: Settings = {
  theme: 'system',
  autoPlay: true,
  routeAnnouncements: true,
  playbackRate: 1,
  triggerTiming: 'normal',
};

const STORAGE_KEY = 'settings:v1';

type SettingsContextValue = {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
};

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULTS,
  update: () => {},
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setSettings({ ...DEFAULTS, ...JSON.parse(raw) });
      })
      .catch(() => {});
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((previous) => {
      const next = { ...previous, ...patch };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, update }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}

// Пройденные точки — отдельно, чтобы прогресс переживал перезапуск
const PROGRESS_KEY = 'progress:v1';

export async function loadProgress(): Promise<number[]> {
  try {
    const raw = await AsyncStorage.getItem(PROGRESS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveProgress(completed: number[]) {
  AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(completed)).catch(() => {});
}
