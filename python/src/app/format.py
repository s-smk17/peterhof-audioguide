"""Как показывать время и расстояния."""

import math
from typing import Optional


def _round(value: float) -> int:
    """Округление, как в школе: 2,5 → 3 (встроенный round даёт 2)."""
    return math.floor(value + 0.5)


def format_time(seconds: float) -> str:
    total = max(0, int(seconds or 0))
    return f"{total // 60}:{total % 60:02d}"


def format_distance(meters: float) -> str:
    if meters < 1000:
        return f"{_round(meters)} м"
    return f"{meters / 1000:.1f}".replace(".", ",") + " км"


def format_duration(seconds: float) -> str:
    minutes = max(1, _round(seconds / 60))

    if minutes < 60:
        return f"{minutes} мин"
    return f"{minutes // 60} ч {minutes % 60} мин"


def format_rate(rate: float) -> str:
    """1.25 → «1,25×»"""
    text = f"{rate:g}".replace(".", ",")
    return f"{text}×"


def look_hint(side: Optional[str], direction: int) -> Optional[tuple[str, str]]:
    """Подсказка «куда смотреть» с учётом направления поездки: (стрелка, текст).

    side задан для поездки к метро (direction = 1); обратно лево и право меняются.
    """
    if side is None:
        return None
    if side == "ahead":
        return "↑", "Смотрите вперёд"

    left = (side == "left") == (direction == 1)
    return ("←", "Смотрите в левое окно") if left else ("→", "Смотрите в правое окно")


def matches_search(name: str, query: str) -> bool:
    """Поиск остановки по названию: без учёта регистра, «ё» = «е», кавычки не важны."""

    def normalize(text: str) -> str:
        text = text.lower().replace("ё", "е")
        for ch in "«»\"":
            text = text.replace(ch, "")
        return text.strip()

    q = normalize(query)
    return q == "" or q in normalize(name)
