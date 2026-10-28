"""Ещё: настройки аудиогида, GPS, сброс прогресса и сведения о приложении."""

from typing import Callable, Optional

import flet as ft

from app.demo import DemoState
from app.settings import TRIGGER_DISTANCE, Settings
from app.theme import use_colors
from app.tracking import TrackingState
from app.ui.widgets import Glass, Segmented, Toggle, TopBar, scroll_content

APP_VERSION = "1.0.0"


def gps_mode(mode: str, web: bool) -> tuple[str, str, bool]:
    """(значение, пояснение, всё ли хорошо) для строки «GPS»."""
    if mode == "background":
        return "В фоне", "Работает и с выключенным экраном", True
    if mode == "foreground":
        return (
            "Пока открыто",
            "В браузере гид работает, пока вкладка открыта и экран включён"
            if web
            else "Разрешите геолокацию «Всегда», чтобы гид работал, когда телефон в кармане",
            True,
        )
    if mode == "denied":
        return (
            "Нет доступа",
            "Разрешите доступ к геолокации для этого сайта в настройках браузера"
            if web
            else "Разрешите доступ к геолокации в настройках телефона",
            False,
        )
    if mode == "disabled":
        return (
            "Выключен",
            "Включите геолокацию на телефоне; сайт должен быть открыт по HTTPS"
            if web
            else "Включите геолокацию в настройках телефона",
            False,
        )
    if mode == "demo":
        return "Демо", "Идёт демо-поездка — настоящий GPS выключен", True
    return "…", "Запускаем GPS", True


