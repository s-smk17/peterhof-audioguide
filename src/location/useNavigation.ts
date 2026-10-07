import { useMemo } from 'react';

import { routePoints } from '../data/route';
import { findNearestStop, findNextStop } from './routeGeometry';
import type { RouteTrackingState } from './useRouteTracking';
import { useWalkingRoute, type WalkingRoute } from './useWalkingRoute';

export type StopDistance = { index: number; distance: number };

export type Navigation = {
  /** Следующая остановка по ходу движения (когда на маршруте) */
  nextStop: StopDistance | null;
  /** Ближайшая остановка (когда вне маршрута) */
  nearestStop: StopDistance | null;
  walkingRoute: WalkingRoute | null;
  /** Остановка, которую выделяем на карте */
  targetIndex: number | null;
};

export function useNavigation(tracking: RouteTrackingState): Navigation {
  const { position, status, along, direction } = tracking;

  const nearestStop = useMemo(
    () =>
      status === 'off-route' && position
        ? findNearestStop(position.latitude, position.longitude)
        : null,
    [status, position?.latitude, position?.longitude]
  );

  const nextStop = useMemo(
    () =>
      status === 'on-route' && along != null
        ? findNextStop(along, direction)
        : null,
    [status, along, direction]
  );

  const nearestPoint =
    nearestStop != null ? routePoints[nearestStop.index] : null;

  const walkingRoute = useWalkingRoute(
    nearestPoint ? position : null,
    nearestPoint?.latitude != null && nearestPoint.longitude != null
      ? { latitude: nearestPoint.latitude, longitude: nearestPoint.longitude }
      : null
  );

  return {
    nextStop,
    nearestStop,
    walkingRoute,
    targetIndex: nearestStop?.index ?? nextStop?.index ?? null,
  };
}
