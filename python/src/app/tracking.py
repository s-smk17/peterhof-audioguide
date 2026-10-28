"""Слежение за поездкой по GPS-отметкам.

Здесь только логика, без экрана и без GPS: на вход — отметки, на выход —
состояние («на маршруте», «вне маршрута») и события («доехали до остановки»,
«сошли с маршрута», «вернулись»). Поэтому её легко проверять тестами.
"""

from dataclasses import dataclass
from typing import Callable, Optional

import flet as ft

from app.geometry import find_stop_nearby, project_on_route

ON_ROUTE_METERS = 120
"""Ближе этого к линии маршрута — считаем, что человек на маршруте"""
OFF_ROUTE_METERS = 250
"""Дальше этого — сошёл с маршрута (зазор между порогами убирает «дребезг»)"""
OFF_ROUTE_CONFIRMATIONS = 3
"""Столько отметок подряд вне маршрута, прежде чем объявить об этом"""
MAX_ACCURACY_METERS = 75
"""Отметки с погрешностью хуже этой не используем для решений"""
DIRECTION_STEP_METERS = 30
"""Направление меняем, только сдвинувшись вдоль линии хотя бы на столько — иначе это шум GPS"""


@dataclass(frozen=True)
class Position:
    latitude: float
    longitude: float
    speed: Optional[float]
    """Скорость, м/с (None — неизвестна)"""


@ft.observable
@dataclass
class TrackingState:
    """То, что видно на экране. Компоненты сами перерисовываются при изменениях."""

    mode: str = "starting"
    """starting | background | foreground | denied | disabled | demo (вместо GPS — демо-поездка)"""
    approximate: bool = False
    status: str = "searching"
    """searching | on-route | off-route"""
    offset: Optional[float] = None
    """Расстояние до линии маршрута, м"""
    accuracy: Optional[float] = None
    """Погрешность последней отметки, м"""
    position: Optional[Position] = None
    along: Optional[float] = None
    """Положение вдоль маршрута, м"""
    direction: int = 1
    """1 — к метро «Проспект Ветеранов», −1 — к Ломоносову"""


class RouteTracker:
    def __init__(
        self,
        state: TrackingState,
        trigger_distance: Callable[[], float],
        on_stop_reached: Callable[[int, int], None],
        on_left_route: Callable[[], None],
        on_returned_to_route: Callable[[], None],
    ):
        self.state = state
        self._trigger_distance = trigger_distance
        self._on_stop_reached = on_stop_reached
        self._on_left_route = on_left_route
        self._on_returned_to_route = on_returned_to_route

        self._off_count = 0
        self._last_stop: Optional[int] = None
        self._direction_anchor: Optional[float] = None
        # Объявляли «вы не на маршруте» — тогда при возврате скажем «снова на маршруте»
        self._announced_left = False

    def reset(self, mode: str = "starting") -> None:
        """Слежение с чистого листа: при включении и выключении демо-поездки
        и при каждом её заезде «с начала»."""
        state = self.state
        state.mode = mode
        state.approximate = False
        state.status = "searching"
        state.offset = None
        state.accuracy = None
        state.position = None
        state.along = None
        state.direction = 1

        self._off_count = 0
        self._last_stop = None
        self._direction_anchor = None
        self._announced_left = False

    def handle_location(
        self,
        latitude: float,
        longitude: float,
        accuracy: Optional[float],
        speed: Optional[float],
    ) -> None:
        state = self.state
        accuracy = accuracy if accuracy is not None else MAX_ACCURACY_METERS
        projection = project_on_route(latitude, longitude)
        offset, along = projection.offset, projection.along

        position = Position(
            latitude, longitude, speed if speed is not None and speed >= 0 else None
        )

        state.offset = offset
        state.accuracy = accuracy
        state.position = position

        if accuracy > MAX_ACCURACY_METERS:
            return

        # Направление движения: смотрим, куда сместились вдоль линии
        if offset > OFF_ROUTE_METERS:
            # Вне маршрута направление не определить. Сравнивать первую отметку
            # после возврата с точкой в стороне нельзя — получится ложный разворот.
            self._direction_anchor = None
        elif self._direction_anchor is None:
            self._direction_anchor = along
        elif abs(along - self._direction_anchor) > DIRECTION_STEP_METERS:
            state.direction = 1 if along > self._direction_anchor else -1
            self._direction_anchor = along

        state.along = along

        # Погрешность GPS работает в пользу пользователя
        effective_offset = max(0.0, offset - accuracy / 2)
        previous_status = state.status
        status = previous_status

        if effective_offset <= ON_ROUTE_METERS:
            self._off_count = 0
            status = "on-route"
        elif effective_offset > OFF_ROUTE_METERS:
            self._off_count += 1

            # Первую отметку после запуска не ждём — сразу понятно, где человек
            if previous_status == "searching" or self._off_count >= OFF_ROUTE_CONFIRMATIONS:
                status = "off-route"

        if status != previous_status:
            state.status = status

            if status == "off-route":
                self._last_stop = None

                # Только если человек ехал по маршруту и сошёл с него. При запуске
                # приложения дома «вы не на маршруте» звучать не должно.
                if previous_status == "on-route":
                    self._announced_left = True
                    self._on_left_route()
            elif previous_status == "off-route" and self._announced_left:
                self._announced_left = False
                self._on_returned_to_route()

        # Сход ещё не подтверждён, но человек уже далеко от линии (или GPS
        # «прыгнул») — по такой отметке остановку не засчитываем
        if status != "on-route" or effective_offset > OFF_ROUTE_METERS:
            return

        stop = find_stop_nearby(along, accuracy, self._trigger_distance())

        if stop != self._last_stop:
            self._last_stop = stop
            if stop is not None:
                self._on_stop_reached(stop, state.direction)
