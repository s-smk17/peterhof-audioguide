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
    on_danger: str
    """Текст на красной кнопке"""
    glow_a: str
    glow_b: str
    glow_c: str
    map_tiles: str
    """Подложка карты: растровые тайлы Esri (данные OpenStreetMap и др.)"""
    map_bg: str


# «Петергоф: Балтика и золото» — тёмная тема
DARK = Palette(
    scheme="dark",
    bg="#0C111C",
    glass=rgba(20, 28, 46, 0.72),
    border="#263550",
    text="#F1F5F9",
    text_secondary="#CBD5E1",
    muted="#94A3B8",
    faint="#64748B",
    fill=rgba(148, 163, 184, 0.1),
    accent="#D4A359",
    on_accent="#080D17",
    accent_soft=rgba(212, 163, 89, 0.14),
    success="#2A9D8F",
    warn="#D96B43",
    on_warn="#080D17",
    danger="#F07167",
    on_danger="#080D17",
    glow_a=rgba(59, 110, 200, 0.09),
    glow_b=rgba(212, 163, 89, 0.05),
    glow_c=rgba(42, 157, 143, 0.035),
    map_tiles="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    map_bg="#111827",
)

# Светлая тема: оттенки темнее, чтобы контраст текста был не ниже 4.5:1
LIGHT = Palette(
    scheme="light",
    bg="#F4F6F9",
    glass=rgba(255, 255, 255, 0.9),
    border=rgba(15, 26, 44, 0.1),
    text="#0F1A2C",
    text_secondary="#334155",
    muted="#5B697D",
    faint="#94A3B8",
    fill=rgba(15, 26, 44, 0.06),
    accent="#8A6224",
    on_accent="#FFFFFF",
    accent_soft=rgba(158, 113, 43, 0.12),
    success="#1D766C",
    warn="#B4532F",
    on_warn="#FFFFFF",
    danger="#B83232",
    on_danger="#FFFFFF",
    glow_a=rgba(59, 110, 200, 0.07),
    glow_b=rgba(212, 163, 89, 0.07),
    glow_c=rgba(42, 157, 143, 0.04),
    map_tiles="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    map_bg="#E9EDF2",
)


def palette_for(preference: str, system: "ft.Brightness | None") -> Palette:
    """preference: system | light | dark"""
    if preference == "system":
        return LIGHT if system == ft.Brightness.LIGHT else DARK
    return LIGHT if preference == "light" else DARK


ThemeContext = ft.create_context(DARK)


def use_colors() -> Palette:
    return ft.use_context(ThemeContext)
