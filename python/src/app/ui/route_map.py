"""Карта: трасса 343Э, остановки, человек и путь пешком до остановки."""

import math
from typing import Callable, Optional

import flet as ft
import flet_map as ftm

from app.controller import Navigation
from app.data.route import ROUTE_POINTS
from app.data.route_shape import ROUTE_SHAPE
from app.theme import use_colors
from app.tracking import TrackingState
from app.ui.widgets import RoundButton
from app.walking import WalkingRoute

LatLon = tuple[float, float]

ATTRIBUTION = "© участники OpenStreetMap, Esri"
MAX_TILE_ZOOM = 16
"""Глубже у подложки Esri тайлов нет — дальше карта просто увеличивает их"""

# Человек сам двигает карту — перестаём следовать за ним
USER_GESTURES = {
    ftm.MapEventSource.DRAG_START,
    ftm.MapEventSource.ON_DRAG,
    ftm.MapEventSource.MULTI_FINGER_GESTURE_START,
    ftm.MapEventSource.ON_MULTI_FINGER,
    ftm.MapEventSource.SCROLL_WHEEL,
    ftm.MapEventSource.DOUBLE_TAP,
    ftm.MapEventSource.DOUBLE_TAP_HOLD,
    ftm.MapEventSource.KEYBOARD,
}


def _ll(lat: float, lon: float) -> ftm.MapLatitudeLongitude:
    return ftm.MapLatitudeLongitude(latitude=lat, longitude=lon)


def _mercator(lat: float, lon: float) -> tuple[float, float]:
    x = (lon + 180) / 360
    s = math.sin(math.radians(lat))
    y = 0.5 - math.log((1 + s) / (1 - s)) / (4 * math.pi)
    return x, y


def _unmercator(x: float, y: float) -> LatLon:
    lon = x * 360 - 180
    lat = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y))))
    return lat, lon


def fit_camera(
    points: list[LatLon], width: float, height: float, padding: float, bottom_inset: float = 0
) -> tuple[LatLon, float]:
    """Центр и масштаб, при которых все точки помещаются в окно карты.

    bottom_inset — сколько пикселей снизу закрыто панелью: точки
    размещаются в видимой части над ней.
    """
    xs, ys = zip(*(_mercator(lat, lon) for lat, lon in points))
    dx = max(max(xs) - min(xs), 1e-9)
    dy = max(max(ys) - min(ys), 1e-9)
    usable_w = max(width - 2 * padding, 50)
    usable_h = max(height - bottom_inset - 2 * padding, 50)
    zoom = max(1.0, min(math.log2(min(usable_w / (dx * 256), usable_h / (dy * 256))), 17.0))
    cx, cy = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2
    return shift_down(_unmercator(cx, cy), zoom, bottom_inset), zoom


def shift_down(center: LatLon, zoom: float, bottom_inset: float) -> LatLon:
    """Сдвигает центр так, чтобы точка оказалась посередине видимой части над панелью."""
    if bottom_inset <= 0:
        return center
    x, y = _mercator(*center)
    return _unmercator(x, y + (bottom_inset / 2) / (256 * 2**zoom))


ROUTE_LINE = [_ll(lat, lon) for lat, lon in ROUTE_SHAPE]
_lats = [lat for lat, _ in ROUTE_SHAPE]
_lons = [lon for _, lon in ROUTE_SHAPE]
ROUTE_BOUNDS = ftm.MapLatitudeLongitudeBounds(
    corner_1=_ll(max(_lats), min(_lons)), corner_2=_ll(min(_lats), max(_lons))
)


