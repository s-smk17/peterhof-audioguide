import React from 'react';
import { Text, View } from 'react-native';

import { routePoints } from '../data/route';
import type { Navigation } from '../location/useNavigation';
import type { RouteTrackingState } from '../location/useRouteTracking';
import { makeStyles, useTheme } from '../theme';
import { formatDistance, formatDuration } from '../utils/format';

/** Что впереди: следующая остановка в пути или ближайшая, если вне маршрута */
export default function NavigationInfo({
  tracking,
  navigation,
}: {
  tracking: RouteTrackingState;
  navigation: Navigation;
}) {
  const colors = useTheme();
  const styles = useStyles();
  const { nextStop, nearestStop, walkingRoute } = navigation;

  if (tracking.status === 'off-route' && nearestStop) {
    const distance = walkingRoute?.distance ?? nearestStop.distance;
    const duration = walkingRoute?.duration ?? nearestStop.distance / 1.25;

    return (
      <View style={styles.box}>
        <Text style={[styles.label, { color: colors.warn }]}>
          БЛИЖАЙШАЯ ОСТАНОВКА 343Э
        </Text>
        <Text style={styles.title}>{routePoints[nearestStop.index].name}</Text>
        <Text style={styles.meta}>
          {formatDistance(distance)} пешком · ~{formatDuration(duration)}
          {walkingRoute && !walkingRoute.precise && ' · по прямой'}
        </Text>
      </View>
    );
  }

  if (tracking.status === 'on-route' && nextStop) {
    const speed = tracking.position?.speed;
    // ETA только когда реально едем, а не стоим на светофоре
    const moving = speed != null && speed > 2;

    return (
      <View style={styles.box}>
        <Text style={styles.label}>СЛЕДУЮЩАЯ ОСТАНОВКА</Text>
        <Text style={styles.title}>{routePoints[nextStop.index].name}</Text>
        <Text style={styles.meta}>
          {formatDistance(nextStop.distance)}
          {moving && ` · ~${formatDuration(nextStop.distance / speed)}`}
          {moving && ` · ${Math.round(speed * 3.6)} км/ч`}
        </Text>
      </View>
    );
  }

  if (tracking.status === 'on-route') {
    return (
      <View style={styles.box}>
        <Text style={styles.label}>КОНЕЧНАЯ</Text>
        <Text style={styles.title}>Маршрут пройден</Text>
      </View>
    );
  }

  return (
    <View style={styles.box}>
      <Text style={styles.label}>МАРШРУТ 343Э</Text>
      <Text style={styles.title}>Ломоносов → «Проспект Ветеранов»</Text>
      <Text style={styles.meta}>{routePoints.length} точек · 34 км</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  box: {
    padding: 16,
  },

  label: {
    color: c.accent,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.6,
    marginBottom: 5,
  },

  title: {
    color: c.text,
    fontSize: 17,
    fontWeight: '800',
  },

  meta: {
    color: c.muted,
    fontSize: 12,
    marginTop: 4,
  },
}));
