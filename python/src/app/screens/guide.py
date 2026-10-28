"""Гид: полноэкранный плеер с обложкой, перемоткой и описанием места."""

from typing import Callable, Optional

import flet as ft

from app.audio import AudioState
from app.controller import Progress
from app.data.route import ROUTE_POINTS
from app.format import format_rate, format_time, look_hint
from app.settings import PLAYBACK_RATES, Settings
from app.theme import use_colors
from app.ui.widgets import Label, LookBadge, RoundButton, scroll_content


@ft.component
def SeekBar(current_time: float, duration: float, on_seek: Callable[[float], None]):
    """Полоса прогресса, которую можно тянуть пальцем, как в музыкальных плеерах."""
    colors = use_colors()
    drag, set_drag = ft.use_state(None)

    value = drag if drag is not None else (min(current_time, duration) if duration > 0 else 0)
    shown = drag if drag is not None else current_time

    def on_change(e):
        set_drag(float(e.control.value))

    def on_change_end(e):
        on_seek(float(e.control.value))
        set_drag(None)

    return ft.Column(
        [
            ft.Slider(
                value=value,
                min=0,
                max=max(duration, 0.001),
                active_color=colors.text,
                inactive_color=colors.fill,
                thumb_color=colors.text,
                overlay_color=ft.Colors.TRANSPARENT,
                padding=ft.Padding.symmetric(horizontal=0, vertical=8),
                on_change=on_change,
                on_change_end=on_change_end,
                disabled=duration <= 0,
            ),
            ft.Row(
                [
                    ft.Text(format_time(shown), size=11, weight=ft.FontWeight.W_600, color=colors.muted),
                    ft.Text(
                        "−" + format_time(max(duration - shown, 0)),
                        size=11,
                        weight=ft.FontWeight.W_600,
                        color=colors.muted,
                    ),
                ],
                alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
            ),
        ],
        spacing=0,
    )


