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
  /** Текст на красной кнопке */
  onDanger: string;
  glowA: string;
  glowB: string;
  glowC: string;
  mapStyle: string;
  mapBg: string;
};

/** «Петергоф: Балтика и золото» — тёмная тема */
export const darkPalette: Palette = {
  scheme: 'dark',
  bg: '#0C111C',
  glass: 'rgba(20, 28, 46, 0.72)',
  border: '#263550',
  text: '#F1F5F9',
  textSecondary: '#CBD5E1',
  muted: '#94A3B8',
  faint: '#64748B',
  fill: 'rgba(148, 163, 184, 0.1)',
  accent: '#D4A359',
  onAccent: '#080D17',
  accentSoft: 'rgba(212, 163, 89, 0.14)',
  success: '#2A9D8F',
  warn: '#D96B43',
  onWarn: '#080D17',
  danger: '#F07167',
  onDanger: '#080D17',
  glowA: 'rgba(59, 110, 200, 0.09)',
  glowB: 'rgba(212, 163, 89, 0.05)',
  glowC: 'rgba(42, 157, 143, 0.035)',
  mapStyle: 'https://tiles.openfreemap.org/styles/dark',
  mapBg: '#111827',
};

/** «Петергоф: Балтика и золото» — светлая тема (оттенки темнее, чтобы контраст текста был не ниже 4.5:1) */
export const lightPalette: Palette = {
  scheme: 'light',
  bg: '#F4F6F9',
  glass: 'rgba(255, 255, 255, 0.9)',
  border: 'rgba(15, 26, 44, 0.1)',
  text: '#0F1A2C',
  textSecondary: '#334155',
  muted: '#5B697D',
  faint: '#94A3B8',
  fill: 'rgba(15, 26, 44, 0.06)',
  accent: '#8A6224',
  onAccent: '#FFFFFF',
  accentSoft: 'rgba(158, 113, 43, 0.12)',
  success: '#1D766C',
  warn: '#B4532F',
  onWarn: '#FFFFFF',
  danger: '#B83232',
  onDanger: '#FFFFFF',
  glowA: 'rgba(59, 110, 200, 0.07)',
  glowB: 'rgba(212, 163, 89, 0.07)',
  glowC: 'rgba(42, 157, 143, 0.04)',
  mapStyle: 'https://tiles.openfreemap.org/styles/positron',
  mapBg: '#E9EDF2',
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
