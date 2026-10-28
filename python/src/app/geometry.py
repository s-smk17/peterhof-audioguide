"""Геометрия маршрута: где человек относительно линии 343Э и остановок."""

import math
from dataclasses import dataclass
from typing import Optional

from app.data.route import ROUTE_POINTS
from app.data.route_shape import ROUTE_SHAPE

# Маршрут короткий (~35 км), поэтому достаточно плоской проекции вокруг
# его начала: ошибка на таких расстояниях — доли метра.
EARTH_RADIUS = 6371000.0
_LAT0 = math.radians(ROUTE_SHAPE[0][0])


def _to_xy(latitude: float, longitude: float) -> tuple[float, float]:
    return (
        math.radians(longitude) * EARTH_RADIUS * math.cos(_LAT0),
        math.radians(latitude) * EARTH_RADIUS,
    )


_SHAPE_XY = [_to_xy(lat, lon) for lat, lon in ROUTE_SHAPE]

# Расстояние от начала маршрута до каждой вершины линии
_CUMULATIVE = [0.0]
for _a, _b in zip(_SHAPE_XY, _SHAPE_XY[1:]):
    _CUMULATIVE.append(_CUMULATIVE[-1] + math.hypot(_b[0] - _a[0], _b[1] - _a[1]))

ROUTE_LENGTH = _CUMULATIVE[-1]


@dataclass(frozen=True)
class RouteProjection:
    offset: float
    """Расстояние от человека до линии маршрута, м"""
    along: float
    """Положение ближайшей точки линии, считая от начала маршрута, м"""


@dataclass(frozen=True)
class StopDistance:
    index: int
    distance: float


def project_on_route(latitude: float, longitude: float) -> RouteProjection:
    px, py = _to_xy(latitude, longitude)
    best_offset = math.inf
    best_along = 0.0

    for i in range(len(_SHAPE_XY) - 1):
        ax, ay = _SHAPE_XY[i]
        bx, by = _SHAPE_XY[i + 1]
        dx, dy = bx - ax, by - ay
        length_sq = dx * dx + dy * dy

        t = 0.0
        if length_sq > 0:
            t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / length_sq))

        offset = math.hypot(px - (ax + t * dx), py - (ay + t * dy))

        if offset < best_offset:
            best_offset = offset
            best_along = _CUMULATIVE[i] + t * math.sqrt(length_sq)

    return RouteProjection(offset=best_offset, along=best_along)


def point_at_along(along: float) -> tuple[float, float]:
    """Точка на линии маршрута в along метрах от начала (для демо-поездки): (широта, долгота)."""
    target = min(max(along, 0.0), ROUTE_LENGTH)
    i = 0
    while i < len(_CUMULATIVE) - 2 and _CUMULATIVE[i + 1] < target:
        i += 1

    segment = _CUMULATIVE[i + 1] - _CUMULATIVE[i]
    t = (target - _CUMULATIVE[i]) / segment if segment > 0 else 0.0
    lat1, lon1 = ROUTE_SHAPE[i]
    lat2, lon2 = ROUTE_SHAPE[i + 1]
    return lat1 + (lat2 - lat1) * t, lon1 + (lon2 - lon1) * t


STOP_ALONG: list[Optional[float]] = [
    project_on_route(p.latitude, p.longitude).along
    if p.latitude is not None and p.longitude is not None
    else None
    for p in ROUTE_POINTS
]
"""Положение каждой остановки вдоль маршрута, м (None — нет координат)"""


def find_next_stop(along: float, direction: int) -> Optional[StopDistance]:
    """Следующая остановка по ходу движения и расстояние до неё вдоль маршрута."""
    best: Optional[StopDistance] = None

    for index, stop_along in enumerate(STOP_ALONG):
        if stop_along is None:
            continue

        distance = (stop_along - along) * direction

        if distance > 0 and (best is None or distance < best.distance):
            best = StopDistance(index, distance)

    return best


def distance_in_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)

    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2) ** 2
    )

    return 2 * EARTH_RADIUS * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def find_nearest_stop(latitude: float, longitude: float) -> Optional[StopDistance]:
    """Ближайшая к человеку остановка по прямой."""
    best: Optional[StopDistance] = None

    for index, point in enumerate(ROUTE_POINTS):
        if point.latitude is None or point.longitude is None:
            continue

        distance = distance_in_meters(latitude, longitude, point.latitude, point.longitude)

        if best is None or distance < best.distance:
            best = StopDistance(index, distance)

    return best


def find_stop_nearby(along: float, accuracy: float, trigger_distance: float) -> Optional[int]:
    """Остановка, к которой человек подъехал ближе trigger_distance вдоль маршрута."""
    found: Optional[int] = None
    best = math.inf

    for index, stop_along in enumerate(STOP_ALONG):
        if stop_along is None:
            continue

        distance = abs(along - stop_along)
        window = trigger_distance + min(accuracy, 40)

        if distance <= window and distance < best:
            found = index
            best = distance

    return found