@ft.component
def SettingsScreen(
    settings: Settings,
    tracking: TrackingState,
    bottom_space: float,
    web: bool,
    demo: DemoState,
    on_update_settings: Callable[..., None],
    on_set_demo: Callable[[bool], None],
    on_set_demo_speed: Callable[[int], None],
    on_reset_progress: Callable,
    on_open_gps_settings: Callable,
    on_open_url: Callable[[str], None],
):
    colors = use_colors()
    confirm_reset, set_confirm_reset = ft.use_state(False)

    def title(text):
        return ft.Text(text, size=15, weight=ft.FontWeight.W_600, color=colors.text)

    def description(text):
        return ft.Text(text, size=12, color=colors.muted)

    def divider(last: bool):
        return None if last else ft.Border.only(bottom=ft.BorderSide(1, colors.border))

    def row(
        name: str,
        desc: Optional[str] = None,
        right: Optional[ft.Control] = None,
        on_click: Optional[Callable] = None,
        last: bool = False,
    ):
        texts = [title(name)] + ([description(desc)] if desc else [])
        return ft.Container(
            padding=ft.Padding.symmetric(vertical=12),
            border=divider(last),
            on_click=(lambda _: on_click()) if on_click else None,
            content=ft.Row(
                [ft.Column(texts, spacing=3, expand=True)] + ([right] if right else []),
                spacing=14,
                vertical_alignment=ft.CrossAxisAlignment.CENTER,
            ),
        )

    def block(name: str, control: ft.Control, desc: Optional[str] = None, last: bool = False):
        texts = [title(name)] + ([description(desc)] if desc else [])
        return ft.Container(
            padding=ft.Padding.symmetric(vertical=14),
            border=divider(last),
            content=ft.Column([*texts, ft.Container(control, margin=ft.Margin.only(top=9))], spacing=3),
        )

    def section(name: str, children: list[ft.Control]):
        return ft.Column(
            [
                ft.Text(
                    name.upper(),
                    style=ft.TextStyle(size=11, weight=ft.FontWeight.W_800, color=colors.muted, letter_spacing=1.4),
                    margin=ft.Margin.only(left=4),
                ),
                Glass(
                    ft.Column(children, spacing=0),
                    colors,
                    radius=20,
                    padding=ft.Padding.symmetric(horizontal=16),
                ),
            ],
            spacing=8,
            margin=ft.Margin.only(bottom=22),
        )

    def chevron(color=None):
        return ft.Icon(ft.Icons.CHEVRON_RIGHT_ROUNDED, color=color or colors.faint, size=24)

    value, gps_desc, ok = gps_mode(tracking.mode, web)
    if tracking.accuracy is not None:
        gps_desc += f" · точность ±{round(tracking.accuracy)} м"

    gps_children: list[ft.Control] = [
        row(
            "GPS",
            gps_desc,
            ft.Text(value, size=13, weight=ft.FontWeight.W_800, color=colors.success if ok else colors.danger),
        ),
        block(
            "Когда начинать рассказ",
            Segmented(
                [("early", "Заранее"), ("normal", "Обычно"), ("late", "У остановки")],
                settings.trigger_timing,
                lambda v: on_update_settings(trigger_timing=v),
            ),
            desc=f"За {TRIGGER_DISTANCE[settings.trigger_timing]} м до остановки",
            last=web,
        ),
    ]
    if not web:
        gps_children.append(
            row(
                "Настройки геолокации телефона",
                "Точность, доступ «Всегда»",
                chevron(),
                on_click=on_open_gps_settings,
                last=True,
            )
        )

    if confirm_reset:

        def do_reset():
            on_reset_progress()
            set_confirm_reset(False)

        data_children = [
            ft.Container(
                padding=ft.Padding.symmetric(vertical=14),
                content=ft.Column(
                    [
                        title("Сбросить весь прогресс?"),
                        description("Отметки «прослушано» у всех точек удалятся"),
                        ft.Row(
                            [
                                ft.Container(
                                    expand=True,
                                    height=42,
                                    border_radius=12,
                                    bgcolor=colors.fill,
                                    alignment=ft.Alignment.CENTER,
                                    on_click=lambda _: set_confirm_reset(False),
                                    content=ft.Text("Отмена", weight=ft.FontWeight.W_700, color=colors.text),
                                ),
                                ft.Container(
                                    expand=True,
                                    height=42,
                                    border_radius=12,
                                    bgcolor=colors.danger,
                                    alignment=ft.Alignment.CENTER,
                                    on_click=lambda _: do_reset(),
                                    content=ft.Text("Сбросить", weight=ft.FontWeight.W_800, color=colors.on_danger),
                                ),
                            ],
                            spacing=10,
                            margin=ft.Margin.only(top=9),
                        ),
                    ],
                    spacing=3,
                ),
            )
        ]
    else:
        data_children = [
            row(
                "Сбросить прогресс",
                "Начать маршрут заново",
                chevron(colors.danger),
                on_click=lambda: set_confirm_reset(True),
                last=True,
            )
        ]

    return scroll_content(
        [
            TopBar("Ещё", "Настройки аудиогида"),
            section(
                "Оформление",
                [
                    block(
                        "Тема",
                        Segmented(
                            [("system", "Как в системе"), ("light", "Светлая"), ("dark", "Тёмная")],
                            settings.theme,
                            lambda v: on_update_settings(theme=v),
                        ),
                        last=True,
                    )
                ],
            ),
            section(
                "Аудиогид",
                [
                    row(
                        "Автозапуск у остановок",
                        "Рассказ начнётся сам, когда вы подъедете к точке",
                        Toggle(settings.auto_play, lambda v: on_update_settings(auto_play=v)),
                    ),
                    row(
                        "Голосовые подсказки",
                        "Сообщать, когда вы сошли с маршрута и вернулись на него",
                        Toggle(settings.route_announcements, lambda v: on_update_settings(route_announcements=v)),
                    ),
                    block(
                        "Скорость речи",
                        Segmented(
                            [(1.0, "1×"), (1.25, "1,25×"), (1.5, "1,5×"), (2.0, "2×")],
                            settings.playback_rate,
                            lambda v: on_update_settings(playback_rate=v),
                        ),
                        last=True,
                    ),
                ],
            ),
            section("Геолокация", gps_children),
            section(
                "Демо-поездка",
                [
                    row(
                        "Прокатиться без автобуса",
                        "Точка сама едет по маршруту: рассказы, карта и подсказки работают как в настоящей поездке",
                        Toggle(demo.enabled, on_set_demo),
                    ),
                    block(
                        "Скорость",
                        Segmented([(1, "×1"), (5, "×5"), (20, "×20")], demo.speed, on_set_demo_speed),
                        desc="×1 — как автобус, 30 км/ч",
                        last=True,
                    ),
                ],
            ),
            section("Данные", data_children),
            section(
                "О приложении",
                [
                    row("Версия", right=ft.Text(f"{APP_VERSION} · Python", size=14, weight=ft.FontWeight.W_600, color=colors.muted)),
                    row(
                        "Карта и маршрут",
                        "© участники OpenStreetMap, Esri",
                        chevron(),
                        on_click=lambda: on_open_url("https://www.openstreetmap.org/copyright"),
                    ),
                    row(
                        "Фотографии",
                        "Wikimedia Commons, авторы указаны у каждой точки",
                        chevron(),
                        on_click=lambda: on_open_url("https://commons.wikimedia.org"),
                        last=True,
                    ),
                ],
            ),
            ft.Text(
                "PETERHOF AUDIO · МАРШРУТ 343Э",
                text_align=ft.TextAlign.CENTER,
                style=ft.TextStyle(size=9, color=colors.faint, letter_spacing=1.4),
                margin=ft.Margin.only(top=6),
            ),
        ],
        bottom_space,
    )
