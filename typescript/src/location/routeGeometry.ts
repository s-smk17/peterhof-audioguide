import { routePoints } from '../data/route';
import { ROUTE_SHAPE } from '../data/routeShape';

// Маршрут — короткий (~35 км), поэтому достаточно плоской проекции
// вокруг его начала: ошибка на таких расстояниях — доли метра.
const EARTH_RADIUS = 6371000;
const LAT0 = (ROUTE_SHAPE[0][0] * Math.PI) / 180;

type XY = { x: number; y: number };

function toXY(latitude: number, longitude: number): XY {
  return {
    x: ((longitude * Math.PI) / 180) * EARTH_RADIUS * Math.cos(LAT0),
    y: ((latitude * Math.PI) / 180) * EARTH_RADIUS,
  };
}

const SHAPE_XY = ROUTE_SHAPE.map(([lat, lon]) => toXY(lat, lon));

// Расстояние от начала маршрута до каждой вершины линии
const CUMULATIVE: number[] = SHAPE_XY.reduce<number[]>((acc, point, i) => {
  if (i === 0) return [0];
  const prev = SHAPE_XY[i - 1];
  acc.push(acc[i - 1] + Math.hypot(point.x - prev.x, point.y - prev.y));
  return acc;
}, []);

export const ROUTE_LENGTH = CUMULATIVE[CUMULATIVE.length - 1];

export type RouteProjection = {
  /** Расстояние от пользователя до линии маршрута, м */
  offset: number;
  /** Положение ближайшей точки линии, считая от начала маршрута, м */
  along: number;
};

export function projectOnRoute(
  latitude: number,
  longitude: number
): RouteProjection {
  const p = toXY(latitude, longitude);
  let best: RouteProjection = { offset: Infinity, along: 0 };

  for (let i = 0; i < SHAPE_XY.length - 1; i++) {
    const a = SHAPE_XY[i];
    const b = SHAPE_XY[i + 1];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSq = dx * dx + dy * dy;

    const t =
      lengthSq === 0
        ? 0
        : Math.max(
            0,
            Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq)
          );

    const offset = Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));

    if (offset < best.offset) {
      best = {
        offset,
        along: CUMULATIVE[i] + t * Math.sqrt(lengthSq),
      };
    }
  }

  return best;
}

/** Точка на линии маршрута в along метрах от начала (для демо-поездки) */
export function pointAtAlong(along: number): { latitude: number; longitude: number } {
  const target = Math.min(Math.max(along, 0), ROUTE_LENGTH);
  let i = 0;
  while (i < CUMULATIVE.length - 2 && CUMULATIVE[i + 1] < target) i++;

  const segment = CUMULATIVE[i + 1] - CUMULATIVE[i];
  const t = segment > 0 ? (target - CUMULATIVE[i]) / segment : 0;
  const [lat1, lon1] = ROUTE_SHAPE[i];
  const [lat2, lon2] = ROUTE_SHAPE[i + 1];

  return {
    latitude: lat1 + (lat2 - lat1) * t,
    longitude: lon1 + (lon2 - lon1) * t,
  };
}

/** Положение каждой остановки вдоль маршрута, м (null — нет координат) */
export const STOP_ALONG: (number | null)[] = routePoints.map((point) =>
  point.latitude != null && point.longitude != null
    ? projectOnRoute(point.latitude, point.longitude).along
    : null
);

/** Следующая остановка по ходу движения и расстояние до неё вдоль маршрута */
export function findNextStop(along: number, direction: 1 | -1) {
  let next: { index: number; distance: number } | null = null;

  for (let index = 0; index < STOP_ALONG.length; index++) {
    const stopAlong = STOP_ALONG[index];
    if (stopAlong == null) continue;

    const distance = (stopAlong - along) * direction;

    if (distance > 0 && (next == null || distance < next.distance)) {
      next = { index, distance };
    }
  }

  return next;
}

export function distanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Ближайшая к человеку остановка по прямой */
export function findNearestStop(latitude: number, longitude: number) {
  let nearest: { index: number; distance: number } | null = null;

  routePoints.forEach((point, index) => {
    if (point.latitude == null || point.longitude == null) return;

    const distance = distanceInMeters(
      latitude,
      longitude,
      point.latitude,
      point.longitude
    );

    if (nearest == null || distance < nearest.distance) {
      nearest = { index, distance };
    }
  });

  return nearest as { index: number; distance: number } | null;
}
