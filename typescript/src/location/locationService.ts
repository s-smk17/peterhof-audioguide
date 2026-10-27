import { Platform } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import Constants, { ExecutionEnvironment } from 'expo-constants';

// Задача фонового GPS. defineTask должен вызываться при загрузке модуля,
// поэтому этот файл импортируется в index.ts раньше App.
const LOCATION_TASK = 'peterhof-route-location';

type Listener = (location: Location.LocationObject) => void;

const listeners = new Set<Listener>();

function emit(location: Location.LocationObject) {
  listeners.forEach((listener) => listener(location));
}

TaskManager.defineTask<{ locations: Location.LocationObject[] }>(
  LOCATION_TASK,
  async ({ data, error }) => {
    if (error || !data) return;
    data.locations.forEach(emit);
  }
);

export function subscribeToLocation(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export type TrackingMode =
  | 'background' // работает и с выключенным экраном
  | 'foreground' // только пока приложение открыто
  | 'denied'
  | 'disabled'; // геолокация выключена в системе

export type TrackingResult = {
  mode: TrackingMode;
  /** Пользователь разрешил только приблизительную геолокацию */
  approximate: boolean;
};

// Максимальная точность: в автобусе нужны частые и точные отметки
const TRACKING_OPTIONS: Location.LocationOptions = {
  accuracy: Location.Accuracy.BestForNavigation,
  timeInterval: 2000,
  distanceInterval: 5,
};

let foregroundSubscription: Location.LocationSubscription | null = null;

export async function startTracking(): Promise<TrackingResult> {
  if (!(await Location.hasServicesEnabledAsync())) {
    return { mode: 'disabled', approximate: false };
  }

  const foreground = await Location.requestForegroundPermissionsAsync();

  if (foreground.status !== 'granted') {
    return { mode: 'denied', approximate: false };
  }

  const approximate =
    foreground.android?.accuracy === 'coarse' ||
    foreground.ios?.accuracy === 'reduced';

  if (Platform.OS === 'android') {
    // Системный диалог «Повысить точность геолокации» (Wi‑Fi и сотовые сети)
    await Location.enableNetworkProviderAsync().catch(() => {});
  }

  // Сразу показываем последнюю известную точку, пока ловится свежая
  Location.getLastKnownPositionAsync({ maxAge: 60_000 })
    .then((last) => last && emit(last))
    .catch(() => {});

  if (await startBackgroundUpdates()) {
    return { mode: 'background', approximate };
  }

  foregroundSubscription?.remove();
  foregroundSubscription = await Location.watchPositionAsync(
    TRACKING_OPTIONS,
    emit
  );

  return { mode: 'foreground', approximate };
}

async function startBackgroundUpdates() {
  try {
    // В Expo Go фоновой геолокации нет — не спрашиваем «Разрешить всегда»
    if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
      return false;
    }

    if (!(await TaskManager.isAvailableAsync())) return false;

    let background = await Location.getBackgroundPermissionsAsync();

    if (background.status !== 'granted' && background.canAskAgain) {
      background = await Location.requestBackgroundPermissionsAsync();
    }

    if (background.status !== 'granted') return false;

    if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK);
    }

    await Location.startLocationUpdatesAsync(LOCATION_TASK, {
      ...TRACKING_OPTIONS,
      activityType: Location.ActivityType.AutomotiveNavigation,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Аудиогид Петергоф',
        notificationBody: 'Следим за маршрутом 343Э, чтобы вовремя начать рассказ',
        notificationColor: '#63E6FF',
        killServiceOnDestroy: true,
      },
    });

    return true;
  } catch {
    // Например, в Expo Go фоновая геолокация недоступна
    return false;
  }
}

export async function stopTracking() {
  foregroundSubscription?.remove();
  foregroundSubscription = null;

  try {
    if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK);
    }
  } catch {
    // задача не была запущена
  }
}
