"""Нижняя панель вкладок, мини‑плеер и блок «что впереди»."""

from typing import Callable, Optional

import flet as ft

from app.audio import AudioState
from app.controller import Navigation
from app.data.route import ROUTE_POINTS
from app.format import format_distance, format_duration, format_time
from app.theme import use_colors
from app.tracking import TrackingState
from app.ui.widgets import Glass, Label, RoundButton
from app.walking import WALK_SPEED, WalkingRoute

TABS = [
    ("home", ft.Icons.HOME_ROUNDED, "Главная"),
    ("guide", ft.Icons.HEADPHONES_ROUNDED, "Гид"),
    ("more", ft.Icons.TUNE_ROUNDED, "Ещё"),
    ("route", ft.Icons.ROUTE_ROUNDED, "Маршрут"),
]


@ft.component
def NavigationInfo(tracking: TrackingState, navigation: Navigation, walk_route: Optional[WalkingRoute]):
    """Что впереди: следующая остановка в пути или ближайшая, если вне маршрута."""
    colors = use_colors()

    def box(label: str, title: str, meta: Optional[str] = None, label_color: Optional[str] = None):
        controls = [
            Label(label, label_color or colors.accent, size=9, spacing=1.6),
            ft.Text(title, size=17, weight=ft.FontWeight.W_800, color=colors.text),
        ]
        if meta:
            controls.append(ft.Text(meta, size=12, color=colors.muted))
        return ft.Container(padding=16, content=ft.Column(controls, spacing=4))

    nearest = navigation.nearest_stop
    next_stop = navigation.next_stop

    if tracking.status == "off-route" and nearest:
        distance = walk_route.distance if walk_route else nearest.distance
        duration = walk_route.duration if walk_route else nearest.distance / WALK_SPEED
        meta = f"{format_distance(distance)} пешком · ~{format_duration(duration)}"
        if walk_route and not walk_route.precise:
            meta += " · по прямой"
        return box("БЛИЖАЙШАЯ ОСТАНОВКА 343Э", ROUTE_POINTS[nearest.index].name, meta, colors.warn)

    if tracking.status == "on-route" and next_stop:
        speed = tracking.position.speed if tracking.position else None
        # Время в пути — только когда едем, а не стоим на светофоре
        meta = format_distance(next_stop.distance)
        if speed is not None and speed > 2:
            meta += f" · ~{format_duration(next_stop.distance / speed)} · {round(speed * 3.6)} км/ч"
        return box("СЛЕДУЮЩАЯ ОСТАНОВКА", ROUTE_POINTS[next_stop.index].name, meta)

    if tracking.status == "on-route":
        return box("КОНЕЧНАЯ", "Маршрут пройден")

    return box(
        "МАРШРУТ 343Э",
        "Ломоносов → «Проспект Ветеранов»",
        f"{len(ROUTE_POINTS)} точек · 34 км",
    )


@ft.component
def BottomNav(tab: str, on_change: Callable[[str], None], home_alert: Optional[str], guide_playing: bool):
    colors = use_colors()

    def item(tab_id, icon, label):
        active = tab == tab_id
        dot = home_alert if tab_id == "home" else (
            colors.accent if tab_id == "guide" and guide_playing and tab != "guide" else None
        )

        icon_box = ft.Container(
            width=35,
            height=35,
            border_radius=13,
            bgcolor=colors.accent_soft if active else None,
            alignment=ft.Alignment.CENTER,
            content=ft.Icon(icon, size=20, color=colors.accent if active else colors.muted),
        )
        badge = ft.Container(
            width=9,
            height=9,
            border_radius=5,
            bgcolor=dot,
            border=ft.Border.all(1.5, colors.bg),
            top=3,
            right=3,
            visible=dot is not None,
        )

        return ft.Container(
            expand=True,
            on_click=lambda _: on_change(tab_id),
            content=ft.Column(
                [
                    ft.Stack([icon_box, badge], width=35, height=35),
                    ft.Text(label, size=9, color=colors.text if active else colors.faint),
                ],
                spacing=2,
                horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                alignment=ft.MainAxisAlignment.CENTER,
            ),
        )

    return Glass(
        ft.Row([item(*t) for t in TABS], spacing=0),
        colors,
        floating=True,
        radius=25,
        height=72,
        padding=ft.Padding.symmetric(horizontal=4),
    )


@ft.component
def MiniPlayer(audio: AudioState, on_open: Callable[[], None], on_toggle: Callable):
    colors = use_colors()
    point = ROUTE_POINTS[audio.current_index]
    progress = min(audio.current_time / audio.duration, 1) if audio.duration > 0 else 0

    body = ft.Container(
        expand=True,
        on_click=lambda _: on_open(),
        content=ft.Row(
            [
                ft.Image(src=point.image, width=56, height=56, fit=ft.BoxFit.COVER, border_radius=14),
                ft.Column(
                    [
                        Label(
                            f"{'СЕЙЧАС ИГРАЕТ' if audio.playing else 'НА ПАУЗЕ'} · ТОЧКА {audio.current_index + 1}",
                            colors.accent,
                            size=8,
                            spacing=1.5,
                        ),
                        ft.Text(
                            point.name,
                            size=13,
                            weight=ft.FontWeight.W_700,
                            color=colors.text,
                            max_lines=1,
                            overflow=ft.TextOverflow.ELLIPSIS,
                        ),
                        ft.Text(
                            f"{format_time(audio.current_time)} / {format_time(audio.duration)}",
                            size=10,
                            color=colors.muted,
                        ),
                    ],
                    spacing=2,
                    expand=True,
                    alignment=ft.MainAxisAlignment.CENTER,
                ),
            ],
            spacing=11,
        ),
    )

    return Glass(
        ft.Stack(
            [
                ft.Container(
                    padding=7,
                    content=ft.Row(
                        [
                            body,
                            RoundButton(
                                ft.Icons.PAUSE_ROUNDED if audio.playing else ft.Icons.PLAY_ARROW_ROUNDED,
                                colors,
                                size=40,
                                icon_size=22,
                                on_click=lambda _: on_toggle(),
                                margin=ft.Margin.only(right=6),
                            ),
                        ],
                    ),
                ),
                ft.ProgressBar(
                    value=progress,
                    left=18,
                    right=18,
                    bottom=0,
                    bar_height=2,
                    color=colors.accent,
                    bgcolor=colors.fill,
                ),
            ],
        ),
        colors,
        floating=True,
        radius=22,
        height=70,
    )
