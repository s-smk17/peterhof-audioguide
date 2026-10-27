import { useEffect, useRef, useState } from 'react';

import { distanceInMeters } from './routeGeometry';

// Пешеходная маршрутизация по данным OpenStreetMap (OSRM, профиль foot).
// Бесплатный сервер с ограничением по нагрузке — поэтому запросы редкие.
const ROUTER_URL = 'https://routing.openstreetmap.de/routed-foot/route/v1/foot';
// Новый запрос — только если человек сместился на столько метров
const REFETCH_AFTER_METERS = 60;

type Coordinate = { latitude: number; longitude: number };

export type WalkingRoute = {
  /** Линия пути [долгота, широта] */
  coordinates: [number, number][];
  /** Длина пути, м */
  distance: number;
  /** Время пешком, с */
  duration: number;
  /** false — сервис недоступен, показана прямая линия */
  precise: boolean;
};

// Средний шаг пешехода ~4,5 км/ч
const WALK_SPEED = 1.25;

function straightLine(from: Coordinate, to: Coordinate): WalkingRoute {
  const distance = distanceInMeters(
    from.latitude,
    from.longitude,
    to.latitude,
    to.longitude
  );

  return {
    coordinates: [
      [from.longitude, from.latitude],
      [to.longitude, to.latitude],
    ],
    distance,
    duration: distance / WALK_SPEED,
    precise: false,
  };
}

export function useWalkingRoute(
  from: Coordinate | null,
  to: Coordinate | null
) {
  const [route, setRoute] = useState<WalkingRoute | null>(null);
  const lastRequest = useRef<{ from: Coordinate; to: Coordinate } | null>(
    null
  );
  // Ответ применяем, только если он на самый свежий запрос
  const requestId = useRef(0);

  useEffect(() => () => void (requestId.current += 1), []);

  useEffect(() => {
    if (!from || !to) {
      lastRequest.current = null;
      requestId.current += 1;
      setRoute(null);
      return;
    }

    const previous = lastRequest.current;

    if (
      previous &&
      previous.to.latitude === to.latitude &&
      previous.to.longitude === to.longitude &&
      distanceInMeters(
        previous.from.latitude,
        previous.from.longitude,
        from.latitude,
        from.longitude
      ) < REFETCH_AFTER_METERS
    ) {
      return;
    }

    lastRequest.current = { from, to };
    const id = ++requestId.current;
    const url =
      `${ROUTER_URL}/${from.longitude},${from.latitude};` +
      `${to.longitude},${to.latitude}?overview=full&geometries=geojson`;

    // Сервер может «зависнуть» — тогда через 10 с рисуем прямую линию
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);

    fetch(url, { signal: controller.signal })
      .then((response) => response.json())
      .then((json) => {
        const best = json?.routes?.[0];
        if (!best) throw new Error('no route');

        if (id !== requestId.current) return;
        setRoute({
          coordinates: best.geometry.coordinates,
          distance: best.distance,
          duration: best.duration,
          precise: true,
        });
      })
      .catch(() => {
        if (id === requestId.current) setRoute(straightLine(from, to));
      })
      .finally(() => clearTimeout(timer));
  }, [from?.latitude, from?.longitude, to?.latitude, to?.longitude]);

  return route;
}
