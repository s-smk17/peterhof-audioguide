"""Пешеходный путь до ближайшей остановки.

Маршрутизация по данным OpenStreetMap (OSRM, профиль foot). Бесплатный
сервер с ограничением по нагрузке — поэтому запросы редкие.
"""

import asyncio
import json
import sys
from dataclasses import dataclass
from typing import Optional

from app.geometry import distance_in_meters

ROUTER_URL = "https://routing.openstreetmap.de/routed-foot/route/v1/foot"
REFETCH_AFTER_METERS = 60
"""Новый запрос — только если человек сместился на столько метров"""
WALK_SPEED = 1.25
"""Средний шаг пешехода ~4,5 км/ч, м/с"""
TIMEOUT_SECONDS = 10


@dataclass(frozen=True)
class WalkingRoute:
    coordinates: list[tuple[float, float]]
    """Линия пути: (широта, долгота)"""
    distance: float
    """Длина пути, м"""
    duration: float
    """Время пешком, с"""
    precise: bool
    """False — сервис недоступен, показана прямая линия"""


def straight_line(from_lat: float, from_lon: float, to_lat: float, to_lon: float) -> WalkingRoute:
    distance = distance_in_meters(from_lat, from_lon, to_lat, to_lon)
    return WalkingRoute(
        coordinates=[(from_lat, from_lon), (to_lat, to_lon)],
        distance=distance,
        duration=distance / WALK_SPEED,
        precise=False,
    )


def _ssl_context():
    # На Android у Python нет системных сертификатов — берём их из certifi.
    # ssl и urllib импортируем здесь: в браузерном Python (Pyodide) их может не быть.
    import ssl

    try:
        import certifi

        return ssl.create_default_context(cafile=certifi.where())
    except Exception:
        return None


def _fetch_blocking(url: str) -> dict:
    import urllib.request

    request = urllib.request.Request(url, headers={"User-Agent": "peterhof-audioguide"})
    with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS, context=_ssl_context()) as r:
        return json.loads(r.read().decode("utf-8"))


async def _fetch_json(url: str) -> dict:
    if sys.platform == "emscripten":
        # Сайт: Python работает в браузере (Pyodide), сеть — через fetch браузера
        from pyodide.http import pyfetch  # type: ignore

        response = await asyncio.wait_for(pyfetch(url), TIMEOUT_SECONDS)
        return await response.json()

    return await asyncio.to_thread(_fetch_blocking, url)


async def fetch_walking_route(
    from_lat: float, from_lon: float, to_lat: float, to_lon: float
) -> WalkingRoute:
    """Путь пешком; если сервер не ответил — прямая линия."""
    url = (
        f"{ROUTER_URL}/{from_lon},{from_lat};{to_lon},{to_lat}"
        "?overview=full&geometries=geojson"
    )

    try:
        data = await _fetch_json(url)
        best = data["routes"][0]
        return WalkingRoute(
            coordinates=[(lat, lon) for lon, lat in best["geometry"]["coordinates"]],
            distance=float(best["distance"]),
            duration=float(best["duration"]),
            precise=True,
        )
    except Exception:
        return straight_line(from_lat, from_lon, to_lat, to_lon)


def yandex_maps_urls(to_lat: float, to_lon: float, frm: Optional[tuple[float, float]]) -> tuple[str, str]:
    """Пешеходный маршрут в Яндекс Картах: (ссылка на приложение, ссылка на сайт)."""
    start = f"{frm[0]},{frm[1]}" if frm else ""
    query = f"rtext={start}~{to_lat},{to_lon}&rtt=pd"
    return f"yandexmaps://maps.yandex.ru/?{query}", f"https://yandex.ru/maps/?{query}"


def dgis_urls(to_lat: float, to_lon: float, frm: Optional[tuple[float, float]]) -> tuple[str, str]:
    """Пешеходный маршрут в 2ГИС: (ссылка на приложение, ссылка на сайт)."""
    path = (
        "routeSearch/rsType/pedestrian"
        + (f"/from/{frm[1]},{frm[0]}" if frm else "")
        + f"/to/{to_lon},{to_lat}"
    )
    return f"dgis://2gis.ru/{path}", f"https://2gis.ru/{path}"
