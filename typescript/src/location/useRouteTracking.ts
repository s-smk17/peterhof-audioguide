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
  /** demo — вместо GPS едет точка демо-поездки */
  mode: TrackingMode | 'starting' | 'demo';
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

const INITIAL: RouteTrackingState = {
  mode: 'starting',
  approximate: false,
  status: 'searching',
  offset: null,
  accuracy: null,
  position: null,
  along: null,
  direction: 1,
};

/**
 * demoSession: null — настоящий GPS; число — идёт демо-поездка (новое число —
 * новый заезд с начала, состояние слежения сбрасывается).
 */
export function useRouteTracking(handlers: Handlers, demoSession: number | null = null) {
  const [state, setState] = useState<RouteTrackingState>(INITIAL);

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
  const demoRef = useRef(false);

  const handleLocation = useCallback((location: LocationObject, fromDemo = false) => {
    // Во время демо-поездки отметки настоящего GPS не учитываем, и наоборот
    if (fromDemo !== demoRef.current) return;

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
    if (demoRef.current) return;
    modeRef.current = 'starting';
    setState((previous) => ({ ...previous, mode: 'starting' }));

    try {
      const { mode, approximate } = await startTracking();
      // Пока ждали разрешения, включили демо-поездку — GPS не нужен
      if (demoRef.current) {
        stopTracking();
        return;
      }
      modeRef.current = mode;
      setState((previous) => ({ ...previous, mode, approximate }));
    } catch {
      if (demoRef.current) return;
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
    const unsubscribe = subscribeToLocation((location) => handleLocation(location));

    return () => {
      unsubscribe();
      stopTracking();
    };
  }, [handleLocation]);

  // Запуск GPS или демо-поездки. При каждой смене — слежение с чистого листа
  useEffect(() => {
    statusRef.current = 'searching';
    offCountRef.current = 0;
    lastStopRef.current = null;
    directionRef.current = 1;
    directionAnchorRef.current = null;
    announcedLeftRef.current = false;
    demoRef.current = demoSession != null;

    if (demoSession != null) {
      stopTracking();
      modeRef.current = 'demo';
      setState({ ...INITIAL, mode: 'demo' });
    } else {
      setState(INITIAL);
      start();
    }
  }, [demoSession, start]);

  /** Отметка демо-поездки — обрабатывается так же, как отметка GPS */
  const feedDemo = useCallback(
    (point: { latitude: number; longitude: number; speed: number }) =>
      handleLocation(
        {
          timestamp: Date.now(),
          mocked: true,
          coords: {
            latitude: point.latitude,
            longitude: point.longitude,
            altitude: null,
            accuracy: 5,
            altitudeAccuracy: null,
            heading: null,
            speed: point.speed,
          },
        },
        true
      ),
    [handleLocation]
  );

  return { ...state, retry: start, feedDemo };
}
