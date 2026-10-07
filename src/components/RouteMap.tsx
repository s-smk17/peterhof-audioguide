import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  Marker,
  type CameraRef,
  type LngLatBounds,
} from '@maplibre/maplibre-react-native';

import { routePoints } from '../data/route';
import { ROUTE_SHAPE } from '../data/routeShape';
import { makeStyles, useTheme } from '../theme';
import type { RouteMapProps as Props } from './routeMapTypes';

// Тайлы — бесплатные векторные карты OpenFreeMap (данные OpenStreetMap),
// стиль берётся из темы: светлый positron или тёмный dark

export function boundsOf(coordinates: [number, number][]): LngLatBounds {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;

  coordinates.forEach(([lon, lat]) => {
    west = Math.min(west, lon);
    east = Math.max(east, lon);
    south = Math.min(south, lat);
    north = Math.max(north, lat);
  });

  return [west, south, east, north];
}

const ROUTE_LINE: GeoJSON.Feature<GeoJSON.LineString> = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'LineString',
    coordinates: ROUTE_SHAPE.map(([lat, lon]) => [lon, lat]),
  },
};

const ROUTE_BOUNDS = boundsOf(
  ROUTE_SHAPE.map(([lat, lon]) => [lon, lat])
);


export default function RouteMap({
  tracking,
  completed,
  targetIndex,
  walkingRoute,
  fullscreen = false,
  style,
  onExpand,
  onInteractionChange,
}: Props) {
  const colors = useTheme();
  const styles = useStyles();
  const ACCENT = colors.accent;
  const DONE = colors.success;
  const WARN = colors.warn;
  const camera = useRef<CameraRef>(null);
  const [follow, setFollow] = useState(true);
  const { position, status } = tracking;

  const stops = useMemo<GeoJSON.FeatureCollection<GeoJSON.Point>>(
    () => ({
      type: 'FeatureCollection',
      features: routePoints.flatMap((point, index) =>
        point.latitude == null || point.longitude == null
          ? []
          : [
              {
                type: 'Feature' as const,
                id: index,
                properties: { done: completed.includes(index) },
                geometry: {
                  type: 'Point' as const,
                  coordinates: [point.longitude, point.latitude],
                },
              },
            ]
      ),
    }),
    [completed]
  );

  const walkLine = useMemo<GeoJSON.Feature<GeoJSON.LineString> | null>(
    () =>
      walkingRoute
        ? {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: walkingRoute.coordinates,
            },
          }
        : null,
    [walkingRoute]
  );

  const target = targetIndex != null ? routePoints[targetIndex] : null;

  // Камера: в пути — следуем за человеком, вне маршрута — показываем
  // и человека, и остановку, без GPS — весь маршрут
  useEffect(() => {
    if (!follow || !camera.current) return;

    const padding = { top: 50, right: 40, bottom: 50, left: 40 };

    if (!position) {
      camera.current.fitBounds(ROUTE_BOUNDS, { padding, duration: 600 });
      return;
    }

    if (status === 'off-route' && walkLine) {
      camera.current.fitBounds(
        boundsOf([
          [position.longitude, position.latitude],
          ...walkLine.geometry.coordinates.map(
            (c) => [c[0], c[1]] as [number, number]
          ),
        ]),
        { padding, duration: 800 }
      );
      return;
    }

    camera.current.easeTo({
      center: [position.longitude, position.latitude],
      zoom: fullscreen ? 15.5 : 14.5,
      duration: 1000,
    });
  }, [follow, position?.latitude, position?.longitude, status, walkLine]);

  return (
    <View
      style={[styles.container, style]}
      // Пока палец на карте, страница под ней не должна прокручиваться
      onTouchStart={() => onInteractionChange?.(true)}
      onTouchEnd={() => onInteractionChange?.(false)}
      onTouchCancel={() => onInteractionChange?.(false)}
    >
      <Map
        style={StyleSheet.absoluteFill}
        mapStyle={colors.mapStyle}
        logo={false}
        attribution
        attributionPosition={{ bottom: 6, left: 8 }}
        compass={fullscreen}
        dragPan
        touchZoom
        doubleTapZoom
        touchRotate={false}
        touchPitch={false}
        onRegionWillChange={(event) => {
          // Человек сам двигает карту — перестаём следовать за ним
          if (event.nativeEvent.userInteraction) setFollow(false);
        }}
      >
        <Camera
          ref={camera}
          initialViewState={{
            bounds: ROUTE_BOUNDS,
            padding: { top: 30, right: 30, bottom: 30, left: 30 },
          }}
        />

        <GeoJSONSource id="route" data={ROUTE_LINE}>
          <Layer
            type="line"
            id="route-glow"
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{
              'line-color': ACCENT,
              'line-width': 9,
              'line-opacity': 0.18,
            }}
          />
          <Layer
            type="line"
            id="route-line"
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{ 'line-color': ACCENT, 'line-width': 3.5 }}
          />
        </GeoJSONSource>

        {walkLine && (
          <GeoJSONSource id="walk" data={walkLine}>
            <Layer
              type="line"
              id="walk-line"
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              paint={{
                'line-color': WARN,
                'line-width': 3,
                'line-dasharray': [1.5, 1.5],
              }}
            />
          </GeoJSONSource>
        )}

        <GeoJSONSource id="stops" data={stops}>
          <Layer
            type="circle"
            id="stops-circle"
            paint={{
              'circle-radius': 5,
              'circle-color': [
                'case',
                ['get', 'done'],
                DONE,
                colors.mapBg,
              ],
              'circle-stroke-color': [
                'case',
                ['get', 'done'],
                DONE,
                ACCENT,
              ],
              'circle-stroke-width': 2,
            }}
          />
        </GeoJSONSource>

        {target?.latitude != null && target.longitude != null && (
          <Marker
            id="target"
            lngLat={[target.longitude, target.latitude]}
            anchor="bottom"
          >
            <View style={styles.targetWrap}>
              <View
                style={[
                  styles.targetLabel,
                  status === 'off-route' && { borderColor: WARN },
                ]}
              >
                <Text numberOfLines={1} style={styles.targetText}>
                  {target.name}
                </Text>
              </View>
              <View
                style={[
                  styles.targetPin,
                  status === 'off-route' && { backgroundColor: WARN },
                ]}
              />
            </View>
          </Marker>
        )}

        {position && (
          <Marker
            id="me"
            lngLat={[position.longitude, position.latitude]}
            anchor="center"
          >
            <View style={styles.meHalo}>
              <View style={styles.meDot} />
            </View>
          </Marker>
        )}
      </Map>

      <View style={styles.buttons}>
        {!follow && (
          <Pressable style={styles.mapButton} onPress={() => setFollow(true)}>
            <Text style={styles.mapButtonText}>⌖</Text>
          </Pressable>
        )}
        {onExpand && (
          <Pressable style={styles.mapButton} onPress={onExpand}>
            <Text style={styles.mapButtonText}>⤢</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  container: {
    overflow: 'hidden',
    backgroundColor: c.mapBg,
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

  meHalo: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: c.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  meDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: c.accent,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  targetWrap: {
    alignItems: 'center',
  },

  targetLabel: {
    maxWidth: 180,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.accent,
    marginBottom: 4,
  },

  targetText: {
    color: c.text,
    fontSize: 11,
    fontWeight: '700',
  },

  targetPin: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: c.accent,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
}));
