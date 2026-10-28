import React, { type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';

import { makeStyles, useTheme } from '../theme';
import type { LookHint } from '../utils/format';

export function Glass({
  children,
  style,
  floating = false,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Плавает поверх прокрутки (нижняя панель, мини-плеер) */
  floating?: boolean;
}) {
  const colors = useTheme();
  const styles = useStyles();

  // В браузере размытие фона (backdrop-filter) пересчитывается на каждом
  // кадре прокрутки и тормозит её на телефонах. Карточкам в списке оно почти
  // ничего не даёт — фон и так полупрозрачный. Оставляем только плавающим.
  if (Platform.OS === 'web' && !floating) {
    return <View style={[styles.glass, style]}>{children}</View>;
  }

  return (
    <BlurView intensity={30} tint={colors.scheme} style={[styles.glass, style]}>
      {children}
    </BlurView>
  );
}

export function BackgroundGlow() {
  const styles = useStyles();

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.glowA} />
      <View style={styles.glowB} />
      <View style={styles.glowC} />
    </View>
  );
}

const ICONS: Record<string, string> = {
  home: '⌂',
  route: '⌁',
  guide: '◉',
  settings: '⚙',
  play: '▶',
  pause: 'Ⅱ',
  prev: '⏮',
  next: '⏭',
  arrow: '›',
  check: '✓',
};

export function Icon({
  name,
  size = 22,
  color,
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  const colors = useTheme();

  return (
    <Text
      style={{
        color: color ?? colors.text,
        fontSize: size,
        fontWeight: '700',
        lineHeight: size + 3,
      }}
    >
      {ICONS[name] ?? '•'}
    </Text>
  );
}

export function TopBar({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  const styles = useStyles();

  return (
    <View style={styles.topBar}>
      <View style={{ flex: 1 }}>
        <Text style={styles.eyebrow}>PETERHOF AUDIO</Text>
        <Text style={styles.topTitle}>{title}</Text>
        {subtitle && <Text style={styles.topSubtitle}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

export function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const styles = useStyles();

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      hitSlop={8}
      onPress={() => onChange(!value)}
      style={[styles.switch, value && styles.switchOn]}
    >
      <View style={[styles.switchKnob, value && styles.switchKnobOn]} />
    </Pressable>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const styles = useStyles();

  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const active = option.value === value;

        return (
          <Pressable
            key={String(option.value)}
            onPress={() => onChange(option.value)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Заметная плашка «Смотрите в левое окно» со стрелкой.
 * onPhoto — поверх фото: цвета не зависят от темы.
 */
export function LookBadge({ hint, onPhoto }: { hint: LookHint; onPhoto?: boolean }) {
  const colors = useTheme();
  const styles = useStyles();
  const fg = onPhoto ? '#061015' : colors.onAccent;
  const bg = onPhoto ? '#63E6FF' : colors.accent;

  return (
    <View style={[styles.look, { backgroundColor: bg }]}>
      {/* Кружок со стрелкой — в обратных цветах, чтобы стрелку было видно издалека */}
      <View style={[styles.lookArrow, { backgroundColor: fg }]}>
        <Text style={[styles.lookArrowText, { color: bg }]}>{hint.arrow}</Text>
      </View>
      <Text style={[styles.lookText, { color: fg }]}>{hint.text}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  glass: {
    overflow: 'hidden',
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 24,
  },

  glowA: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 280,
    backgroundColor: c.glowA,
    top: -100,
    right: -90,
  },

  glowB: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 260,
    backgroundColor: c.glowB,
    top: 330,
    left: -160,
  },

  glowC: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 240,
    backgroundColor: c.glowC,
    bottom: 100,
    right: -150,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },

  eyebrow: {
    color: c.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2.2,
    marginBottom: 5,
  },

  topTitle: {
    color: c.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
  },

  topSubtitle: {
    color: c.muted,
    fontSize: 13,
    marginTop: 3,
  },

  switch: {
    width: 48,
    height: 28,
    borderRadius: 28,
    backgroundColor: c.fill,
    padding: 3,
    justifyContent: 'center',
  },

  switchOn: {
    backgroundColor: c.accentSoft,
  },

  switchKnob: {
    width: 22,
    height: 22,
    borderRadius: 22,
    backgroundColor: c.faint,
  },

  switchKnobOn: {
    backgroundColor: c.accent,
    alignSelf: 'flex-end',
  },

  segmented: {
    flexDirection: 'row',
    backgroundColor: c.fill,
    borderRadius: 14,
    padding: 3,
  },

  segment: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 11,
    alignItems: 'center',
  },

  segmentActive: {
    backgroundColor: c.scheme === 'dark' ? 'rgba(255,255,255,0.12)' : '#FFFFFF',
  },

  segmentText: {
    color: c.muted,
    fontSize: 12,
    fontWeight: '700',
  },

  segmentTextActive: {
    color: c.text,
  },

  look: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 10,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 16,
    borderRadius: 100,
  },

  lookArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  lookArrowText: {
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 21,
  },

  lookText: {
    fontSize: 15,
    fontWeight: '800',
  },
}));