@ft.component
def GuideScreen(
    audio: AudioState,
    progress: Progress,
    settings: Settings,
    direction: int,
    bottom_space: float,
    width: float,
    on_toggle: Callable,
    on_select: Callable[[int, bool], None],
    on_seek: Callable[[float], None],
    on_seek_by: Callable[[float], None],
    on_update_settings: Callable[..., None],
):
    colors = use_colors()
    index = audio.current_index
    point = ROUTE_POINTS[index]
    # Куда смотреть — зависит от направления поездки
    look = look_hint(point.look_side, direction)
    playing = audio.playing
    has_prev = index > 0
    has_next = index < len(ROUTE_POINTS) - 1
    cover = min(width - 56, 420)

    rate = settings.playback_rate
    next_rate = PLAYBACK_RATES[(PLAYBACK_RATES.index(rate) + 1) % len(PLAYBACK_RATES)] if rate in PLAYBACK_RATES else 1.0

    def control(icon, on_click: Optional[Callable], enabled: bool = True, text: Optional[str] = None):
        content = (
            ft.Text(text, size=15, weight=ft.FontWeight.W_800, color=colors.text)
            if text
            else ft.Icon(icon, size=30, color=colors.text)
        )
        return ft.Container(
            width=52,
            height=52,
            alignment=ft.Alignment.CENTER,
            opacity=1 if enabled else 0.25,
            on_click=(lambda _: on_click()) if enabled and on_click else None,
            content=content,
        )

    def chip(value: str, label: str, on_click: Callable, on: bool = False):
        return ft.Container(
            expand=True,
            padding=ft.Padding.symmetric(vertical=10),
            border_radius=14,
            bgcolor=colors.accent_soft if on else colors.fill,
            on_click=lambda _: on_click(),
            content=ft.Column(
                [
                    ft.Text(value, size=15, weight=ft.FontWeight.W_800, color=colors.accent if on else colors.text),
                    ft.Text(label, size=10, color=colors.muted),
                ],
                spacing=2,
                horizontal_alignment=ft.CrossAxisAlignment.CENTER,
            ),
        )

    title_row: list[ft.Control] = [
        ft.Column(
            [
                ft.Text(
                    point.name,
                    max_lines=2,
                    style=ft.TextStyle(size=24, weight=ft.FontWeight.W_800, color=colors.text, letter_spacing=-0.5),
                ),
                ft.Text(f"Остановка {index + 1} из {len(ROUTE_POINTS)}", size=14, color=colors.muted),
            ],
            spacing=4,
            expand=True,
        )
    ]
    if index in progress.completed:
        title_row.append(
            ft.Container(
                padding=ft.Padding.symmetric(horizontal=10, vertical=6),
                border_radius=100,
                bgcolor=colors.fill,
                content=Label("✓ ПРОЙДЕНО", colors.success, size=9, spacing=1),
            )
        )

    upcoming: list[ft.Control] = []
    following = list(enumerate(ROUTE_POINTS))[index + 1 : index + 6]
    if following:
        upcoming.append(
            ft.Text(
                "Далее по маршруту",
                size=19,
                weight=ft.FontWeight.W_800,
                color=colors.text,
                margin=ft.Margin.only(bottom=10),
            )
        )
        for i, stop in following:
            upcoming.append(
                ft.Container(
                    key=stop.id,
                    padding=ft.Padding.symmetric(vertical=8),
                    on_click=lambda _, i=i: on_select(i, True),
                    content=ft.Row(
                        [
                            ft.Image(src=stop.image, width=52, height=52, fit=ft.BoxFit.COVER, border_radius=10),
                            ft.Column(
                                [
                                    ft.Text(
                                        stop.name,
                                        size=15,
                                        weight=ft.FontWeight.W_600,
                                        color=colors.text,
                                        max_lines=1,
                                        overflow=ft.TextOverflow.ELLIPSIS,
                                    ),
                                    ft.Text(f"Остановка {i + 1}", size=12, color=colors.muted),
                                ],
                                spacing=2,
                                expand=True,
                            ),
                            ft.Icon(ft.Icons.PLAY_ARROW_ROUNDED, size=18, color=colors.muted),
                        ],
                        spacing=12,
                    ),
                )
            )

    content = scroll_content(
        [
            ft.Column(
                [
                    Label("ИГРАЕТ ИЗ МАРШРУТА", colors.muted, size=10, spacing=1.8, weight=ft.FontWeight.W_800),
                    ft.Text("343Э · Ломоносов → Ветеранов", size=13, weight=ft.FontWeight.W_700, color=colors.text),
                ],
                spacing=3,
                horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                margin=ft.Margin.only(bottom=22),
            ),
            ft.Row(
                [
                    ft.Container(
                        width=cover,
                        height=cover,
                        border_radius=20,
                        bgcolor=colors.fill,
                        clip_behavior=ft.ClipBehavior.ANTI_ALIAS,
                        shadow=ft.BoxShadow(
                            blur_radius=24,
                            color=ft.Colors.with_opacity(0.35, "#000000"),
                            offset=ft.Offset(0, 14),
                        ),
                        content=ft.Image(src=point.image, width=cover, height=cover, fit=ft.BoxFit.COVER),
                    )
                ],
                alignment=ft.MainAxisAlignment.CENTER,
                margin=ft.Margin.only(bottom=26),
            ),
            ft.Row(title_row, spacing=12, margin=ft.Margin.only(bottom=10)),
            *([ft.Container(LookBadge(look, colors), margin=ft.Margin.only(bottom=12))] if look else []),
            SeekBar(audio.current_time, audio.duration, on_seek),
            ft.Row(
                [
                    control(ft.Icons.SKIP_PREVIOUS_ROUNDED, lambda: on_select(index - 1, playing), has_prev),
                    control(None, lambda: on_seek_by(-15), text="↺15"),
                    ft.Container(
                        width=78,
                        height=78,
                        border_radius=39,
                        bgcolor=colors.accent,
                        alignment=ft.Alignment.CENTER,
                        on_click=lambda _: on_toggle(),
                        content=ft.Icon(
                            ft.Icons.PAUSE_ROUNDED if playing else ft.Icons.PLAY_ARROW_ROUNDED,
                            size=36,
                            color=colors.on_accent,
                        ),
                    ),
                    control(None, lambda: on_seek_by(15), text="15↻"),
                    control(ft.Icons.SKIP_NEXT_ROUNDED, lambda: on_select(index + 1, playing), has_next),
                ],
                alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                margin=ft.Margin.only(top=14, bottom=22),
            ),
            ft.Row(
                [
                    chip(format_rate(rate), "скорость", lambda: on_update_settings(playback_rate=next_rate)),
                    chip(
                        "Вкл" if settings.auto_play else "Выкл",
                        "автозапуск",
                        lambda: on_update_settings(auto_play=not settings.auto_play),
                        on=settings.auto_play,
                    ),
                ],
                spacing=10,
                margin=ft.Margin.only(bottom=22),
            ),
            ft.Container(
                padding=18,
                border_radius=20,
                bgcolor=colors.fill,
                margin=ft.Margin.only(bottom=24),
                content=ft.Column(
                    [
                        Label("О МЕСТЕ", colors.accent, size=9, spacing=1.8),
                        ft.Text(point.description, size=15, color=colors.text_secondary),
                        ft.Text(
                            f"Фото: {point.photo_author} · {point.photo_license} · Wikimedia Commons",
                            size=10,
                            color=colors.faint,
                            margin=ft.Margin.only(top=4),
                        ),
                    ],
                    spacing=8,
                ),
            ),
            *upcoming,
        ],
        bottom_space,
    )

    # Размытая обложка на фоне — как в Яндекс Музыке
    top_shade = "#8C05090D" if colors.scheme == "dark" else "#8CF2F5F7"
    return ft.Stack(
        [
            ft.Container(
                left=0,
                right=0,
                top=0,
                bottom=0,
                image=ft.DecorationImage(src=point.image, fit=ft.BoxFit.COVER),
            ),
            ft.Container(
                left=0,
                right=0,
                top=0,
                bottom=0,
                blur=ft.Blur(60, 60),
                gradient=ft.LinearGradient(
                    begin=ft.Alignment.TOP_CENTER,
                    end=ft.Alignment.BOTTOM_CENTER,
                    colors=[top_shade, colors.bg],
                    stops=[0, 0.75],
                ),
            ),
            content,
        ],
        expand=True,
    )
