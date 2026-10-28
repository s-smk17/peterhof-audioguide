"""Связывает GPS, плеер, прогресс и настройки — как App.tsx в версии на TypeScript."""

import time
from dataclasses import dataclass, field
from typing import Optional

import flet as ft

from app.audio import BACK_ON_ROUTE_AUDIO, OFF_ROUTE_AUDIO, AudioState, GuideAudio
from app.data.route import ROUTE_POINTS
from app.demo import DemoRide, DemoState
from app.geometry import StopDistance, distance_in_meters, find_nearest_stop, find_next_stop
from app.location import LocationService
from app.settings import Settings, Storage, Trip, next_trip
from app.tracking import RouteTracker, TrackingState
from app.walking import REFETCH_AFTER_METERS, WalkingRoute, fetch_walking_route


@ft.observable
@dataclass
class Progress:
    completed: list[int] = field(default_factory=list)
    """Пройденные точки — переживают перезапуск приложения"""


@ft.observable
@dataclass
class WalkState:
    route: Optional[WalkingRoute] = None
    """Путь пешком до ближайшей остановки (когда человек вне маршрута)"""


@dataclass(frozen=True)
class Navigation:
    next_stop: Optional[StopDistance]
    """Следующая остановка по ходу движения (когда на маршруте)"""
    nearest_stop: Optional[StopDistance]
    """Ближайшая остановка (когда вне маршрута)"""
    target_index: Optional[int]
    """Остановка, которую выделяем на карте"""


def navigation_for(tracking: TrackingState) -> Navigation:
    position = tracking.position
    nearest = (
        find_nearest_stop(position.latitude, position.longitude)
        if tracking.status == "off-route" and position
        else None
    )
    next_stop = (
        find_next_stop(tracking.along, tracking.direction)
        if tracking.status == "on-route" and tracking.along is not None
        else None
    )
    target = nearest.index if nearest else next_stop.index if next_stop else None
    return Navigation(next_stop=next_stop, nearest_stop=nearest, target_index=target)


