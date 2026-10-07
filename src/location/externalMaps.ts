import { Linking } from 'react-native';

type Coordinate = { latitude: number; longitude: number };

// Пробуем открыть приложение, а если его нет — сайт в браузере
function openWithFallback(appUrl: string, webUrl: string) {
  Linking.openURL(appUrl).catch(() => Linking.openURL(webUrl).catch(() => {}));
}

/** Пешеходный маршрут в Яндекс Картах (без from — от текущего места) */
export function openInYandexMaps(to: Coordinate, from?: Coordinate | null) {
  const start = from ? `${from.latitude},${from.longitude}` : '';
  const query = `rtext=${start}~${to.latitude},${to.longitude}&rtt=pd`;

  openWithFallback(
    `yandexmaps://maps.yandex.ru/?${query}`,
    `https://yandex.ru/maps/?${query}`
  );
}

/** Пешеходный маршрут в 2ГИС (без from — от текущего места) */
export function openIn2Gis(to: Coordinate, from?: Coordinate | null) {
  const path =
    'routeSearch/rsType/pedestrian' +
    (from ? `/from/${from.longitude},${from.latitude}` : '') +
    `/to/${to.longitude},${to.latitude}`;

  openWithFallback(`dgis://2gis.ru/${path}`, `https://2gis.ru/${path}`);
}
