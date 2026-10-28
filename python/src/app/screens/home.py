"""Главная: статус GPS, карта, текущая точка и прогресс."""

from typing import Callable

import flet as ft

from app.audio import AudioState
from app.controller import Navigation, Progress, WalkState
from app.data.route import ROUTE_POINTS
from app.demo import DemoState
from app.geometry import ROUTE_LENGTH
from app.format import format_distance, look_hint
from app.theme import Palette, use_colors
from app.tracking import TrackingState
from app.ui.panels import NavigationInfo
from app.ui.route_map import RouteMap
from app.ui.widgets import HERO_ACCENT, HERO_TEXT, Glass, Label, LookBadge, TopBar, scroll_content


def route_badge(tracking: TrackingState, colors: Palette) -> tuple[str, str, str]:
    """(надпись, цвет, подсказка) для плашки статуса."""
    if tracking.mode == "denied":
        return "НЕТ ДОСТУПА К GPS", colors.danger, "Разрешите доступ к геолокации, чтобы гид работал сам"
    if tracking.mode == "disabled":
        return "GPS ВЫКЛЮЧЕН", colors.danger, "Включите геолокацию в настройках телефона"
    if tracking.status == "off-route":
        return (
            "ВНЕ МАРШРУТА",
            colors.warn,
            f"До маршрута 343Э — {format_distance(tracking.offset or 0)}",
        )
    if tracking.status == "on-route":
        return "НА МАРШРУТЕ", colors.accent, "Рассказ начнётся сам у каждой точки"
    return "ПОИСК GPS…", colors.muted, "Определяем, где вы находитесь"


