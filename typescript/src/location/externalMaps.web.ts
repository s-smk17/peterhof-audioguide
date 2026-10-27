type Coordinate = { latitude: number; longitude: number };

// В браузере открываем сайты карт в новой вкладке. На телефоне с
// установленным приложением ссылка обычно сама откроется в нём.
function open(url: string) {
  window.open(url, '_blank', 'noopener');
}

/** Пешеходный маршрут в Яндекс Картах (без from — от текущего места) */
export function openInYandexMaps(to: Coordinate, from?: Coordinate | null) {
  const start = from ? `${from.latitude},${from.longitude}` : '';
  open(`https://yandex.ru/maps/?rtext=${start}~${to.latitude},${to.longitude}&rtt=pd`);
}

/** Пешеходный маршрут в 2ГИС (без from — от текущего места) */
export function openIn2Gis(to: Coordinate, from?: Coordinate | null) {
  const path =
    'routeSearch/rsType/pedestrian' +
    (from ? `/from/${from.longitude},${from.latitude}` : '') +
    `/to/${to.longitude},${to.latitude}`;

  open(`https://2gis.ru/${path}`);
}
