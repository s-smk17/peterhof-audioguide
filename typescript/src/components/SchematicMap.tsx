import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, Text, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { routePoints } from '../data/route';
import { ROUTE_SHAPE } from '../data/routeShape';
import { makeStyles, useTheme } from '../theme';
import type { RouteMapProps } from './routeMapTypes';

// Упрощённая карта для Expo Go: без улиц, только трасса, остановки,
// человек и путь до остановки. Двигается пальцем, масштаб — щипком
// или кнопками.

const ROUTE_LNGLAT: [number, number][] = ROUTE_SHAPE.map(([lat, lon]) => [
  lon,
  lat,
]);

type Bounds = [west: number, south: number, east: number, north: number];

function boundsOf(points: [number, number][]): Bounds {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;

  points.forEach(([lon, lat]) => {
    west = Math.min(west, lon);
    east = Math.max(east, lon);
    south = Math.min(south, lat);
    north = Math.max(north, lat);
  });

  return [west, south, east, north];
}

// Квадрат вокруг точки: «радиус» в метрах
function around(lon: number, lat: number, meters: number): Bounds {
  const dLat = meters / 111320;
  const dLon = meters / (111320 * Math.cos((lat * Math.PI) / 180));
  return [lon - dLon, lat - dLat, lon + dLon, lat + dLat];
}

type View2D = { x: number; y: number; zoom: number };
const HOME: View2D = { x: 0, y: 0, zoom: 1 };

function touchDistance(touches: { pageX: number; pageY: number }[]) {
  const [a, b] = touches;
  return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
}

