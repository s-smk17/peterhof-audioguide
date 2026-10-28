"""GPS: разрешения, режим работы и поток отметок для RouteTracker."""

import flet as ft
import flet_geolocator as ftg

from app.tracking import RouteTracker

Status = ftg.GeolocatorPermissionStatus

NOTIFICATION_TITLE = "Аудиогид Петергоф"
NOTIFICATION_TEXT = "Следим за маршрутом 343Э, чтобы вовремя начать рассказ"


class LocationService:
    def __init__(self, page: ft.Page, tracker: RouteTracker):
        self._page = page
        self._tracker = tracker
        # Поток отметок включается, только когда задан on_position_change —
        # поэтому сначала создаём без него, а подключаем после разрешений
        self._geo = ftg.Geolocator()
        self.suspended = False
        """Идёт демо-поездка: отметки настоящего GPS не нужны"""

    @property
    def _state(self):
        return self._tracker.state

    def _on_position(self, e: ftg.GeolocatorPositionChangeEvent) -> None:
        self._handle(e.position)

    def _handle(self, p: ftg.GeolocatorPosition) -> None:
        if self.suspended or p.latitude is None or p.longitude is None:
            return
        self._tracker.handle_location(p.latitude, p.longitude, p.accuracy, p.speed)

    def _on_error(self, e) -> None:
        if self.suspended:
            return
        message = str(e.data or "").lower()
        if "disabled" in message:
            self._state.mode = "disabled"
        elif "denied" in message:
            self._state.mode = "denied"

    def _configuration(self, status: Status) -> tuple[ftg.GeolocatorConfiguration, str]:
        """Максимальная точность: в автобусе нужны частые и точные отметки."""
        accuracy = ftg.GeolocatorPositionAccuracy.BEST_FOR_NAVIGATION

        if self._page.web:
            # В браузере фоновой геолокации нет
            return (
                ftg.GeolocatorWebConfiguration(
                    accuracy=accuracy, maximum_age=ft.Duration(milliseconds=0)
                ),
                "foreground",
            )

        if self._page.platform == ft.PagePlatform.ANDROID:
            # Уведомление в шторке — «служба переднего плана»: отметки идут и
            # с выключенным экраном, а система не закрывает приложение
            return (
                ftg.GeolocatorAndroidConfiguration(
                    accuracy=accuracy,
                    distance_filter=5,
                    interval_duration=ft.Duration(milliseconds=2000),
                    foreground_notification_config=ftg.ForegroundNotificationConfiguration(
                        notification_title=NOTIFICATION_TITLE,
                        notification_text=NOTIFICATION_TEXT,
                        notification_channel_name="Слежение за маршрутом",
                        notification_enable_wake_lock=True,
                        notification_set_ongoing=True,
                    ),
                ),
                "background",
            )

        if self._page.platform == ft.PagePlatform.IOS:
            always = status == Status.ALWAYS
            return (
                ftg.GeolocatorIosConfiguration(
                    accuracy=accuracy,
                    distance_filter=5,
                    activity_type=ftg.GeolocatorIosActivityType.AUTOMOTIVE_NAVIGATION,
                    pause_location_updates_automatically=False,
                    show_background_location_indicator=always,
                    allow_background_location_updates=always,
                ),
                "background" if always else "foreground",
            )

        return ftg.GeolocatorConfiguration(accuracy=accuracy, distance_filter=5), "foreground"

    async def start(self) -> None:
        if self.suspended:
            return
        state = self._state
        state.mode = "starting"

        def set_mode(mode: str) -> None:
            # Пока ждали ответа, могли включить демо-поездку — её режим не трогаем
            if not self.suspended:
                state.mode = mode

        try:
            if not await self._geo.is_location_service_enabled():
                set_mode("disabled")
                return

            status = await self._geo.get_permission_status()
            if status in (Status.DENIED, Status.UNABLE_TO_DETERMINE):
                status = await self._geo.request_permission()

            if status in (Status.DENIED, Status.DENIED_FOREVER):
                set_mode("denied")
                return

            configuration, mode = self._configuration(status)

            # Сразу показываем последнюю известную точку, пока ловится свежая
            if not self._page.web:
                try:
                    last = await self._geo.get_last_known_position()
                    if last:
                        self._handle(last)
                except Exception:
                    pass

            # Пока ждали разрешения, включили демо-поездку — GPS не нужен
            if self.suspended:
                return

            self._geo.configuration = configuration
            self._geo.on_position_change = self._on_position
            self._geo.on_error = self._on_error
            self._geo.update()
            state.mode = mode
        except Exception as error:
            if self.suspended:
                return
            message = str(error).lower()
            state.mode = "denied" if "denied" in message else "disabled"

    def stop(self) -> None:
        self._geo.on_position_change = None
        self._geo.on_error = None
        try:
            self._geo.update()
        except Exception:
            # GPS ещё не запускали
            pass

    async def open_settings(self) -> None:
        if self._page.web:
            return
        try:
            await self._geo.open_app_settings()
        except Exception:
            pass
