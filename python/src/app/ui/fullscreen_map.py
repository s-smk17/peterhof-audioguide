"""Карта на весь экран с кнопками «Яндекс Карты» и «2ГИС»."""

from typing import Callable

import flet as ft

from app.controller import Navigation, Progress, WalkState
from app.data.route import ROUTE_POINTS
from app.geometry import find_nearest_stop
from app.theme import use_colors
from app.tracking import TrackingState
from app.ui.panels import NavigationInfo
from app.ui.route_map import RouteMap
from app.ui.widgets import Glass, Label, RoundButton
from app.walking import dgis_urls, yandex_maps_urls


@ft.component
def FullscreenMap(
    tracking: TrackingState,
    navigation: Navigation,
    walk: WalkState,
    progress: Progress,
    on_close: Callable,
    on_open_url: Callable[[str, str], None],
):
    colors = use_colors()
    position = tracking.position

    # Куда строить маршрут во внешних картах: выделенная остановка,
    # иначе ближайшая к человеку, иначе начало маршрута
    target_index = navigation.target_index
    if target_index is None and position:
        nearest = find_nearest_stop(position.latitude, position.longitude)
        target_index = nearest.index if nearest else None
    target = ROUTE_POINTS[target_index or 0]
    frm = (position.latitude, position.longitude) if position else None

    sheet_controls: list[ft.Control] = [NavigationInfo(tracking, navigation, walk.route)]

    if target.latitude is not None:
        yandex = yandex_maps_urls(target.latitude, target.longitude, frm)
        dgis = dgis_urls(target.latitude, target.longitude, frm)

        def brand_button(text: str, color: str, urls: tuple[str, str]):
            # Фирменные цвета сервисов — чтобы кнопки узнавались сразу
            return ft.Container(
                expand=True,
                height=46,
                border_radius=14,
                bgcolor=color,
                alignment=ft.Alignment.CENTER,
                on_click=lambda _: on_open_url(*urls),
                content=ft.Text(text, size=14, weight=ft.FontWeight.W_800, color="#FFFFFF"),
            )

        sheet_controls.append(
            ft.Container(
                padding=ft.Padding.only(left=16, right=16, bottom=16),
                content=ft.Column(
                    [
                        Label(f"ПЕШКОМ ДО «{target.name.upper()}»", colors.muted, size=9),
                        ft.Row(
                            [
                                brand_button("Яндекс Карты", "#FC3F1D", yandex),
                                brand_button("2ГИС", "#19AA1E", dgis),
                            ],
                            spacing=10,
                        ),
                    ],
                    spacing=8,
                ),
            )
        )

    return ft.Container(
        expand=True,
        bgcolor=colors.map_bg,
        content=ft.SafeArea(
            expand=True,
            content=ft.Stack(
                [
                    RouteMap(
                        tracking=tracking,
                        completed=list(progress.completed),
                        navigation=navigation,
                        walk_route=walk.route,
                        fullscreen=True,
                        # Нижняя панель с кнопками закрывает ~230 px карты
                        bottom_inset=230,
                    ),
                    RoundButton(
                        ft.Icons.CLOSE_ROUNDED,
                        colors,
                        size=42,
                        bgcolor=colors.glass,
                        border=ft.Border.all(1, colors.border),
                        on_click=lambda _: on_close(),
                        top=12,
                        left=16,
                    ),
                    Glass(
                        ft.Column(sheet_controls, spacing=0, tight=True),
                        colors,
                        floating=True,
                        left=12,
                        right=12,
                        bottom=16,
                    ),
                ],
                expand=True,
            ),
        ),
    )
