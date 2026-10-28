"""Настройки, прогресс и текущая поездка. Всё хранится на устройстве."""

import json
from dataclasses import asdict, dataclass, field, fields

import flet as ft

TRIGGER_DISTANCE = {"early": 250, "normal": 120, "late": 50}
"""Расстояние до остановки вдоль маршрута, с которого начинается рассказ, м"""

PLAYBACK_RATES = [1.0, 1.25, 1.5, 2.0]

LISTENED_SHARE = 0.8
"""Точка считается прослушанной, когда рассказ дослушан хотя бы до этой доли"""

TRIP_GAP_MS = 60 * 60 * 1000
"""Столько времени без новых остановок — и следующая поездка считается новой"""

# Ключи те же, что в версии на TypeScript
SETTINGS_KEY = "settings:v1"
PROGRESS_KEY = "progress:v1"
TRIP_KEY = "trip:v1"


@ft.observable
@dataclass
class Settings:
    theme: str = "system"
    """system | light | dark"""
    auto_play: bool = True
    """Сам запускать рассказ у остановки"""
    route_announcements: bool = True
    """Голосом сообщать «вы не на маршруте» / «вы снова на маршруте»"""
    playback_rate: float = 1.0
    trigger_timing: str = "normal"
    """early | normal | late — насколько заранее начинать рассказ"""

    @property
    def trigger_distance(self) -> float:
        return TRIGGER_DISTANCE.get(self.trigger_timing, TRIGGER_DISTANCE["normal"])


# В хранилище — имена полей как в TypeScript (camelCase)
_SETTINGS_JSON = {
    "theme": "theme",
    "auto_play": "autoPlay",
    "route_announcements": "routeAnnouncements",
    "playback_rate": "playbackRate",
    "trigger_timing": "triggerTiming",
}


@dataclass
class Trip:
    """Текущая поездка: какие рассказы уже включались сами.

    Отдельно от прогресса, чтобы на обратном пути и в следующий раз
    остановки снова звучали.
    """

    played: list[int] = field(default_factory=list)
    direction: int = 1
    """1 — к метро, −1 — к Ломоносову"""
    updated_at: int = 0
    """Когда доехали до последней остановки, мс"""


class Storage:
    """Обёртка над SharedPreferences: ошибки хранилища не ломают приложение."""

    def __init__(self):
        self._prefs = ft.SharedPreferences()

    async def _get_json(self, key: str):
        try:
            raw = await self._prefs.get(key)
            return json.loads(raw) if raw else None
        except Exception:
            return None

    async def _set_json(self, key: str, value) -> None:
        try:
            await self._prefs.set(key, json.dumps(value))
        except Exception:
            pass

    async def load_settings(self, settings: Settings) -> None:
        saved = await self._get_json(SETTINGS_KEY)
        if not isinstance(saved, dict):
            return
        for f in fields(Settings):
            key = _SETTINGS_JSON[f.name]
            if key in saved:
                value = saved[key]
                if f.name == "playback_rate":
                    value = float(value)
                setattr(settings, f.name, value)

    async def save_settings(self, settings: Settings) -> None:
        await self._set_json(
            SETTINGS_KEY,
            {_SETTINGS_JSON[f.name]: getattr(settings, f.name) for f in fields(Settings)},
        )

    async def load_progress(self) -> list[int]:
        saved = await self._get_json(PROGRESS_KEY)
        return [int(i) for i in saved] if isinstance(saved, list) else []

    async def save_progress(self, completed: list[int]) -> None:
        await self._set_json(PROGRESS_KEY, list(completed))

    async def load_trip(self) -> Trip:
        saved = await self._get_json(TRIP_KEY)
        if not isinstance(saved, dict):
            return Trip()
        return Trip(
            played=[int(i) for i in saved.get("played", [])],
            direction=int(saved.get("direction", 1)),
            updated_at=int(saved.get("updatedAt", 0)),
        )

    async def save_trip(self, trip: Trip) -> None:
        data = asdict(trip)
        await self._set_json(
            TRIP_KEY,
            {"played": data["played"], "direction": data["direction"], "updatedAt": data["updated_at"]},
        )


def next_trip(trip: Trip, index: int, direction: int, now_ms: int) -> "Trip | None":
    """Доехали до остановки: новая поездка или None, если рассказ уже звучал.

    Давно не было остановок или поехали обратно — это новая поездка,
    и все рассказы снова запускаются сами.
    """
    if now_ms - trip.updated_at > TRIP_GAP_MS or trip.direction != direction:
        trip = Trip(played=[], direction=direction, updated_at=now_ms)

    if index in trip.played:
        return None

    return Trip(played=[*trip.played, index], direction=direction, updated_at=now_ms)
