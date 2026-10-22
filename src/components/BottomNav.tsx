import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { makeStyles, useTheme } from '../theme';
import { Glass, Icon } from './ui';

export type Tab = 'home' | 'guide' | 'more' | 'route';

type Props = {
  tab: Tab;
  onChange: (tab: Tab) => void;
  /** Цвет метки на «Главной»: вне маршрута, нет GPS */
  homeAlert: string | null;
  guidePlaying: boolean;
};

export default function BottomNav({
  tab,
  onChange,
  homeAlert,
  guidePlaying,
}: Props) {
  const colors = useTheme();
  const styles = useStyles();

  const items: { id: Tab; icon: string; label: string; dot: string | null }[] =
    [
      { id: 'home', icon: 'home', label: 'Главная', dot: homeAlert },
      {
        id: 'guide',
        icon: 'guide',
        label: 'Гид',
        dot: guidePlaying && tab !== 'guide' ? colors.accent : null,
      },
      { id: 'more', icon: 'settings', label: 'Ещё', dot: null },
      { id: 'route', icon: 'route', label: 'Маршрут', dot: null },
    ];

  return (
    <Glass floating style={styles.bar}>
      {items.map((item) => {
        const active = tab === item.id;

        return (
          <Pressable
            key={item.id}
            onPress={() => onChange(item.id)}
            style={styles.item}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <View style={[styles.icon, active && styles.iconActive]}>
              <Icon
                name={item.icon}
                size={20}
                color={active ? colors.accent : colors.muted}
              />

              {item.dot && (
                <View style={[styles.dot, { backgroundColor: item.dot }]} />
              )}
            </View>

            <Text style={[styles.label, active && styles.labelActive]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </Glass>
  );
}

const useStyles = makeStyles((c) => ({
  bar: {
    height: 72,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
  },

  item: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },

  icon: {
    width: 35,
    height: 35,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconActive: {
    backgroundColor: c.accentSoft,
    borderColor: c.accentSoft,
  },

  dot: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: c.bg,
  },

  label: {
    color: c.faint,
    fontSize: 9,
    marginTop: 2,
  },

  labelActive: {
    color: c.text,
  },
}));
