"""Как показывать время и расстояния."""

import math


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
