import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import maplibregl, {
  type GeoJSONSource,
  type LngLatBoundsLike,
  type Map as MapLibreMap,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

import { routePoints } from '../data/route';
import { ROUTE_SHAPE } from '../data/routeShape';
import { makeStyles, useTheme, type Palette as ThemeColors } from '../theme';
import type { RouteMapProps as Props } from './routeMapTypes';

// Веб-версия карты: тот же движок MapLibre, но его JS-сборка maplibre-gl
// вместо нативного модуля. Тайлы и стиль — те же, из темы.

type Bounds = [number, number, number, number];

function boundsOf(coordinates: [number, number][]): Bounds {
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

const ROUTE_LNGLAT = ROUTE_SHAPE.map(
  ([lat, lon]) => [lon, lat] as [number, number]
);

const ROUTE_LINE: GeoJSON.Feature<GeoJSON.LineString> = {
  type: 'Feature',
  properties: {},
  geometry: { type: 'LineString', coordinates: ROUTE_LNGLAT },
};

const ROUTE_BOUNDS = boundsOf(ROUTE_LNGLAT);

const EMPTY: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

type Layers = {
  stops: GeoJSON.FeatureCollection<GeoJSON.Point>;
  walk: GeoJSON.Feature<GeoJSON.LineString> | null;
  colors: ThemeColors;
};

// Добавляет источники и слои при первой загрузке стиля, дальше — только
// обновляет данные и цвета
function syncLayers(map: MapLibreMap, { stops, walk, colors }: Layers) {
  if (!map.getSource('route')) {
    map.addSource('route', { type: 'geojson', data: ROUTE_LINE });
    map.addLayer({
      id: 'route-glow',
      type: 'line',
      source: 'route',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-width': 9, 'line-opacity': 0.18 },
    });
    map.addLayer({
      id: 'route-line',
      type: 'line',
      source: 'route',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-width': 3.5 },
    });

    map.addSource('walk', { type: 'geojson', data: EMPTY });
    map.addLayer({
      id: 'walk-line',
      type: 'line',
      source: 'walk',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-width': 3, 'line-dasharray': [1.5, 1.5] },
    });

    map.addSource('stops', { type: 'geojson', data: EMPTY });
    map.addLayer({
      id: 'stops-circle',
      type: 'circle',
      source: 'stops',
      paint: { 'circle-radius': 5, 'circle-stroke-width': 2 },
    });
  }

  (map.getSource('walk') as GeoJSONSource).setData(walk ?? EMPTY);
  (map.getSource('stops') as GeoJSONSource).setData(stops);

  map.setPaintProperty('route-glow', 'line-color', colors.accent);
  map.setPaintProperty('route-line', 'line-color', colors.accent);
  map.setPaintProperty('walk-line', 'line-color', colors.warn);
  map.setPaintProperty('stops-circle', 'circle-color', [
    'case',
    ['get', 'done'],
    colors.success,
    colors.mapBg,
  ]);
  map.setPaintProperty('stops-circle', 'circle-stroke-color', [
    'case',
    ['get', 'done'],
    colors.success,
    colors.accent,
  ]);
}

function meElement(colors: ThemeColors) {
  const halo = document.createElement('div');
  Object.assign(halo.style, {
    width: '26px',
    height: '26px',
    borderRadius: '13px',
    background: colors.accentSoft,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  });

  const dot = document.createElement('div');
  Object.assign(dot.style, {
    width: '13px',
    height: '13px',
    borderRadius: '7px',
    background: colors.accent,
    border: '2px solid #FFFFFF',
    boxSizing: 'border-box',
  });

  halo.appendChild(dot);
  return halo;
}

function targetElement(name: string, color: string, colors: ThemeColors) {
  const wrap = document.createElement('div');
  Object.assign(wrap.style, {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    pointerEvents: 'none',
  });

  const label = document.createElement('div');
  label.textContent = name;
  Object.assign(label.style, {
    maxWidth: '180px',
    padding: '5px 9px',
    borderRadius: '10px',
    background: colors.glass,
    border: `1px solid ${color}`,
    marginBottom: '4px',
    color: colors.text,
    font: '700 11px system-ui, -apple-system, sans-serif',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    backdropFilter: 'blur(8px)',
  });

  const pin = document.createElement('div');
  Object.assign(pin.style, {
    width: '10px',
    height: '10px',
    borderRadius: '5px',
    background: color,
    border: '2px solid #FFFFFF',
    boxSizing: 'border-box',
  });

  wrap.append(label, pin);
  return wrap;
}

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
  const container = useRef<View>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [loaded, setLoaded] = useState(false);
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

  const layersRef = useRef<Layers>({ stops, walk: walkLine, colors });
  layersRef.current = { stops, walk: walkLine, colors };

  // Карта пересоздаётся при смене темы: у светлой и тёмной разные стили
  useEffect(() => {
    // В react-native-web ref на View — это DOM-элемент
    const host = container.current as unknown as HTMLElement | null;
    if (!host) return;

    // Карте нужен свой элемент: её CSS-класс задаёт position: relative и
    // перебивает классы react-native-web — контейнер схлопнулся бы в ноль.
    // Инлайн-стиль сильнее класса.
    const element = document.createElement('div');
    element.style.cssText = 'position:absolute;top:0;right:0;bottom:0;left:0';
    host.appendChild(element);

    const map = new maplibregl.Map({
      container: element,
      style: colors.mapStyle,
      bounds: ROUTE_BOUNDS as LngLatBoundsLike,
      fitBoundsOptions: { padding: 30 },
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    });

    map.touchZoomRotate.disableRotation();
    map.keyboard.disableRotation();

    map.on('load', () => {
      syncLayers(map, layersRef.current);
      setLoaded(true);
    });

    // Человек сам двигает карту — перестаём следовать за ним
    const stopFollowing = (event: { originalEvent?: unknown }) => {
      if (event.originalEvent) setFollow(false);
    };
    map.on('dragstart', stopFollowing);
    map.on('zoomstart', stopFollowing);

    mapRef.current = map;

    return () => {
      mapRef.current = null;
      setLoaded(false);
      map.remove();
      element.remove();
    };
  }, [colors.mapStyle, fullscreen]);

  // Размер контейнера мог поменяться (например, открыли полноэкранную карту)
  useEffect(() => {
    const element = container.current as unknown as HTMLElement | null;
    const map = mapRef.current;
    if (!element || !map || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => map.resize());
    observer.observe(element);
    return () => observer.disconnect();
  }, [loaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (map && loaded) syncLayers(map, { stops, walk: walkLine, colors });
  }, [loaded, stops, walkLine, colors]);

  // Маркер «я»
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !position) return;

    const marker = new maplibregl.Marker({
      element: meElement(colors),
      anchor: 'center',
    })
      .setLngLat([position.longitude, position.latitude])
      .addTo(map);

    return () => {
      marker.remove();
    };
  }, [loaded, position?.latitude, position?.longitude, colors]);

  // Маркер выделенной остановки
  const target = targetIndex != null ? routePoints[targetIndex] : null;

  useEffect(() => {
    const map = mapRef.current;
    if (!map || target?.latitude == null || target.longitude == null) return;

    const color = status === 'off-route' ? colors.warn : colors.accent;
    const marker = new maplibregl.Marker({
      element: targetElement(target.name, color, colors),
      anchor: 'bottom',
    })
      .setLngLat([target.longitude, target.latitude])
      .addTo(map);

    return () => {
      marker.remove();
    };
  }, [loaded, target, status, colors]);

  // Камера: в пути — следуем за человеком, вне маршрута — показываем
  // и человека, и остановку, без GPS — весь маршрут
  useEffect(() => {
    const map = mapRef.current;
    if (!follow || !map || !loaded) return;

    const padding = { top: 50, right: 40, bottom: 50, left: 40 };

    if (!position) {
      map.fitBounds(ROUTE_BOUNDS as LngLatBoundsLike, {
        padding,
        duration: 600,
      });
      return;
    }

    if (status === 'off-route' && walkLine) {
      map.fitBounds(
        boundsOf([
          [position.longitude, position.latitude],
          ...walkLine.geometry.coordinates.map(
            (c) => [c[0], c[1]] as [number, number]
          ),
        ]) as LngLatBoundsLike,
        { padding, duration: 800 }
      );
      return;
    }

    map.easeTo({
      center: [position.longitude, position.latitude],
      zoom: fullscreen ? 15.5 : 14.5,
      duration: 1000,
    });
  }, [
    follow,
    loaded,
    position?.latitude,
    position?.longitude,
    status,
    walkLine,
  ]);

  return (
    <View
      style={[styles.container, style]}
      // Пока палец на карте, страница под ней не должна прокручиваться
      onTouchStart={() => onInteractionChange?.(true)}
      onTouchEnd={() => onInteractionChange?.(false)}
      onTouchCancel={() => onInteractionChange?.(false)}
    >
      <View ref={container} style={styles.map} />

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

  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
