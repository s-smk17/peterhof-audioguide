import {
  createContext,
  createElement,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { StyleSheet, useColorScheme } from 'react-native';

export type Palette = {
  scheme: 'light' | 'dark';
  bg: string;
  /** Фон «стеклянных» карточек */
  glass: string;
  border: string;
  text: string;
  textSecondary: string;
  muted: string;
  faint: string;
  /** Подложка кнопок, дорожки прогресса */
  fill: string;
  accent: string;
  /** Текст и иконки на акцентном фоне */
  onAccent: string;
  accentSoft: string;
  success: string;
  warn: string;
  onWarn: string;
  danger: string;
  glowA: string;
  glowB: string;
  glowC: string;
  mapStyle: string;
  mapBg: string;
};

export const darkPalette: Palette = {
  scheme: 'dark',
  bg: '#05090D',
  glass: 'rgba(13, 20, 25, 0.72)',
  border: 'rgba(255,255,255,0.12)',
  text: '#F5F8FA',
  textSecondary: '#A5B0B6',
  muted: '#82909A',
  faint: '#5A6870',
  fill: 'rgba(255,255,255,0.08)',
  accent: '#63E6FF',
  onAccent: '#061015',
  accentSoft: 'rgba(99,230,255,0.13)',
  success: '#67D9A1',
  warn: '#FFB86B',
  onWarn: '#1A1004',
  danger: '#FF7A7A',
  glowA: 'rgba(36, 130, 255, 0.10)',
  glowB: 'rgba(126, 91, 255, 0.07)',
  glowC: 'rgba(49, 220, 210, 0.045)',
  mapStyle: 'https://tiles.openfreemap.org/styles/dark',
  mapBg: '#0B1217',
};

export const lightPalette: Palette = {
  scheme: 'light',
  bg: '#F2F5F7',
  glass: 'rgba(255, 255, 255, 0.88)',
  border: 'rgba(12, 35, 48, 0.09)',
  text: '#0B1A22',
  textSecondary: '#3B4C56',
  muted: '#687983',
  faint: '#A3B0B7',
  fill: 'rgba(12, 35, 48, 0.06)',
  accent: '#0093B0',
  onAccent: '#FFFFFF',
  accentSoft: 'rgba(0,147,176,0.11)',
  success: '#17955C',
  warn: '#D27509',
  onWarn: '#FFFFFF',
  danger: '#D6453D',
  glowA: 'rgba(36, 130, 255, 0.08)',
  glowB: 'rgba(126, 91, 255, 0.05)',
  glowC: 'rgba(0, 170, 190, 0.06)',
  mapStyle: 'https://tiles.openfreemap.org/styles/positron',
  mapBg: '#E8EDF0',
};

export type ThemePreference = 'system' | 'light' | 'dark';

const ThemeContext = createContext<Palette>(darkPalette);

export function ThemeProvider({
  preference,
  children,
}: {
  preference: ThemePreference;
  children: ReactNode;
}) {
  const system = useColorScheme();
  const scheme =
    preference === 'system' ? (system === 'light' ? 'light' : 'dark') : preference;

  return createElement(
    ThemeContext.Provider,
    { value: scheme === 'light' ? lightPalette : darkPalette },
    children
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

/** Стили, которые пересчитываются при смене темы */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (colors: Palette) => T
) {
  return function useStyles() {
    const colors = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}
