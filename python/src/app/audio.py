"""Плеер аудиогида: рассказы об остановках и служебные фразы."""

import asyncio
from dataclasses import dataclass

import flet as ft
import flet_audio as fta

from app.data.route import ROUTE_POINTS

OFF_ROUTE_AUDIO = "audio/off-route.mp3"
BACK_ON_ROUTE_AUDIO = "audio/back-on-route.mp3"

LOAD_TIMEOUT = 5
"""Сколько ждать загрузки записи, с"""


@ft.observable
@dataclass
class AudioState:
    """То, что видно на экране."""

    current_index: int = 0
    playing: bool = False
    current_time: float = 0.0
    """Позиция, с"""
    duration: float = 0.0
    """Длина записи, с"""
    started: bool = False
    """Рассказ хоть раз запускали — показываем мини‑плеер"""


class GuideAudio:
    def __init__(self, state: AudioState):
        self.state = state
        self._queue: list[int] = []
        """Точки, до которых доехали, пока шёл рассказ о предыдущей"""
        self._finished = False
        self._loaded = asyncio.Event()

        self._main = fta.Audio(
            src=ROUTE_POINTS[0].audio_ru,
            release_mode=fta.ReleaseMode.STOP,
            on_loaded=self._handle_loaded,
            on_state_change=self._handle_state,
            on_position_change=self._handle_position,
            on_duration_change=self._handle_duration,
        )
        # Отдельный плеер для служебных фраз («вы не на маршруте» и т. п.)
        self._notice = fta.Audio(src=OFF_ROUTE_AUDIO, release_mode=fta.ReleaseMode.STOP)

    # --- события плеера ---

    def _handle_loaded(self, _):
        self._loaded.set()

    async def _handle_state(self, e: fta.AudioStateChangeEvent):
        playing = e.state == fta.AudioState.PLAYING
        self.state.playing = playing

        if playing:
            self._finished = False
            self.state.started = True

        if e.state == fta.AudioState.COMPLETED:
            self._finished = True
            self.state.current_time = self.state.duration

            if self._queue:
                await self.select(self._queue.pop(0), auto_play=True)

    def _handle_position(self, e: fta.AudioPositionChangeEvent):
        self.state.current_time = e.position / 1000

    def _handle_duration(self, e: fta.AudioDurationChangeEvent):
        self.state.duration = e.duration.in_milliseconds / 1000

    # --- управление ---

    async def _load(self, index: int) -> None:
        """Ставит запись точки и ждёт, пока плеер её загрузит."""
        self.state.current_index = index
        self.state.current_time = 0
        self.state.duration = 0
        self._finished = False

        source = ROUTE_POINTS[index].audio_ru
        if not source or source == self._main.src:
            return

        self._loaded.clear()
        self._main.src = source
        self._main.update()

        try:
            await asyncio.wait_for(self._loaded.wait(), LOAD_TIMEOUT)
        except asyncio.TimeoutError:
            pass

    async def set_rate(self, rate: float) -> None:
        if self._main.playback_rate != rate:
            self._main.playback_rate = rate
            self._main.update()

    async def toggle(self) -> None:
        await self._notice.pause()

        if self.state.playing:
            await self._main.pause()
            return

        # После окончания записи начинаем заново
        if self._finished or (
            self.state.duration > 0 and self.state.current_time >= self.state.duration - 0.25
        ):
            await self._main.play(0)
        elif self.state.started:
            await self._main.resume()
        else:
            await self._main.play(0)

    async def seek_to(self, seconds: float) -> None:
        seconds = min(max(seconds, 0), self.state.duration or 0)
        self.state.current_time = seconds
        self._finished = False
        await self._main.seek(ft.Duration(milliseconds=int(seconds * 1000)))

    async def seek_by(self, seconds: float) -> None:
        await self.seek_to(self.state.current_time + seconds)

    async def select(self, index: int, auto_play: bool = False) -> None:
        """Выбрать точку вручную; auto_play — сразу включить."""
        await self._notice.pause()

        if index == self.state.current_index:
            if auto_play:
                await self._main.play(0)
            return

        was_playing = self.state.playing
        if was_playing:
            await self._main.pause()

        await self._load(index)

        if not ROUTE_POINTS[index].audio_ru:
            return

        if was_playing or auto_play:
            await self._main.play(0)

    async def arrive_at(self, index: int, auto_play: bool) -> None:
        """Точка сработала по GPS: если идёт рассказ — встанет в очередь."""
        if not auto_play:
            # Без автозапуска просто показываем точку, если ничего не играет
            if not self.state.playing:
                await self.select(index, auto_play=False)
            return

        if self.state.playing:
            self._queue.append(index)
        else:
            await self.select(index, auto_play=True)

    async def play_notice(self, source: str) -> None:
        await self._main.pause()

        if self._notice.src != source:
            self._notice.src = source
            self._notice.update()
            # Короткая пауза, чтобы плеер успел подхватить новую запись
            await asyncio.sleep(0.3)

        await self._notice.play(0)

    def clear_queue(self) -> None:
        self._queue.clear()
