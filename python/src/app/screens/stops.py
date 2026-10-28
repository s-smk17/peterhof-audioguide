"""Маршрут: все остановки по порядку, нажатие — слушать рассказ."""

from typing import Callable

import flet as ft

from app.audio import AudioState
from app.controller import Progress
from app.data.route import ROUTE_POINTS
from app.format import format_distance, matches_search
from app.geometry import distance_in_meters
from app.theme import use_colors
from app.tracking import TrackingState
from app.ui.widgets import Glass, TopBar, scroll_content


@ft.component
def StopsScreen(
    audio: AudioState,
    progress: Progress,
    tracking: TrackingState,
    bottom_space: float,
    on_toggle: Callable,
    on_select: Callable[[int, bool], None],
):
    colors = use_colors()
    completed = progress.completed
    position = tracking.position
    total = len(ROUTE_POINTS)
    query, set_query = ft.use_state("")
    shown = [(index, point) for index, point in enumerate(ROUTE_POINTS) if matches_search(point.name, query)]

    search = ft.Container(
        height=46,
        padding=ft.Padding.symmetric(horizontal=14),
        margin=ft.Margin.only(bottom=16),
        border_radius=16,
        border=ft.Border.all(1, colors.border),
        bgcolor=colors.glass,
        content=ft.Row(
            [
                ft.Text("⌕", size=18, weight=ft.FontWeight.W_700, color=colors.muted),
                ft.TextField(
                    value=query,
                    on_change=lambda e: set_query(e.control.value or ""),
                    hint_text="Поиск по названию",
                    hint_style=ft.TextStyle(color=colors.faint, size=15),
                    text_style=ft.TextStyle(color=colors.text, size=15),
                    border=ft.InputBorder.NONE,
                    dense=True,
                    autocorrect=False,
                    cursor_color=colors.accent,
                    expand=True,
                ),
                *(
                    [
                        ft.Container(
                            on_click=lambda _: set_query(""),
                            content=ft.Text("✕", size=15, weight=ft.FontWeight.W_800, color=colors.muted),
                        )
                    ]
                    if query
                    else []
                ),
            ],
            spacing=8,
            vertical_alignment=ft.CrossAxisAlignment.CENTER,
        ),
    )

    header = Glass(
        ft.Row(
            [
                ft.Column(
                    [
                        ft.Text("343Э", size=32, weight=ft.FontWeight.W_900, color=colors.text),
                        ft.Text("Ломоносов → метро «Проспект Ветеранов»", size=12, color=colors.muted),
                    ],
                    spacing=2,
                    expand=True,
                ),
                ft.Container(
                    padding=ft.Padding.symmetric(horizontal=12, vertical=8),
                    border_radius=100,
                    bgcolor=colors.accent_soft,
                    content=ft.Text(
                        f"{len(completed)}/{total}", size=12, weight=ft.FontWeight.W_800, color=colors.accent
                    ),
                ),
            ]
        ),
        colors,
        padding=19,
        margin=ft.Margin.only(bottom=22),
    )

    rows: list[ft.Control] = []
    for shown_index, (index, point) in enumerate(shown):
        done = index in completed
        current = index == audio.current_index
        playing_now = current and audio.playing
        is_last = shown_index == len(shown) - 1

        distance = (
            distance_in_meters(position.latitude, position.longitude, point.latitude, point.longitude)
            if position and point.latitude is not None
            else None
        )

        if playing_now:
            meta = "ИГРАЕТ"
        elif current:
            meta = "ВЫБРАНА"
        elif done:
            meta = "ПРОСЛУШАНО"
        else:
            meta = f"ОСТАНОВКА {index + 1:02d}"
        if distance is not None:
            meta += f" · {format_distance(distance)} от вас"

        dot_bg = colors.accent if current else colors.success if done else colors.glass
        dot = ft.Container(
            width=28,
            height=28,
            border_radius=14,
            bgcolor=dot_bg,
            border=ft.Border.all(1, dot_bg if (done or current) else colors.border),
            alignment=ft.Alignment.CENTER,
            content=(
                ft.Text("✓", size=13, weight=ft.FontWeight.W_900, color="#FFFFFF")
                if done and not current
                else ft.Text(
                    str(index + 1),
                    size=10,
                    weight=ft.FontWeight.W_800,
                    color=colors.on_accent if current else colors.text,
                )
            ),
        )

        timeline = ft.Column(
            [
                dot,
                ft.Container(
                    width=2,
                    expand=True,
                    bgcolor=ft.Colors.with_opacity(0.5, colors.success) if done else colors.fill,
                    visible=not is_last,
                ),
            ],
            spacing=0,
            width=34,
            horizontal_alignment=ft.CrossAxisAlignment.CENTER,
        )

        card = ft.Container(
            expand=True,
            margin=ft.Margin.only(left=10, bottom=12),
            padding=8,
            border_radius=18,
            border=ft.Border.all(1, colors.accent if current else colors.border),
            bgcolor=colors.accent_soft if current else colors.glass,
            content=ft.Row(
                [
                    ft.Image(src=point.image, width=64, height=64, fit=ft.BoxFit.COVER, border_radius=13),
                    ft.Column(
                        [
                            ft.Text(
                                point.name,
                                size=14,
                                weight=ft.FontWeight.W_700,
                                color=colors.text,
                                max_lines=2,
                                overflow=ft.TextOverflow.ELLIPSIS,
                            ),
                            ft.Text(
                                meta,
                                style=ft.TextStyle(
                                    size=9, weight=ft.FontWeight.W_800, color=colors.muted, letter_spacing=1
                                ),
                            ),
                        ],
                        spacing=5,
                        expand=True,
                    ),
                    ft.Container(
                        width=34,
                        height=34,
                        border_radius=17,
                        bgcolor=colors.accent if current else colors.fill,
                        alignment=ft.Alignment.CENTER,
                        margin=ft.Margin.only(right=4),
                        content=ft.Icon(
                            ft.Icons.PAUSE_ROUNDED if playing_now else ft.Icons.PLAY_ARROW_ROUNDED,
                            size=18,
                            color=colors.on_accent if current else colors.text,
                        ),
                    ),
                ],
                spacing=11,
            ),
        )

        rows.append(
            ft.Container(
                key=point.id,
                on_click=(lambda _: on_toggle()) if current else (lambda _, i=index: on_select(i, True)),
                content=ft.Row(
                    [timeline, card],
                    spacing=0,
                    vertical_alignment=ft.CrossAxisAlignment.STRETCH,
                    intrinsic_height=True,
                ),
            )
        )

    return scroll_content(
        [
            TopBar("Маршрут", f"{total} остановок · нажмите, чтобы слушать"),
            header,
            search,
            *(
                [ft.Text("Ничего не нашлось", size=14, color=colors.muted, text_align=ft.TextAlign.CENTER)]
                if not shown
                else []
            ),
            *rows,
        ],
        bottom_space,
    )
