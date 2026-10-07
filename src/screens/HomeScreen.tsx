import React, { useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import type { GuideAudio } from '../audio/useGuideAudio';
import { useScrollContentStyle } from '../components/layout';
import MapView from '../components/MapView';
import NavigationInfo from '../components/NavigationInfo';
import { Glass, Icon, TopBar } from '../components/ui';
import { routePoints } from '../data/route';
import type { Navigation } from '../location/useNavigation';
import type { RouteTrackingState } from '../location/useRouteTracking';
import { makeStyles, useTheme, type Palette } from '../theme';
import { formatDistance } from '../utils/format';

const { width } = Dimensions.get('window');

type RouteBadge = { label: string; color: string; hint: string };

export function getRouteBadge(
  tracking: RouteTrackingState,
  colors: Palette
): RouteBadge {
  switch (tracking.mode) {
    case 'denied':
      return {
        label: 'НЕТ ДОСТУПА К GPS',
        color: colors.danger,
        hint: 'Разрешите доступ к геолокации, чтобы гид работал сам',
      };
    case 'disabled':
      return {
        label: 'GPS ВЫКЛЮЧЕН',
        color: colors.danger,
        hint: 'Включите геолокацию в настройках телефона',
      };
  }

  if (tracking.status === 'off-route') {
    return {
      label: 'ВНЕ МАРШРУТА',
      color: colors.warn,
      hint: `До маршрута 343Э — ${formatDistance(tracking.offset ?? 0)}`,
    };
  }

  if (tracking.status === 'on-route') {
    return {
      label: 'НА МАРШРУТЕ',
      color: colors.accent,
      hint: 'Рассказ начнётся сам у каждой точки',
    };
  }

  return {
    label: 'ПОИСК GPS…',
    color: colors.muted,
    hint: 'Определяем, где вы находитесь',
  };
}

type Props = {
  tracking: RouteTrackingState;
  navigation: Navigation;
  completed: number[];
  audio: GuideAudio;
  onRetryGps: () => void;
  onOpenGuide: () => void;
  onExpandMap: () => void;
};

export default function HomeScreen({
  tracking,
  navigation,
  completed,
  audio,
  onRetryGps,
  onOpenGuide,
  onExpandMap,
}: Props) {
  const colors = useTheme();
  const styles = useStyles();
  const contentStyle = useScrollContentStyle();
  // Пока палец на карте, страница не прокручивается — иначе карту не подвигать
  const [mapTouched, setMapTouched] = useState(false);

  const badge = getRouteBadge(tracking, colors);
  const needsRetry = tracking.mode === 'denied' || tracking.mode === 'disabled';
  const progress = routePoints.length ? completed.length / routePoints.length : 0;
  const point = routePoints[audio.currentIndex];

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={contentStyle}
      scrollEnabled={!mapTouched}
    >
      <TopBar title="Добро пожаловать" subtitle="Маршрут 343Э · Петергоф" />

      <Glass style={[styles.status, { borderColor: badge.color }]}>
        <View style={[styles.dot, { backgroundColor: badge.color }]} />

        <View style={{ flex: 1 }}>
          <Text style={[styles.statusTitle, { color: badge.color }]}>
            {badge.label}
          </Text>
          <Text style={styles.statusHint}>{badge.hint}</Text>
          {tracking.approximate && (
            <Text style={styles.statusHint}>
              Включите «Точную геолокацию» для приложения — иначе точки могут
              срабатывать не вовремя
            </Text>
          )}
        </View>

        {needsRetry && (
          <Pressable style={styles.retry} onPress={onRetryGps}>
            <Text style={styles.retryText}>ПОВТОРИТЬ</Text>
          </Pressable>
        )}
      </Glass>

      <Glass style={styles.mapCard}>
        <MapView
          style={styles.map}
          tracking={tracking}
          completed={completed}
          targetIndex={navigation.targetIndex}
          walkingRoute={navigation.walkingRoute}
          onExpand={onExpandMap}
          onInteractionChange={setMapTouched}
        />

        <NavigationInfo tracking={tracking} navigation={navigation} />
      </Glass>

      <Pressable onPress={onOpenGuide} style={styles.hero}>
        <Image
          source={point?.image}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={400}
        />
        <View style={styles.heroShade} />

        <View style={styles.heroContent}>
          <Text style={styles.heroSmall}>
            ТОЧКА {audio.currentIndex + 1} · {audio.playing ? 'ИГРАЕТ' : 'АУДИОГИД'}
          </Text>
          <Text style={styles.heroTitle}>{point?.name ?? 'Петергоф'}</Text>

          <View style={styles.heroBottom}>
            <Text style={styles.heroHint}>Открыть плеер</Text>

            <Pressable
              style={styles.heroPlay}
              onPress={audio.toggle}
              hitSlop={8}
            >
              <Icon
                name={audio.playing ? 'pause' : 'play'}
                size={20}
                color="#061015"
              />
            </Pressable>
          </View>
        </View>
      </Pressable>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Ваш прогресс</Text>
          <Text style={styles.sectionSubtitle}>
            {completed.length} из {routePoints.length} точек
          </Text>
        </View>

        <Text style={styles.percent}>{Math.round(progress * 100)}%</Text>
      </View>

      <View style={styles.track}>
        <View
          style={[styles.fill, { width: `${Math.max(progress * 100, 3)}%` }]}
        />
      </View>
    </ScrollView>
  );
}

const useStyles = makeStyles((c) => ({
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    marginBottom: 14,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  statusTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
  },

  statusHint: {
    color: c.muted,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 3,
  },

  retry: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: c.fill,
  },

  retryText: {
    color: c.text,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },

  mapCard: {
    marginBottom: 18,
  },

  map: {
    height: 260,
  },

  hero: {
    height: width * 0.62,
    borderRadius: 26,
    overflow: 'hidden',
    marginBottom: 24,
    backgroundColor: c.fill,
  },

  heroShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 6, 10, 0.42)',
  },

  heroContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'flex-end',
  },

  // Текст поверх фото — всегда светлый, в любой теме
  heroSmall: {
    color: '#63E6FF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.8,
    marginBottom: 6,
  },

  heroTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 32,
    letterSpacing: -0.8,
  },

  heroBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },

  heroHint: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
  },

  heroPlay: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#63E6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 11,
  },

  sectionTitle: {
    color: c.text,
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 4,
  },

  sectionSubtitle: {
    color: c.muted,
    fontSize: 12,
  },

  percent: {
    color: c.accent,
    fontSize: 17,
    fontWeight: '800',
  },

  track: {
    height: 5,
    borderRadius: 5,
    backgroundColor: c.fill,
    overflow: 'hidden',
  },

  fill: {
    height: '100%',
    backgroundColor: c.accent,
    borderRadius: 5,
  },
}));