class Controller:
    def __init__(self, page: ft.Page):
        self.page = page
        self.settings = Settings()
        self.tracking = TrackingState()
        self.audio_state = AudioState()
        self.progress = Progress()
        self.walk = WalkState()

        self.storage = Storage()
        self.audio = GuideAudio(self.audio_state)
        self.trip = Trip()

        self.tracker = RouteTracker(
            self.tracking,
            trigger_distance=lambda: self.settings.trigger_distance,
            on_stop_reached=self._on_stop_reached,
            on_left_route=self._on_left_route,
            on_returned_to_route=self._on_returned_to_route,
        )
        self.location = LocationService(page, self.tracker)

        # Демо-поездка: своя «поездка» в памяти, настоящую и прогресс не трогает
        self.demo_state = DemoState()
        self.demo_trip = Trip()
        self.demo = DemoRide(
            self.demo_state,
            on_point=lambda lat, lon, speed: self.tracker.handle_location(lat, lon, 5, speed),
            on_new_session=self._on_demo_session,
        )

        self._walk_request: Optional[tuple[float, float, int]] = None
        self._walk_request_id = 0
        self.launcher = ft.UrlLauncher()
        # Подписчики хранятся по слабой ссылке — держим функцию в поле
        self._on_tracking_change = lambda *_: self._update_walking_route()
        self.tracking.subscribe(self._on_tracking_change)

    # --- запуск ---

    async def start(self) -> None:
        await self.storage.load_settings(self.settings)
        await self.audio.set_rate(self.settings.playback_rate)

        saved = await self.storage.load_progress()
        # Пока читали, могли уже доехать до остановки — объединяем
        self.progress.completed = sorted(set(saved) | set(self.progress.completed))

        trip = await self.storage.load_trip()
        if trip.updated_at > self.trip.updated_at:
            self.trip = trip

        await self.location.start()

    async def on_resume(self) -> None:
        # Вернулись в приложение (например, из настроек, где включили
        # геолокацию) — пробуем снова, без нажатия «Повторить»
        if self.tracking.mode in ("denied", "disabled"):
            await self.location.start()

    async def retry_gps(self) -> None:
        await self.location.start()

    # --- настройки ---

    async def update_settings(self, **changes) -> None:
        for name, value in changes.items():
            setattr(self.settings, name, value)
        if "playback_rate" in changes:
            await self.audio.set_rate(self.settings.playback_rate)
        await self.storage.save_settings(self.settings)

    async def reset_progress(self) -> None:
        self.progress.completed = []
        self.trip = Trip()
        await self.storage.save_progress([])
        await self.storage.save_trip(self.trip)

    # --- демо-поездка ---

    async def set_demo(self, enabled: bool) -> None:
        if enabled:
            self.location.suspended = True
            self.location.stop()
            self.demo.set_enabled(True)
        else:
            self.demo.set_enabled(False)
            self.location.suspended = False
            self.tracker.reset()
            await self.location.start()

    def _on_demo_session(self) -> None:
        # Новый заезд — слежение с чистого листа, рассказы снова запускаются сами
        self.tracker.reset("demo")
        self.demo_trip = Trip()
        self.audio.clear_queue()

    # --- события поездки ---

    def _on_stop_reached(self, index: int, direction: int) -> None:
        demo = self.demo_state.enabled
        trip = next_trip(
            self.demo_trip if demo else self.trip, index, direction, int(time.time() * 1000)
        )
        if trip is None:
            return

        if demo:
            self.demo_trip = trip
            self.page.run_task(self.audio.arrive_at, index, self.settings.auto_play)
            return

        self.trip = trip
        self.page.run_task(self.storage.save_trip, trip)

        if index not in self.progress.completed:
            self.progress.completed = [*self.progress.completed, index]
            self.page.run_task(self.storage.save_progress, list(self.progress.completed))

        self.page.run_task(self.audio.arrive_at, index, self.settings.auto_play)

    def _on_left_route(self) -> None:
        self.audio.clear_queue()
        if self.settings.route_announcements:
            self.page.run_task(self.audio.play_notice, OFF_ROUTE_AUDIO)

    def _on_returned_to_route(self) -> None:
        if self.settings.route_announcements:
            self.page.run_task(self.audio.play_notice, BACK_ON_ROUTE_AUDIO)

    # --- путь пешком до ближайшей остановки ---

    def _update_walking_route(self) -> None:
        navigation = navigation_for(self.tracking)
        position = self.tracking.position
        nearest = navigation.nearest_stop

        if not nearest or not position:
            if self._walk_request is not None:
                self._walk_request = None
                self._walk_request_id += 1
                self.walk.route = None
            return

        previous = self._walk_request
        if (
            previous
            and previous[2] == nearest.index
            and distance_in_meters(previous[0], previous[1], position.latitude, position.longitude)
            < REFETCH_AFTER_METERS
        ):
            return

        self._walk_request = (position.latitude, position.longitude, nearest.index)
        self._walk_request_id += 1
        request_id = self._walk_request_id
        stop = ROUTE_POINTS[nearest.index]

        async def fetch():
            route = await fetch_walking_route(
                position.latitude, position.longitude, stop.latitude, stop.longitude
            )
            # Ответ применяем, только если он на самый свежий запрос
            if request_id == self._walk_request_id:
                self.walk.route = route

        self.page.run_task(fetch)

    # --- внешние карты ---

    async def open_url(self, app_url: str, web_url: str) -> None:
        """Пробуем открыть приложение, а если его нет — сайт в браузере."""
        launcher = self.launcher
        if not self.page.web:
            try:
                if await launcher.can_launch_url(app_url):
                    await launcher.launch_url(app_url)
                    return
            except Exception:
                pass
        try:
            await launcher.launch_url(web_url)
        except Exception:
            pass

