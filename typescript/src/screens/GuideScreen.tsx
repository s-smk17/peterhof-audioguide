import React, { useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import type { GuideAudio } from '../audio/useGuideAudio';
import { useScrollContentStyle } from '../components/layout';
import { Icon, LookBadge } from '../components/ui';
import { routePoints } from '../data/route';
import { useSettings, type PlaybackRate } from '../settings';
import { makeStyles, useTheme } from '../theme';
import { formatTime, lookHint } from '../utils/format';

const { width } = Dimensions.get('window');
const COVER = Math.min(width - 56, 420);
const RATES: PlaybackRate[] = [1, 1.25, 1.5, 2];

/** Полоса прогресса, которую можно тянуть пальцем, как в музыкальных плеерах */
function SeekBar({
  currentTime,
  duration,
  onSeek,
}: {
  currentTime: number;
  duration: number;
  onSeek: (seconds: number) => void;
}) {
  const styles = useStyles();
  const [barWidth, setBarWidth] = useState(1);
  const [dragRatio, setDragRatio] = useState<number | null>(null);
  const state = useRef({ width: 1, duration: 0, onSeek, ratio: 0 });
  state.current.width = barWidth;
  state.current.duration = duration;
  state.current.onSeek = onSeek;

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event) => {
          const ratio = Math.min(
            Math.max(event.nativeEvent.locationX / state.current.width, 0),
            1
          );
          state.current.ratio = ratio;
          setDragRatio(ratio);
        },
        onPanResponderMove: (event) => {
          const ratio = Math.min(
            Math.max(event.nativeEvent.locationX / state.current.width, 0),
            1
          );
          state.current.ratio = ratio;
          setDragRatio(ratio);
        },
        onPanResponderRelease: () => {
          state.current.onSeek(state.current.ratio * state.current.duration);
          setDragRatio(null);
        },
        onPanResponderTerminate: () => setDragRatio(null),
      }),
    []
  );

  const ratio =
    dragRatio ?? (duration > 0 ? Math.min(currentTime / duration, 1) : 0);

  return (
    <View>
      <View
        style={styles.seekArea}
        onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
        {...responder.panHandlers}
      >
        <View style={styles.seekTrack} pointerEvents="none">
          <View style={[styles.seekFill, { width: `${ratio * 100}%` }]} />
        </View>
        <View
          pointerEvents="none"
          style={[
            styles.seekKnob,
            dragRatio != null && styles.seekKnobActive,
            { left: ratio * barWidth - (dragRatio != null ? 9 : 6) },
          ]}
        />
      </View>

      <View style={styles.times}>
        <Text style={styles.time}>
          {formatTime(dragRatio != null ? dragRatio * duration : currentTime)}
        </Text>
        <Text style={styles.time}>
          −{formatTime(Math.max(duration - ratio * duration, 0))}
        </Text>
      </View>
    </View>
  );
}

