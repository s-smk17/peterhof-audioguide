"""Демо-поездка: точка едет по линии маршрута и отдаёт отметки, как настоящий GPS."""

import asyncio
from dataclasses import dataclass
from typing import Callable, Optional

import flet as ft

from app.geometry import ROUTE_LENGTH, point_at_along

BUS_SPEED = 30 / 3.6
"""Скорость автобуса при ×1, м/с (30 км/ч)"""
MAX_STEP_METERS = 40
"""За одну отметку точка сдвигается не больше чем на столько, м — иначе
при ×20 можно «перепрыгнуть» остановку"""
DEMO_SPEEDS = [1, 5, 20]


@ft.observable
@dataclass
class DemoState:
    enabled: bool = False
    speed: int = 5
    """×1 / ×5 / ×20"""
    paused: bool = False
    along: float = 0.0
    """Пройдено от начала маршрута, м"""
    session: int = 0
    """Номер заезда: меняется при включении и «С начала»"""

    @property
    def finished(self) -> bool:
        return self.along >= ROUTE_LENGTH


def tick_seconds(speed: int) -> float:
    """Как часто отдавать отметку: не реже раза в секунду и не дальше MAX_STEP_METERS."""
    return min(1.0, MAX_STEP_METERS / (BUS_SPEED * speed))


class DemoRide:
    def __init__(
        self,
        state: DemoState,
        on_point: Callable[[float, float, float], None],
        on_new_session: Callable[[], None],
    ):
        """on_point(широта, долгота, скорость м/с); on_new_session — заезд начался заново."""
        self.state = state
        self._on_point = on_point
        self._on_new_session = on_new_session
        self._task: Optional[asyncio.Task] = None

    def _emit(self) -> None:
        latitude, longitude = point_at_along(self.state.along)
        self._on_point(latitude, longitude, BUS_SPEED * self.state.speed)

    async def _run(self) -> None:
        state = self.state
        while state.enabled:
            step = tick_seconds(state.speed)
            await asyncio.sleep(step)
            if not state.enabled:
                return
            if state.paused or state.finished:
                continue
            state.along = min(state.along + BUS_SPEED * state.speed * step, ROUTE_LENGTH)
            self._emit()

    def restart(self) -> None:
        state = self.state
        state.along = 0.0
        state.paused = False
        state.session += 1
        self._on_new_session()
        self._emit()

    def set_enabled(self, enabled: bool) -> None:
        state = self.state
        if state.enabled == enabled:
            return
        state.enabled = enabled
        if enabled:
            self.restart()
            self._task = asyncio.get_running_loop().create_task(self._run())
        elif self._task:
            self._task.cancel()
            self._task = None

    def pause(self) -> None:
        self.state.paused = True

    def resume(self) -> None:
        self.state.paused = False
