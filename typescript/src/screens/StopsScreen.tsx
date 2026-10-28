import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';

import type { GuideAudio } from '../audio/useGuideAudio';
import { useScrollContentStyle } from '../components/layout';
import { Glass, Icon, TopBar } from '../components/ui';
import { routePoints } from '../data/route';
import { distanceInMeters } from '../location/routeGeometry';
import type { RouteTrackingState } from '../location/useRouteTracking';
import { makeStyles, useTheme } from '../theme';
import { formatDistance, matchesSearch } from '../utils/format';

export default function StopsScreen({
  audio,
  completed,
  tracking,
}: {
  audio: GuideAudio;
  completed: number[];
  tracking: RouteTrackingState;
}) {
  const colors = useTheme();
  const styles = useStyles();
  const contentStyle = useScrollContentStyle();
  const { position } = tracking;
  const [query, setQuery] = useState('');

  const shown = routePoints
    .map((point, index) => ({ point, index }))
    .filter(({ point }) => matchesSearch(point.name, query));

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={contentStyle}
    >
      <TopBar
        title="Маршрут"
        subtitle={`${routePoints.length} остановок · нажмите, чтобы слушать`}
      />

      <Glass style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>343Э</Text>
          <Text style={styles.headerSubtitle}>
            Ломоносов → метро «Проспект Ветеранов»
          </Text>
        </View>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {completed.length}/{routePoints.length}
          </Text>
        </View>
      </Glass>

      <View style={styles.search}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Поиск по названию"
          placeholderTextColor={colors.faint}
          autoCorrect={false}
          returnKeyType="search"
        />
        {query !== '' && (
          <Pressable onPress={() => setQuery('')} hitSlop={10}>
            <Text style={styles.searchClear}>✕</Text>
          </Pressable>
        )}
      </View>

      {shown.length === 0 && (
        <Text style={styles.empty}>Ничего не нашлось</Text>
      )}

      {shown.map(({ point, index }, shownIndex) => {
        const done = completed.includes(index);
        const current = index === audio.currentIndex;
        const playingNow = current && audio.playing;
        const isLast = shownIndex === shown.length - 1;
        const distance =
          position && point.latitude != null && point.longitude != null
            ? distanceInMeters(
                position.latitude,
                position.longitude,
                point.latitude,
                point.longitude
              )
            : null;

        return (
          <Pressable
            key={point.id}
            style={styles.row}
            onPress={() =>
              current ? audio.toggle() : audio.select(index, true)
            }
          >
            <View style={styles.line}>
              <View
                style={[
                  styles.dot,
                  done && styles.dotDone,
                  current && styles.dotCurrent,
                ]}
              >
                {done && !current ? (
                  <Text style={styles.check}>✓</Text>
                ) : (
                  <Text style={[styles.dotNumber, current && styles.dotNumberCurrent]}>
                    {index + 1}
                  </Text>
                )}
              </View>

              {!isLast && (
                <View style={[styles.connector, done && styles.connectorDone]} />
              )}
            </View>

            <View style={[styles.card, current && styles.cardCurrent]}>
              <Image
                source={point.image}
                style={styles.image}
                contentFit="cover"
              />

              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={2}>
                  {point.name}
                </Text>

                <Text style={styles.meta}>
                  {playingNow
                    ? 'ИГРАЕТ'
                    : current
                      ? 'ВЫБРАНА'
                      : done
                        ? 'ПРОСЛУШАНО'
                        : `ОСТАНОВКА ${String(index + 1).padStart(2, '0')}`}
                  {distance != null && ` · ${formatDistance(distance)} от вас`}
                </Text>
              </View>

              <View style={[styles.playButton, current && styles.playButtonCurrent]}>
                <Icon
                  name={playingNow ? 'pause' : 'play'}
                  size={13}
                  color={current ? colors.onAccent : colors.text}
                />
              </View>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const useStyles = makeStyles((c) => ({
  header: {
    padding: 19,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },

  headerTitle: {
    color: c.text,
    fontSize: 32,
    fontWeight: '900',
  },

  headerSubtitle: {
    color: c.muted,
    fontSize: 12,
    marginTop: 2,
  },

  badge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: c.accentSoft,
  },

  badgeText: {
    color: c.accent,
    fontWeight: '800',
    fontSize: 12,
  },

  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 46,
    paddingHorizontal: 14,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.glass,
  },

  searchIcon: {
    color: c.muted,
    fontSize: 18,
    fontWeight: '700',
  },

  searchInput: {
    flex: 1,
    height: '100%',
    color: c.text,
    fontSize: 15,
    // в браузере у поля ввода своя рамка при фокусе — убираем
    outlineStyle: 'none',
  } as object,

  searchClear: {
    color: c.muted,
    fontSize: 15,
    fontWeight: '800',
  },

  empty: {
    color: c.muted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },

  row: {
    flexDirection: 'row',
    minHeight: 96,
  },

  line: {
    width: 34,
    alignItems: 'center',
  },

  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.glass,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },

  dotDone: {
    backgroundColor: c.success,
    borderColor: c.success,
  },

  dotCurrent: {
    backgroundColor: c.accent,
    borderColor: c.accent,
  },

  dotNumber: {
    color: c.text,
    fontSize: 10,
    fontWeight: '800',
  },

  dotNumberCurrent: {
    color: c.onAccent,
  },

  check: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
  },

  connector: {
    width: 2,
    flex: 1,
    backgroundColor: c.fill,
    marginVertical: -1,
  },

  connectorDone: {
    backgroundColor: c.success,
    opacity: 0.5,
  },

  card: {
    flex: 1,
    marginLeft: 10,
    marginBottom: 12,
    padding: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.glass,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },

  cardCurrent: {
    borderColor: c.accent,
    backgroundColor: c.accentSoft,
  },

  image: {
    width: 64,
    height: 64,
    borderRadius: 13,
    backgroundColor: c.fill,
  },

  title: {
    color: c.text,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },

  meta: {
    color: c.muted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 5,
  },

  playButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: c.fill,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },

  playButtonCurrent: {
    backgroundColor: c.accent,
  },
}));
