import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { LocationObject } from 'expo-location';

import { projectOnRoute, STOP_ALONG } from './routeGeometry';
import {
  startTracking,
  stopTracking,
  subscribeToLocation,
  type TrackingMode,
} from './locationService';

// Ближе этого к линии маршрута — считаем, что человек на маршруте
const ON_ROUTE_METERS = 120;
// Дальше этого — сошёл с маршрута (зазор между порогами убирает «дребезг»)
const OFF_ROUTE_METERS = 250;
// Столько отметок подряд вне маршрута, прежде чем объявить об этом
const OFF_ROUTE_CONFIRMATIONS = 3;
// Отметки с погрешностью хуже этой не используем для решений
const MAX_ACCURACY_METERS = 75;

export type RouteStatus = 'searching' | 'on-route' | 'off-route';

export type RouteTrackingState = {
  mode: TrackingMode | 'starting';
  approximate: boolean;
  status: RouteStatus;
  /** Расстояние до линии маршрута, м */
  offset: number | null;
  /** Погрешность последней отметки, м */
  accuracy: number | null;
  /** Последняя отметка GPS */
  position: {
    latitude: number;
    longitude: number;
    /** Скорость, м/с (null — неизвестна) */
    speed: number | null;
  } | null;
  /** Положение вдоль маршрута, м */
  along: number | null;
  /** 1 — к метро «Проспект Ветеранов», −1 — к Ломоносову */
  direction: 1 | -1;
};

type Handlers = {
  /** За сколько метров вдоль маршрута до остановки она срабатывает */
  triggerDistance: number;
  /** direction — куда едем: 1 к метро, −1 к Ломоносову */
  onStopReached: (index: number, direction: 1 | -1) => void;
  onLeftRoute: () => void;
  onReturnedToRoute: () => void;
};

function findStopNearby(
  along: number,
  accuracy: number,
  triggerDistance: number
) {
  let found: number | null = null;
  let bestDistance = Infinity;

  for (let index = 0; index < STOP_ALONG.length; index++) {
    const stopAlong = STOP_ALONG[index];
    if (stopAlong == null) continue;

    const distance = Math.abs(along - stopAlong);
    const window = triggerDistance + Math.min(accuracy, 40);

    if (distance <= window && distance < bestDistance) {
      found = index;
      bestDistance = distance;
    }
  }

  return found;
}

export function useRouteTracking(handlers: Handlers) {
  const [state, setState] = useState<RouteTrackingState>({
    mode: 'starting',
    approximate: false,
    status: 'searching',
    offset: null,
    accuracy: null,
    position: null,
    along: null,
    direction: 1,
  });

  // Обработчики и счётчики живут в ref: отметки GPS приходят и в фоне,
  // вне цикла рендера React
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const statusRef = useRef<RouteStatus>('searching');
  const offCountRef = useRef(0);
  const lastStopRef = useRef<number | null>(null);
  const directionRef = useRef<1 | -1>(1);
  const directionAnchorRef = useRef<number | null>(null);
  // Объявляли «вы не на маршруте» — тогда при возврате скажем «снова на маршруте»
  const announcedLeftRef = useRef(false);
  const modeRef = useRef<RouteTrackingState['mode']>('starting');

  const handleLocation = useCallback((location: LocationObject) => {
    const { latitude, longitude } = location.coords;
    const accuracy = location.coords.accuracy ?? MAX_ACCURACY_METERS;
    const { offset, along } = projectOnRoute(latitude, longitude);

    const speed = location.coords.speed;
    const position = {
      latitude,
      longitude,
      speed: speed != null && speed >= 0 ? speed : null,
    };

    if (accuracy > MAX_ACCURACY_METERS) {
      setState((previous) => ({ ...previous, offset, accuracy, position }));
      return;
    }

    // Направление движения: смотрим, куда сместились вдоль линии
    // хотя бы на 30 м — иначе это шум GPS
    if (offset > OFF_ROUTE_METERS) {
      // Вне маршрута направление не определить. Сравнивать первую отметку
      // после возврата с точкой в стороне нельзя — получится ложный разворот.
      directionAnchorRef.current = null;
    } else if (directionAnchorRef.current == null) {
      directionAnchorRef.current = along;
    } else if (Math.abs(along - directionAnchorRef.current) > 30) {
      directionRef.current = along > directionAnchorRef.current ? 1 : -1;
      directionAnchorRef.current = along;
    }

    setState((previous) => ({
      ...previous,
      offset,
      accuracy,
      position,
      along,
      direction: directionRef.current,
    }));

    // Погрешность GPS работает в пользу пользователя
    const effectiveOffset = Math.max(0, offset - accuracy / 2);
    const previousStatus = statusRef.current;
    let status = previousStatus;

    if (effectiveOffset <= ON_ROUTE_METERS) {
      offCountRef.current = 0;
      status = 'on-route';
    } else if (effectiveOffset > OFF_ROUTE_METERS) {
      offCountRef.current += 1;

      // Первую отметку после запуска не ждём — сразу понятно, где человек
      if (
        previousStatus === 'searching' ||
        offCountRef.current >= OFF_ROUTE_CONFIRMATIONS
      ) {
        status = 'off-route';
      }
    }

    if (status !== previousStatus) {
      statusRef.current = status;
      setState((previous) => ({ ...previous, status }));

      if (status === 'off-route') {
        lastStopRef.current = null;

        // Только если человек ехал по маршруту и сошёл с него. При запуске
        // приложения дома «вы не на маршруте» звучать не должно.
        if (previousStatus === 'on-route') {
          announcedLeftRef.current = true;
          handlersRef.current.onLeftRoute();
        }
      } else if (previousStatus === 'off-route' && announcedLeftRef.current) {
        announcedLeftRef.current = false;
        handlersRef.current.onReturnedToRoute();
      }
    }

    // Сход ещё не подтверждён, но человек уже далеко от линии (или GPS
    // «прыгнул») — по такой отметке остановку не засчитываем
    if (status !== 'on-route' || effectiveOffset > OFF_ROUTE_METERS) return;

    const stop = findStopNearby(
      along,
      accuracy,
      handlersRef.current.triggerDistance
    );

    if (stop !== lastStopRef.current) {
      lastStopRef.current = stop;
      if (stop != null) {
        handlersRef.current.onStopReached(stop, directionRef.current);
      }
    }
  }, []);

  const start = useCallback(async () => {
    modeRef.current = 'starting';
    setState((previous) => ({ ...previous, mode: 'starting' }));

    try {
      const { mode, approximate } = await startTracking();
      modeRef.current = mode;
      setState((previous) => ({ ...previous, mode, approximate }));
    } catch {
      modeRef.current = 'disabled';
      setState((previous) => ({ ...previous, mode: 'disabled' }));
    }
  }, []);

  // Вернулись в приложение (например, из настроек, где включили геолокацию) —
  // пробуем снова, без нажатия «Повторить»
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (appState) => {
      if (
        appState === 'active' &&
        (modeRef.current === 'denied' || modeRef.current === 'disabled')
      ) {
        start();
      }
    });

    return () => subscription.remove();
  }, [start]);

  useEffect(() => {
    const unsubscribe = subscribeToLocation(handleLocation);
    start();

    return () => {
      unsubscribe();
      stopTracking();
    };
  }, [handleLocation, start]);

  return { ...state, retry: start };
}
