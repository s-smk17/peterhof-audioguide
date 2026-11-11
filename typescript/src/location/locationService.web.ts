import type { LocationObject } from 'expo-location';

// Веб-версия: в браузере нет фоновой геолокации, GPS работает, только пока
// вкладка открыта. Поэтому дополнительно не даём экрану погаснуть
// (Screen Wake Lock API), пока идёт слежение за маршрутом.

type Listener = (location: LocationObject) => void;

const listeners = new Set<Listener>();

function emit(location: LocationObject) {
  listeners.forEach((listener) => listener(location));
}

export function subscribeToLocation(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export type TrackingMode =
  | 'background'
  | 'foreground'
  | 'denied'
  | 'disabled'
  | 'unavailable'; // разрешено, но координаты не пришли (например, мешает VPN)

export type TrackingResult = {
  mode: TrackingMode;
  approximate: boolean;
};

function toLocationObject(position: GeolocationPosition): LocationObject {
  const { coords } = position;

  return {
    timestamp: position.timestamp,
    coords: {
      latitude: coords.latitude,
      longitude: coords.longitude,
      altitude: coords.altitude,
      accuracy: coords.accuracy,
      altitudeAccuracy: coords.altitudeAccuracy,
      heading: coords.heading,
      speed: coords.speed,
    },
  };
}

// Сначала просим точный GPS. С VPN и на компьютере без GPS браузер определяет
// место по Wi‑Fi и IP через сервер геолокации, а VPN его блокирует — тогда
// высокая точность даёт ошибку. Запасной вариант: грубое определение,
// дольше ждём и берём чуть более старую отметку.
const PRECISE: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 2000,
  timeout: 10_000,
};

const COARSE: PositionOptions = {
  enableHighAccuracy: false,
  maximumAge: 60_000,
  timeout: 30_000,
};

function getPosition(geolocation: Geolocation, options: PositionOptions) {
  return new Promise<GeolocationPosition | GeolocationPositionError>((resolve) =>
    geolocation.getCurrentPosition(resolve, resolve, options)
  );
}

let watchId: number | null = null;

export async function startTracking(): Promise<TrackingResult> {
  const geolocation =
    typeof navigator !== 'undefined' ? navigator.geolocation : undefined;

  // Нет API или страница открыта не по HTTPS
  if (!geolocation || (typeof window !== 'undefined' && !window.isSecureContext)) {
    return { mode: 'disabled', approximate: false };
  }

  stopWatch();

  // Первая отметка заодно показывает запрос разрешения
  let options = PRECISE;
  let first = await getPosition(geolocation, options);

  if ('code' in first && first.code !== first.PERMISSION_DENIED) {
    // Точное определение не вышло — пробуем грубое
    options = COARSE;
    first = await getPosition(geolocation, options);
  }

  let received = false;

  if ('code' in first) {
    if (first.code === first.PERMISSION_DENIED) {
      return { mode: 'denied', approximate: false };
    }
  } else {
    received = true;
    emit(toLocationObject(first));
  }

  // Слежение продолжаем и после неудачи: отметка может прийти позже
  // (тогда режим сам вернётся из «не определено» в рабочий)
  watchId = geolocation.watchPosition(
    (position) => emit(toLocationObject(position)),
    () => {},
    options
  );

  keepScreenOn();

  return { mode: received ? 'foreground' : 'unavailable', approximate: false };
}

function stopWatch() {
  if (watchId != null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}

export async function stopTracking() {
  stopWatch();
  releaseScreen();
}

// --- Экран не гаснет, пока гид работает ---

type WakeLock = { release: () => Promise<void> };

let wakeLock: WakeLock | null = null;
let wantWakeLock = false;

async function requestWakeLock() {
  const api = (navigator as Navigator & {
    wakeLock?: { request: (type: 'screen') => Promise<WakeLock> };
  }).wakeLock;

  if (!api || wakeLock || document.visibilityState !== 'visible') return;

  try {
    wakeLock = await api.request('screen');
  } catch {
    // Браузер отказал (энергосбережение и т. п.) — работаем без этого
  }
}

// Браузер снимает блокировку, когда вкладка уходит в фон — возвращаем
function onVisibilityChange() {
  if (document.visibilityState === 'visible' && wantWakeLock) {
    wakeLock = null;
    requestWakeLock();
  }
}

function keepScreenOn() {
  if (typeof document === 'undefined') return;

  if (!wantWakeLock) {
    wantWakeLock = true;
    document.addEventListener('visibilitychange', onVisibilityChange);
  }

  requestWakeLock();
}

function releaseScreen() {
  if (typeof document === 'undefined') return;

  wantWakeLock = false;
  document.removeEventListener('visibilitychange', onVisibilityChange);
  wakeLock?.release().catch(() => {});
  wakeLock = null;
}