@ft.component
def RouteMap(
    tracking: TrackingState,
    completed: list[int],
    navigation: Navigation,
    walk_route: Optional[WalkingRoute],
    fullscreen: bool = False,
    on_expand: Optional[Callable] = None,
    height: Optional[float] = None,
    bottom_inset: float = 0,
):
    colors = use_colors()
    follow, set_follow = ft.use_state(True)
    size, set_size = ft.use_state((0.0, 0.0))
    map_ref = ft.use_ref(None)

    position = tracking.position
    status = tracking.status
    target = ROUTE_POINTS[navigation.target_index] if navigation.target_index is not None else None
    lat = position.latitude if position else None
    lon = position.longitude if position else None

    # Камера: в пути — следуем за человеком, вне маршрута — показываем
    # и человека, и остановку, без GPS — весь маршрут
    async def move_camera():
        m = map_ref.current
        width, map_height = size
        if not follow or m is None or width <= 0:
            return

        try:
            if lat is None:
                center, zoom = fit_camera(ROUTE_SHAPE, width, map_height, 40, bottom_inset)
                duration = 600
            elif status == "off-route" and walk_route:
                center, zoom = fit_camera(
                    [(lat, lon), *walk_route.coordinates], width, map_height, 50, bottom_inset
                )
                duration = 800
            else:
                zoom = 15.5 if fullscreen else 14.5
                center = shift_down((lat, lon), zoom, bottom_inset)
                duration = 1000

            await m.move_to(
                destination=_ll(*center),
                zoom=zoom,
                animation_duration=ft.Duration(milliseconds=duration),
                cancel_ongoing_animations=True,
            )
        except Exception:
            # Карта ещё не готова или уже закрыта — подвинем в следующий раз
            pass

    ft.use_effect(move_camera, [follow, lat, lon, status, walk_route, size])

    def on_event(e: ftm.MapEvent):
        if e.source in USER_GESTURES and follow:
            set_follow(False)

    def on_size(e: ft.LayoutSizeChangeEvent):
        set_size((e.width, e.height))

    stops = [
        ftm.CircleMarker(
            radius=6,
            coordinates=_ll(p.latitude, p.longitude),
            color=colors.success if i in completed else colors.map_bg,
            border_color=colors.success if i in completed else colors.accent,
            border_stroke_width=3,
        )
        for i, p in enumerate(ROUTE_POINTS)
        if p.latitude is not None and p.longitude is not None
    ]

    lines = [
        ftm.PolylineMarker(
            coordinates=ROUTE_LINE,
            color=ft.Colors.with_opacity(0.18, colors.accent),
            stroke_width=9,
        ),
        ftm.PolylineMarker(coordinates=ROUTE_LINE, color=colors.accent, stroke_width=3.5),
    ]
    if walk_route:
        lines.append(
            ftm.PolylineMarker(
                coordinates=[_ll(a, b) for a, b in walk_route.coordinates],
                color=colors.warn,
                stroke_width=3,
                stroke_pattern=ftm.DottedStrokePattern(spacing_factor=2),
            )
        )

    markers = []
    if target and target.latitude is not None:
        pin_color = colors.warn if status == "off-route" else colors.accent
        markers.append(
            ftm.Marker(
                coordinates=_ll(target.latitude, target.longitude),
                width=190,
                height=50,
                alignment=ft.Alignment.TOP_CENTER,
                content=ft.Column(
                    [
                        ft.Container(
                            padding=ft.Padding.symmetric(horizontal=9, vertical=5),
                            border_radius=10,
                            bgcolor=colors.glass,
                            border=ft.Border.all(1, pin_color),
                            content=ft.Text(
                                target.name,
                                size=11,
                                weight=ft.FontWeight.W_700,
                                color=colors.text,
                                max_lines=1,
                                overflow=ft.TextOverflow.ELLIPSIS,
                            ),
                        ),
                        ft.Container(
                            width=10,
                            height=10,
                            border_radius=5,
                            bgcolor=pin_color,
                            border=ft.Border.all(2, "#FFFFFF"),
                        ),
                    ],
                    spacing=4,
                    horizontal_alignment=ft.CrossAxisAlignment.CENTER,
                    alignment=ft.MainAxisAlignment.END,
                ),
            )
        )
    if position:
        markers.append(
            ftm.Marker(
                coordinates=_ll(lat, lon),
                width=26,
                height=26,
                content=ft.Container(
                    width=26,
                    height=26,
                    border_radius=13,
                    bgcolor=colors.accent_soft,
                    alignment=ft.Alignment.CENTER,
                    content=ft.Container(
                        width=13,
                        height=13,
                        border_radius=7,
                        bgcolor=colors.accent,
                        border=ft.Border.all(2, "#FFFFFF"),
                    ),
                ),
            )
        )

    the_map = ftm.Map(
        ref=map_ref,
        expand=True,
        bgcolor=colors.map_bg,
        initial_camera_fit=ftm.CameraFit(bounds=ROUTE_BOUNDS, padding=ft.Padding.all(30)),
        max_zoom=18,
        interaction_configuration=ftm.InteractionConfiguration(
            flags=ftm.InteractionFlag.ALL & ~ftm.InteractionFlag.ROTATE
        ),
        on_event=on_event,
        on_size_change=on_size,
        layers=[
            ftm.TileLayer(
                url_template=colors.map_tiles,
                max_native_zoom=MAX_TILE_ZOOM,
                user_agent_package_name="ru.peterhof.audioguide",
            ),
            ftm.PolylineLayer(polylines=lines),
            ftm.CircleLayer(circles=stops),
            ftm.MarkerLayer(markers=markers),
        ],
    )

    buttons = []
    if not follow:
        buttons.append(
            RoundButton(
                ft.Icons.MY_LOCATION_ROUNDED,
                colors,
                size=38,
                bgcolor=colors.glass,
                border=ft.Border.all(1, colors.border),
                on_click=lambda _: set_follow(True),
            )
        )
    if on_expand:
        buttons.append(
            RoundButton(
                ft.Icons.OPEN_IN_FULL_ROUNDED,
                colors,
                size=38,
                bgcolor=colors.glass,
                border=ft.Border.all(1, colors.border),
                on_click=lambda _: on_expand(),
            )
        )

    return ft.Container(
        height=height,
        expand=height is None,
        bgcolor=colors.map_bg,
        clip_behavior=ft.ClipBehavior.HARD_EDGE,
        content=ft.Stack(
            [
                the_map,
                ft.Column(buttons, spacing=8, top=10, right=10),
                ft.Container(
                    left=8,
                    bottom=6,
                    padding=ft.Padding.symmetric(horizontal=6, vertical=2),
                    border_radius=6,
                    bgcolor=ft.Colors.with_opacity(0.6, colors.map_bg),
                    content=ft.Text(ATTRIBUTION, size=9, color=colors.muted),
                ),
            ],
            expand=True,
        ),
    )
