"""Цвета светлой и тёмной темы — те же, что в версии на TypeScript."""

from dataclasses import dataclass

import flet as ft


def rgba(r: int, g: int, b: int, a: float) -> str:
    """Цвет с прозрачностью в формате Flutter: #AARRGGBB."""
    return f"#{round(a * 255):02X}{r:02X}{g:02X}{b:02X}"


@dataclass(frozen=True)
class Palette:
    scheme: str
    bg: str
    glass: str
    """Фон «стеклянных» карточек"""
    border: str
    text: str
    text_secondary: str
    muted: str
    faint: str
    fill: str
    """Подложка кнопок, дорожки прогресса"""
    accent: str
    on_accent: str
    """Текст и иконки на акцентном фоне"""
    accent_soft: str
    success: str
    warn: str
    on_warn: str
    danger: str
    glow_a: str
    glow_b: str
    glow_c: str
    map_tiles: str
    """Подложка карты: растровые тайлы Esri (данные OpenStreetMap и др.)"""
    map_bg: str


DARK = Palette(
    scheme="dark",
    bg="#05090D",
    glass=rgba(13, 20, 25, 0.72),
    border=rgba(255, 255, 255, 0.12),
    text="#F5F8FA",
    text_secondary="#A5B0B6",
    muted="#82909A",
    faint="#5A6870",
    fill=rgba(255, 255, 255, 0.08),
    accent="#63E6FF",
    on_accent="#061015",
    accent_soft=rgba(99, 230, 255, 0.13),
    success="#67D9A1",
    warn="#FFB86B",
    on_warn="#1A1004",
    danger="#FF7A7A",
    glow_a=rgba(36, 130, 255, 0.10),
    glow_b=rgba(126, 91, 255, 0.07),
    glow_c=rgba(49, 220, 210, 0.045),
    map_tiles="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    map_bg="#0B1217",
)

LIGHT = Palette(
    scheme="light",
    bg="#F2F5F7",
    glass=rgba(255, 255, 255, 0.88),
    border=rgba(12, 35, 48, 0.09),
    text="#0B1A22",
    text_secondary="#3B4C56",
    muted="#687983",
    faint="#A3B0B7",
    fill=rgba(12, 35, 48, 0.06),
    accent="#0093B0",
    on_accent="#FFFFFF",
    accent_soft=rgba(0, 147, 176, 0.11),
    success="#17955C",
    warn="#D27509",
    on_warn="#FFFFFF",
    danger="#D6453D",
    glow_a=rgba(36, 130, 255, 0.08),
    glow_b=rgba(126, 91, 255, 0.05),
    glow_c=rgba(0, 170, 190, 0.06),
    map_tiles="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    map_bg="#E8EDF0",
)


def palette_for(preference: str, system: "ft.Brightness | None") -> Palette:
    """preference: system | light | dark"""
    if preference == "system":
        return LIGHT if system == ft.Brightness.LIGHT else DARK
    return LIGHT if preference == "light" else DARK


ThemeContext = ft.create_context(DARK)


def use_colors() -> Palette:
    return ft.use_context(ThemeContext)
