import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import type { GuideAudio } from '../audio/useGuideAudio';
import { routePoints } from '../data/route';
import { makeStyles } from '../theme';
import { formatTime } from '../utils/format';
import { Glass, Icon } from './ui';

export default function MiniPlayer({
  audio,
  onOpen,
}: {
  audio: GuideAudio;
  onOpen: () => void;
}) {
  const styles = useStyles();
  const { currentIndex, playing, currentTime, duration } = audio;
  const point = routePoints[currentIndex];
  const progress = duration > 0 ? Math.min(currentTime / duration, 1) : 0;

  return (
    <Glass style={styles.player}>
      <Pressable style={styles.body} onPress={onOpen}>
        <View style={styles.artwork}>
          <Image
            source={point?.image}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={250}
          />
        </View>

        <View style={styles.info}>
          <Text style={styles.label}>
            {playing ? 'СЕЙЧАС ИГРАЕТ' : 'НА ПАУЗЕ'} · ТОЧКА {currentIndex + 1}
          </Text>
          <Text numberOfLines={1} style={styles.title}>
            {point?.name ?? 'Петергоф'}
          </Text>
          <Text style={styles.sub}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </Text>
        </View>
      </Pressable>

      <Pressable style={styles.button} onPress={audio.toggle} hitSlop={8}>
        <Icon name={playing ? 'pause' : 'play'} size={17} />
      </Pressable>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
    </Glass>
  );
}

const useStyles = makeStyles((c) => ({
  player: {
    height: 70,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 7,
  },

  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  artwork: {
    width: 56,
    height: 56,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: c.fill,
  },

  info: {
    flex: 1,
    paddingHorizontal: 11,
  },

  label: {
    color: c.accent,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  title: {
    color: c.text,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },

  sub: {
    color: c.muted,
    fontSize: 10,
    marginTop: 2,
  },

  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.fill,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },

  track: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 0,
    height: 2,
    backgroundColor: c.fill,
  },

  fill: {
    height: '100%',
    backgroundColor: c.accent,
  },
}));