export default function SchematicMap({
  tracking,
  completed,
  targetIndex,
  walkingRoute,
  fullscreen = false,
  style,
  onExpand,
  onInteractionChange,
}: RouteMapProps) {
  const colors = useTheme();
  const styles = useStyles();
  const [size, setSize] = useState({ width: 0, height: 0 });
  // Сдвиг и масштаб поверх автоматического кадра; HOME — следуем за человеком
  const [view, setView] = useState<View2D>(HOME);
  const gesture = useRef({ start: HOME, pinch: 0 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const { position, status } = tracking;
  const offRoute = status === 'off-route';
  const following = view === HOME;

  const interactionRef = useRef(onInteractionChange);
  interactionRef.current = onInteractionChange;

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        // Не отдаём жест прокрутке страницы
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          gesture.current = { start: viewRef.current, pinch: 0 };
          interactionRef.current?.(true);
        },
        onPanResponderMove: (event, state) => {
          const touches = event.nativeEvent.touches;
          const start = gesture.current.start;

          if (touches.length >= 2) {
            const distance = touchDistance(touches);
            if (!gesture.current.pinch) gesture.current.pinch = distance;
            const zoom = Math.min(
              Math.max(start.zoom * (distance / gesture.current.pinch), 0.3),
              12
            );
            setView({ ...start, zoom });
            return;
          }

          if (Math.abs(state.dx) + Math.abs(state.dy) < 3) return;
          setView({
            zoom: start.zoom,
            x: start.x + state.dx,
            y: start.y + state.dy,
          });
        },
        onPanResponderRelease: () => interactionRef.current?.(false),
        onPanResponderTerminate: () => interactionRef.current?.(false),
      }),
    []
  );

  const bounds = useMemo<Bounds>(() => {
    if (!position) return boundsOf(ROUTE_LNGLAT);

    const me: [number, number] = [position.longitude, position.latitude];

    if (offRoute && walkingRoute) {
      return boundsOf([me, ...walkingRoute.coordinates]);
    }

    return around(me[0], me[1], fullscreen ? 2000 : 1200);
  }, [
    position?.latitude,
    position?.longitude,
    offRoute,
    walkingRoute,
    fullscreen,
  ]);

  // Проекция: долгота сжимается на cos(широты), пропорции сохраняются;
  // поверх — пользовательский сдвиг и масштаб относительно центра
  const project = useMemo(() => {
    const [west, south, east, north] = bounds;
    const k = Math.cos((((south + north) / 2) * Math.PI) / 180);
    const padding = 28;
    const spanX = Math.max((east - west) * k, 1e-6);
    const spanY = Math.max(north - south, 1e-6);
    const scale = Math.min(
      (size.width - padding * 2) / spanX,
      (size.height - padding * 2) / spanY
    );
    const offsetX = (size.width - spanX * scale) / 2;
    const offsetY = (size.height - spanY * scale) / 2;
    const cx = size.width / 2;
    const cy = size.height / 2;

    return (lon: number, lat: number) => {
      const x = offsetX + (lon - west) * k * scale;
      const y = offsetY + (north - lat) * scale;
      return {
        x: cx + (x - cx) * view.zoom + view.x,
        y: cy + (y - cy) * view.zoom + view.y,
      };
    };
  }, [bounds, size, view]);

  const toPoints = (coordinates: [number, number][]) =>
    coordinates
      .map(([lon, lat]) => {
        const { x, y } = project(lon, lat);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

  const zoomBy = (factor: number) =>
    setView((current) => ({
      ...current,
      zoom: Math.min(Math.max(current.zoom * factor, 0.3), 12),
    }));

  const target = targetIndex != null ? routePoints[targetIndex] : null;
  const targetXY =
    target?.latitude != null && target.longitude != null
      ? project(target.longitude, target.latitude)
      : null;
  const meXY = position ? project(position.longitude, position.latitude) : null;
  const ready = size.width > 0 && size.height > 0;
  const routePoints2D = ready ? toPoints(ROUTE_LNGLAT) : '';

  return (
    <View
      style={[styles.container, style]}
      onLayout={(event) => setSize(event.nativeEvent.layout)}
    >
      <View style={styles.canvas} {...responder.panHandlers}>
        {ready && (
          <Svg width={size.width} height={size.height}>
            <Polyline
              points={routePoints2D}
              fill="none"
              stroke={colors.accent}
              strokeOpacity={0.18}
              strokeWidth={9}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Polyline
              points={routePoints2D}
              fill="none"
              stroke={colors.accent}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {walkingRoute && (
              <Polyline
                points={toPoints(walkingRoute.coordinates)}
                fill="none"
                stroke={colors.warn}
                strokeWidth={3}
                strokeDasharray="5,5"
                strokeLinecap="round"
              />
            )}

            {routePoints.map((point, index) => {
              if (point.latitude == null || point.longitude == null) {
                return null;
              }
              const { x, y } = project(point.longitude, point.latitude);
              const done = completed.includes(index);

              return (
                <Circle
                  key={point.id}
                  cx={x}
                  cy={y}
                  r={4.5}
                  fill={done ? colors.success : colors.mapBg}
                  stroke={done ? colors.success : colors.accent}
                  strokeWidth={2}
                />
              );
            })}

            {targetXY && (
              <Circle
                cx={targetXY.x}
                cy={targetXY.y}
                r={7}
                fill={offRoute ? colors.warn : colors.accent}
                stroke="#FFFFFF"
                strokeWidth={2}
              />
            )}

            {meXY && (
              <>
                <Circle
                  cx={meXY.x}
                  cy={meXY.y}
                  r={13}
                  fill={colors.accent}
                  fillOpacity={0.25}
                />
                <Circle
                  cx={meXY.x}
                  cy={meXY.y}
                  r={6.5}
                  fill={colors.accent}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                />
              </>
            )}
          </Svg>
        )}
      </View>

      {target && targetXY && (
        <View
          pointerEvents="none"
          style={[
            styles.targetLabel,
            offRoute && { borderColor: colors.warn },
            { left: targetXY.x - 90, top: targetXY.y - 36 },
          ]}
        >
          <Text numberOfLines={1} style={styles.targetText}>
            {target.name}
          </Text>
        </View>
      )}

      <View style={styles.note} pointerEvents="none">
        <Text style={styles.noteText}>
          СХЕМА · полная карта — в нативной сборке
        </Text>
      </View>

      <View style={styles.buttons}>
        {onExpand && (
          <Pressable style={styles.mapButton} onPress={onExpand}>
            <Text style={styles.mapButtonText}>⤢</Text>
          </Pressable>
        )}
        {!following && (
          <Pressable style={styles.mapButton} onPress={() => setView(HOME)}>
            <Text style={styles.mapButtonText}>⌖</Text>
          </Pressable>
        )}
        <Pressable style={styles.mapButton} onPress={() => zoomBy(1.5)}>
          <Text style={styles.mapButtonText}>+</Text>
        </Pressable>
        <Pressable style={styles.mapButton} onPress={() => zoomBy(1 / 1.5)}>
          <Text style={styles.mapButtonText}>−</Text>
        </Pressable>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  container: {
    overflow: 'hidden',
    backgroundColor: c.mapBg,
  },

  canvas: {
    flex: 1,
  },

  targetLabel: {
    position: 'absolute',
    width: 180,
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.accent,
  },

  targetText: {
    color: c.text,
    fontSize: 11,
    fontWeight: '700',
  },

  note: {
    position: 'absolute',
    left: 10,
    bottom: 8,
  },

  noteText: {
    color: c.muted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
  },

  buttons: {
    position: 'absolute',
    top: 10,
    right: 10,
    gap: 8,
  },

  mapButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  mapButtonText: {
    color: c.text,
    fontSize: 18,
    fontWeight: '700',
  },
}));
