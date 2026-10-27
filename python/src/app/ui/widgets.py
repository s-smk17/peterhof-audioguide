"""Общие элементы интерфейса."""

from typing import Any, Callable, Optional

import flet as ft

from app.theme import Palette, use_colors

MAX_CONTENT_WIDTH = 560
"""На компьютере приложение не шире телефона, иначе всё растянуто"""

HERO_TEXT = "#FFFFFF"
HERO_ACCENT = "#63E6FF"


def label_style(color: str, size: float, spacing: float = 1.4, weight=ft.FontWeight.W_900):
    return ft.TextStyle(size=size, color=color, weight=weight, letter_spacing=spacing)


def Label(text: str, color: str, size: float = 10, spacing: float = 1.4, **kwargs) -> ft.Text:
    """Мелкая подпись заглавными: «НА МАРШРУТЕ», «ТОЧКА 3»."""
    return ft.Text(text, style=label_style(color, size, spacing), **kwargs)


def Glass(
    content: ft.Control,
    colors: Palette,
    *,
    floating: bool = False,
    border_color: Optional[str] = None,
    radius: float = 24,
    **kwargs: Any,
) -> ft.Container:
    """«Стеклянная» карточка. Размытие фона — только у плавающих панелей:
    в списке оно тормозит прокрутку и почти ничего не даёт."""
    return ft.Container(
        content=content,
        bgcolor=colors.glass,
        border=ft.Border.all(1, border_color or colors.border),
        border_radius=radius,
        clip_behavior=ft.ClipBehavior.ANTI_ALIAS,
        blur=ft.Blur(18, 18) if floating else None,
        **kwargs,
    )


def BackgroundGlow(colors: Palette) -> list[ft.Control]:
    """Мягкие цветные пятна на фоне."""

    def blob(size, color, **pos):
        return ft.Container(width=size, height=size, border_radius=size, bgcolor=color, **pos)

    return [
        blob(280, colors.glow_a, top=-100, right=-90),
        blob(260, colors.glow_b, top=330, left=-160),
        blob(240, colors.glow_c, bottom=100, right=-150),
    ]


@ft.component
def TopBar(title: str, subtitle: Optional[str] = None):
    colors = use_colors()
    controls: list[ft.Control] = [
        Label("PETERHOF AUDIO", colors.accent, size=10, spacing=2.2),
        ft.Text(
            title,
            style=ft.TextStyle(size=28, weight=ft.FontWeight.W_800, color=colors.text, letter_spacing=-0.8),
        ),
    ]
    if subtitle:
        controls.append(ft.Text(subtitle, size=13, color=colors.muted))

    return ft.Container(
        content=ft.Column(controls, spacing=3),
        margin=ft.Margin.only(bottom=20),
    )


@ft.component
def Toggle(value: bool, on_change: Callable[[bool], Any]):
    colors = use_colors()
    return ft.Container(
        width=48,
        height=28,
        border_radius=28,
        padding=3,
        bgcolor=colors.accent_soft if value else colors.fill,
        alignment=ft.Alignment.CENTER_RIGHT if value else ft.Alignment.CENTER_LEFT,
        animate=ft.Animation(150, ft.AnimationCurve.EASE_OUT),
        on_click=lambda _: on_change(not value),
        content=ft.Container(
            width=22,
            height=22,
            border_radius=22,
            bgcolor=colors.accent if value else colors.faint,
        ),
    )


@ft.component
def Segmented(options: list[tuple[Any, str]], value: Any, on_change: Callable[[Any], Any]):
    """Переключатель из нескольких вариантов: [(значение, подпись), …]."""
    colors = use_colors()
    active_bg = ft.Colors.with_opacity(0.12, "#FFFFFF") if colors.scheme == "dark" else "#FFFFFF"

    def segment(option_value, label):
        active = option_value == value
        return ft.Container(
            expand=True,
            padding=ft.Padding.symmetric(vertical=9),
            border_radius=11,
            bgcolor=active_bg if active else None,
            alignment=ft.Alignment.CENTER,
            on_click=lambda _: on_change(option_value),
            content=ft.Text(
                label,
                size=12,
                weight=ft.FontWeight.W_700,
                color=colors.text if active else colors.muted,
                text_align=ft.TextAlign.CENTER,
            ),
        )

    return ft.Container(
        bgcolor=colors.fill,
        border_radius=14,
        padding=3,
        content=ft.Row([segment(v, label) for v, label in options], spacing=0),
    )


def RoundButton(
    icon: Any,
    colors: Palette,
    *,
    size: float = 40,
    icon_size: float = 18,
    bgcolor: Optional[str] = None,
    icon_color: Optional[str] = None,
    on_click: Optional[Callable] = None,
    **kwargs: Any,
) -> ft.Container:
    return ft.Container(
        width=size,
        height=size,
        border_radius=size / 2,
        bgcolor=bgcolor if bgcolor is not None else colors.fill,
        alignment=ft.Alignment.CENTER,
        on_click=on_click,
        content=ft.Icon(icon, size=icon_size, color=icon_color or colors.text),
        **kwargs,
    )


def scroll_content(controls: list[ft.Control], bottom_space: float) -> ft.ListView:
    """Прокручиваемая страница с отступом снизу под панель и мини‑плеер."""
    return ft.ListView(
        controls=controls,
        expand=True,
        padding=ft.Padding.only(left=18, right=18, top=12, bottom=bottom_space),
    )
