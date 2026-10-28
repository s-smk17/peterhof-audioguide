import { useCallback, useEffect, useRef, useState } from 'react';

import { pointAtAlong, ROUTE_LENGTH } from './routeGeometry';

export type DemoSpeed = 1 | 5 | 20;

/** Скорость автобуса при ×1, м/с (30 км/ч) */
export const BUS_SPEED = 30 / 3.6;
/** За одну отметку точка сдвигается не больше чем на столько, м — иначе
 * при ×20 можно «перепрыгнуть» остановку */
const MAX_STEP_METERS = 40;

export type DemoPoint = {
  latitude: number;
  longitude: number;
  /** м/с */
  speed: number;
};

export type DemoRide = {
  /** Пройдено от начала маршрута, м */
  along: number;
  paused: boolean;
  /** Доехали до конца маршрута */
  finished: boolean;
  /** Номер заезда: меняется при включении и «С начала» */
  session: number;
  pause: () => void;
  resume: () => void;
  restart: () => void;
};

/**
 * Демо-поездка: точка едет по линии маршрута с заданной скоростью и
 * отдаёт отметки, как настоящий GPS.
 */
export function useDemoRide(
  enabled: boolean,
  speed: DemoSpeed,
  onPoint: (point: DemoPoint) => void
): DemoRide {
  const [along, setAlong] = useState(0);
  const [paused, setPaused] = useState(false);
  const [session, setSession] = useState(0);
  const alongRef = useRef(0);
  const onPointRef = useRef(onPoint);
  onPointRef.current = onPoint;

  const finished = along >= ROUTE_LENGTH;

  const emit = useCallback(
    (value: number) => {
      const { latitude, longitude } = pointAtAlong(value);
      onPointRef.current({ latitude, longitude, speed: BUS_SPEED * speed });
    },
    [speed]
  );

  const restart = useCallback(() => {
    alongRef.current = 0;
    setAlong(0);
    setPaused(false);
    setSession((value) => value + 1);
  }, []);

  // Включили демо — едем с начала
  useEffect(() => {
    if (enabled) restart();
  }, [enabled, restart]);

  // Первая отметка заезда — сразу, не дожидаясь шага. setTimeout — чтобы
  // слежение за маршрутом успело начать новый заезд с чистого листа
  useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(() => emit(alongRef.current), 0);
    return () => clearTimeout(timer);
  }, [enabled, session]);

  useEffect(() => {
    if (!enabled || paused || finished) return;

    const metersPerSecond = BUS_SPEED * speed;
    const tickMs = Math.min(1000, (MAX_STEP_METERS / metersPerSecond) * 1000);

    const timer = setInterval(() => {
      const next = Math.min(
        alongRef.current + (metersPerSecond * tickMs) / 1000,
        ROUTE_LENGTH
      );
      alongRef.current = next;
      setAlong(next);
      emit(next);
    }, tickMs);

    return () => clearInterval(timer);
  }, [enabled, paused, finished, speed, emit, session]);

  return {
    along,
    paused,
    finished,
    session,
    pause: () => setPaused(true),
    resume: () => setPaused(false),
    restart,
  };
}

/** Всё, что нужно экранам для демо-поездки */
export type DemoControls = {
  enabled: boolean;
  speed: DemoSpeed;
  ride: DemoRide;
  setEnabled: (enabled: boolean) => void;
  setSpeed: (speed: DemoSpeed) => void;
};