@ft.component
def HomeScreen(
    tracking: TrackingState,
    navigation: Navigation,
    walk: WalkState,
    progress: Progress,
    audio: AudioState,
    demo: DemoState,
    bottom_space: float,
    width: float,
    on_retry_gps: Callable,
    on_demo_pause: Callable,
    on_demo_resume: Callable,
    on_demo_restart: Callable,
    on_toggle: Callable,
    on_open_guide: Callable,
    on_expand_map: Callable,
):
    colors = use_colors()
    label, color, hint = route_badge(tracking, colors)
    needs_retry = tracking.mode in ("denied", "disabled")
    completed = progress.completed
    share = len(completed) / len(ROUTE_POINTS) if ROUTE_POINTS else 0
    point = ROUTE_POINTS[audio.current_index]
    # Пока идёт рассказ — подсказываем, в какое окно смотреть
    look = look_hint(point.look_side, tracking.direction) if audio.playing else None

    status_texts: list[ft.Control] = [
        Label(label, color, size=11),
        ft.Text(hint, size=12, color=colors.muted),
    ]
    if tracking.approximate:
        status_texts.append(
            ft.Text(
                "Включите «Точную геолокацию» для приложения — иначе точки могут срабатывать не вовремя",
                size=12,
                color=colors.muted,
            )
        )

    status_row: list[ft.Control] = [
        ft.Container(width=8, height=8, border_radius=4, bgcolor=color),
        ft.Column(status_texts, spacing=3, expand=True),
    ]

    def pill(text: str, on_click: Callable):
        return ft.Container(
            padding=ft.Padding.symmetric(horizontal=12, vertical=8),
            border_radius=100,
            bgcolor=colors.fill,
            on_click=lambda _: on_click(),
            content=Label(text, colors.text, size=10, spacing=1, weight=ft.FontWeight.W_800),
        )

    if needs_retry:
        status_row.append(pill("ПОВТОРИТЬ", on_retry_gps))

    status = Glass(
        ft.Row(status_row, spacing=12),
        colors,
        border_color=color,
        padding=14,
        margin=ft.Margin.only(bottom=14),
    )

    # Плашка «Демо»: чтобы не спутать с настоящей поездкой, и кнопки управления
    demo_card = None
    if demo.enabled:
        state = "приехали" if demo.finished else "пауза" if demo.paused else f"едем ×{demo.speed}"
        demo_row: list[ft.Control] = [
            ft.Column(
                [
                    Label(f"ДЕМО · {state.upper()}", colors.warn, size=11),
                    ft.Text(
                        f"Не настоящая поездка · {format_distance(demo.along)} из {format_distance(ROUTE_LENGTH)}",
                        size=12,
                        color=colors.muted,
                    ),
                ],
                spacing=3,
                expand=True,
            )
        ]
        if not demo.finished:
            demo_row.append(
                pill("ПРОДОЛЖИТЬ", on_demo_resume) if demo.paused else pill("ПАУЗА", on_demo_pause)
            )
        demo_row.append(pill("С НАЧАЛА", on_demo_restart))
        demo_card = Glass(
            ft.Row(demo_row, spacing=8),
            colors,
            border_color=colors.warn,
            padding=14,
            margin=ft.Margin.only(bottom=14),
        )

    map_card = Glass(
        ft.Column(
            [
                RouteMap(
                    tracking=tracking,
                    completed=list(completed),
                    navigation=navigation,
                    walk_route=walk.route,
                    on_expand=on_expand_map,
                    height=260,
                ),
                NavigationInfo(tracking, navigation, walk.route),
            ],
            spacing=0,
        ),
        colors,
        margin=ft.Margin.only(bottom=18),
    )

    hero = ft.Container(
        height=width * 0.62,
        border_radius=26,
        bgcolor=colors.fill,
        clip_behavior=ft.ClipBehavior.ANTI_ALIAS,
        margin=ft.Margin.only(bottom=24),
        on_click=lambda _: on_open_guide(),
        content=ft.Stack(
            [
                ft.Image(src=point.image, fit=ft.BoxFit.COVER, expand=True, width=width, height=width * 0.62),
                ft.Container(expand=True, bgcolor=ft.Colors.with_opacity(0.42, "#00060A")),
                ft.Container(
                    padding=20,
                    left=0,
                    right=0,
                    bottom=0,
                    content=ft.Column(
                        [
                            Label(
                                f"ТОЧКА {audio.current_index + 1} · {'ИГРАЕТ' if audio.playing else 'АУДИОГИД'}",
                                HERO_ACCENT,
                                size=10,
                                spacing=1.8,
                                weight=ft.FontWeight.W_800,
                            ),
                            ft.Text(
                                point.name,
                                style=ft.TextStyle(
                                    size=28,
                                    weight=ft.FontWeight.W_900,
                                    color=HERO_TEXT,
                                    letter_spacing=-0.8,
                                    height=1.15,
                                ),
                            ),
                            *([ft.Container(LookBadge(look, colors, on_photo=True), margin=ft.Margin.only(top=4))] if look else []),
                            ft.Row(
                                [
                                    ft.Text(
                                        "Открыть плеер",
                                        size=12,
                                        weight=ft.FontWeight.W_600,
                                        color=ft.Colors.with_opacity(0.7, "#FFFFFF"),
                                    ),
                                    ft.Container(
                                        width=52,
                                        height=52,
                                        border_radius=26,
                                        bgcolor=HERO_ACCENT,
                                        alignment=ft.Alignment.CENTER,
                                        on_click=lambda _: on_toggle(),
                                        content=ft.Icon(
                                            ft.Icons.PAUSE_ROUNDED if audio.playing else ft.Icons.PLAY_ARROW_ROUNDED,
                                            color="#061015",
                                            size=26,
                                        ),
                                    ),
                                ],
                                alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                                margin=ft.Margin.only(top=8),
                            ),
                        ],
                        spacing=6,
                    ),
                ),
            ],
            expand=True,
        ),
    )

    progress_header = ft.Row(
        [
            ft.Column(
                [
                    ft.Text(
                        "Ваш прогресс",
                        style=ft.TextStyle(size=21, weight=ft.FontWeight.W_800, color=colors.text, letter_spacing=-0.4),
                    ),
                    ft.Text(f"Прослушано {len(completed)} из {len(ROUTE_POINTS)}", size=12, color=colors.muted),
                ],
                spacing=4,
            ),
            ft.Text(f"{round(share * 100)}%", size=17, weight=ft.FontWeight.W_800, color=colors.accent),
        ],
        alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
        vertical_alignment=ft.CrossAxisAlignment.END,
    )

    progress_bar = ft.ProgressBar(
        value=max(share, 0.03),
        bar_height=5,
        border_radius=5,
        color=colors.accent,
        bgcolor=colors.fill,
        track_gap=0,
        stop_indicator_radius=0,
        margin=ft.Margin.only(top=11),
    )

    return scroll_content(
        [
            TopBar("Добро пожаловать", "Маршрут 343Э · Петергоф"),
            *([demo_card] if demo_card else []),
            status,
            map_card,
            hero,
            progress_header,
            progress_bar,
        ],
        bottom_space,
    )