export default function GuideScreen({
  audio,
  completed,
  direction,
}: {
  audio: GuideAudio;
  completed: number[];
  /** Куда едем: от этого зависит «левое / правое окно» */
  direction: 1 | -1;
}) {
  const colors = useTheme();
  const styles = useStyles();
  const contentStyle = useScrollContentStyle();
  const { settings, update } = useSettings();
  const { currentIndex, playing } = audio;
  const point = routePoints[currentIndex];
  const look = lookHint(point.lookSide, direction);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < routePoints.length - 1;
  const upcoming = routePoints
    .map((stop, index) => ({ stop, index }))
    .slice(currentIndex + 1, currentIndex + 6);

  const nextRate =
    RATES[(RATES.indexOf(settings.playbackRate) + 1) % RATES.length];

  return (
    <View style={styles.screen}>
      {/* Размытая обложка на фоне — как в Яндекс Музыке */}
      <Image
        source={point.image}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        blurRadius={60}
        transition={500}
      />
      <LinearGradient
        colors={[
          colors.scheme === 'dark' ? 'rgba(5,9,13,0.55)' : 'rgba(242,245,247,0.55)',
          colors.bg,
        ]}
        locations={[0, 0.75]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={contentStyle}
      >
        <View style={styles.header}>
          <Text style={styles.headerSmall}>ИГРАЕТ ИЗ МАРШРУТА</Text>
          <Text style={styles.headerTitle}>343Э · Ломоносов → Ветеранов</Text>
        </View>

        <View style={styles.coverShadow}>
          <Image
            source={point.image}
            style={styles.cover}
            contentFit="cover"
            transition={300}
          />
        </View>

        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={2}>
              {point.name}
            </Text>
            <Text style={styles.subtitle}>
              Остановка {currentIndex + 1} из {routePoints.length}
            </Text>
          </View>

          {completed.includes(currentIndex) && (
            <View style={styles.donePill}>
              <Text style={styles.doneText}>✓ ПРОСЛУШАНО</Text>
            </View>
          )}
        </View>

        {look && (
          <View style={styles.look}>
            <LookBadge hint={look} />
          </View>
        )}

        <SeekBar
          currentTime={audio.currentTime}
          duration={audio.duration}
          onSeek={audio.seekTo}
        />

        <View style={styles.controls}>
          <Pressable
            style={[styles.control, !hasPrev && styles.disabled]}
            disabled={!hasPrev}
            onPress={() => audio.select(currentIndex - 1, playing)}
            hitSlop={6}
          >
            <Icon name="prev" size={24} />
          </Pressable>

          <Pressable
            style={styles.control}
            onPress={() => audio.seekBy(-15)}
            hitSlop={6}
          >
            <Text style={styles.skipText}>↺15</Text>
          </Pressable>

          <Pressable style={styles.play} onPress={audio.toggle}>
            <Icon
              name={playing ? 'pause' : 'play'}
              size={28}
              color={colors.onAccent}
            />
          </Pressable>

          <Pressable
            style={styles.control}
            onPress={() => audio.seekBy(15)}
            hitSlop={6}
          >
            <Text style={styles.skipText}>15↻</Text>
          </Pressable>

          <Pressable
            style={[styles.control, !hasNext && styles.disabled]}
            disabled={!hasNext}
            onPress={() => audio.select(currentIndex + 1, playing)}
            hitSlop={6}
          >
            <Icon name="next" size={24} />
          </Pressable>
        </View>

        <View style={styles.chips}>
          <Pressable
            style={styles.chip}
            onPress={() => update({ playbackRate: nextRate })}
          >
            <Text style={styles.chipValue}>{settings.playbackRate}×</Text>
            <Text style={styles.chipLabel}>скорость</Text>
          </Pressable>

          <Pressable
            style={[styles.chip, settings.autoPlay && styles.chipOn]}
            onPress={() => update({ autoPlay: !settings.autoPlay })}
          >
            <Text
              style={[styles.chipValue, settings.autoPlay && styles.chipValueOn]}
            >
              {settings.autoPlay ? 'Вкл' : 'Выкл'}
            </Text>
            <Text style={styles.chipLabel}>автозапуск</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>О МЕСТЕ</Text>
          <Text style={styles.cardText}>{point.description}</Text>
          <Text style={styles.credit}>
            Фото: {point.photoCredit.author} · {point.photoCredit.license} ·
            Wikimedia Commons
          </Text>
        </View>

        {upcoming.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Далее по маршруту</Text>

            {upcoming.map(({ stop, index }) => (
              <Pressable
                key={stop.id}
                style={styles.row}
                onPress={() => audio.select(index, true)}
              >
                <Image
                  source={stop.image}
                  style={styles.rowImage}
                  contentFit="cover"
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {stop.name}
                  </Text>
                  <Text style={styles.rowSub}>Остановка {index + 1}</Text>
                </View>
                <Icon name="play" size={14} color={colors.muted} />
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: {
    flex: 1,
  },

  look: {
    marginTop: -6,
    marginBottom: 16,
  },

  header: {
    alignItems: 'center',
    marginBottom: 22,
  },

  headerSmall: {
    color: c.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.8,
  },

  headerTitle: {
    color: c.text,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 3,
  },

  coverShadow: {
    alignSelf: 'center',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 14,
    backgroundColor: c.fill,
    marginBottom: 26,
  },

  cover: {
    width: COVER,
    height: COVER,
    borderRadius: 20,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },

  title: {
    color: c.text,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },

  subtitle: {
    color: c.muted,
    fontSize: 14,
    marginTop: 4,
  },

  donePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 100,
    backgroundColor: c.fill,
  },

  doneText: {
    color: c.success,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },

  seekArea: {
    height: 28,
    justifyContent: 'center',
  },

  seekTrack: {
    height: 4,
    borderRadius: 4,
    backgroundColor: c.fill,
    overflow: 'hidden',
  },

  seekFill: {
    height: '100%',
    backgroundColor: c.text,
  },

  seekKnob: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: c.text,
  },

  seekKnobActive: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },

  times: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  time: {
    color: c.muted,
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },

  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 22,
  },

  control: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },

  disabled: {
    opacity: 0.25,
  },

  skipText: {
    color: c.text,
    fontSize: 15,
    fontWeight: '800',
  },

  play: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  chips: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 22,
  },

  chip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: c.fill,
    alignItems: 'center',
  },

  chipOn: {
    backgroundColor: c.accentSoft,
  },

  chipValue: {
    color: c.text,
    fontSize: 15,
    fontWeight: '800',
  },

  chipValueOn: {
    color: c.accent,
  },

  chipLabel: {
    color: c.muted,
    fontSize: 10,
    marginTop: 2,
  },

  card: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: c.fill,
    marginBottom: 24,
  },

  cardLabel: {
    color: c.accent,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.8,
    marginBottom: 8,
  },

  cardText: {
    color: c.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },

  credit: {
    color: c.faint,
    fontSize: 10,
    marginTop: 12,
  },

  sectionTitle: {
    color: c.text,
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 10,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },

  rowImage: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: c.fill,
  },

  rowTitle: {
    color: c.text,
    fontSize: 15,
    fontWeight: '600',
  },

  rowSub: {
    color: c.muted,
    fontSize: 12,
    marginTop: 2,
  },
}));
