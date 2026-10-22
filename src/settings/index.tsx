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

// Текущая поездка: какие рассказы уже включались сами. Отдельно от прогресса,
// чтобы на обратном пути и в следующий раз остановки снова звучали.
export type Trip = {
  /** Остановки, рассказ о которых уже запускался в этой поездке */
  played: number[];
  /** Куда едем: 1 — к метро, −1 — к Ломоносову */
  direction: 1 | -1;
  /** Когда доехали до последней остановки, мс */
  updatedAt: number;
};

/** Столько времени без новых остановок — и следующая поездка считается новой */
export const TRIP_GAP_MS = 60 * 60 * 1000;

export const EMPTY_TRIP: Trip = { played: [], direction: 1, updatedAt: 0 };

const TRIP_KEY = 'trip:v1';

export async function loadTrip(): Promise<Trip> {
  try {
    const raw = await AsyncStorage.getItem(TRIP_KEY);
    return raw ? { ...EMPTY_TRIP, ...JSON.parse(raw) } : EMPTY_TRIP;
  } catch {
    return EMPTY_TRIP;
  }
}

export function saveTrip(trip: Trip) {
  AsyncStorage.setItem(TRIP_KEY, JSON.stringify(trip)).catch(() => {});
}
