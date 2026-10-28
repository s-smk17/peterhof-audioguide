"""Корневой компонент: вкладки, плавающая панель, мини‑плеер, карта на весь экран."""

import flet as ft

from app.audio import AudioState
from app.controller import Controller, Progress, WalkState, navigation_for
from app.demo import DemoState
from app.settings import Settings
from app.tracking import TrackingState
from app.screens.guide import GuideScreen
from app.screens.home import HomeScreen
from app.screens.settings import SettingsScreen
from app.screens.stops import StopsScreen
from app.theme import ThemeContext, palette_for
from app.ui.fullscreen_map import FullscreenMap
from app.ui.panels import BottomNav, MiniPlayer
from app.ui.widgets import MAX_CONTENT_WIDTH, BackgroundGlow


@ft.component
def AppContent(
    c: Controller,
    # Отслеживаемые данные передаём явно: компонент перерисуется, когда они изменятся
    tracking: TrackingState,
    audio: AudioState,
    settings: Settings,
    progress: Progress,
    walk: WalkState,
    demo: DemoState,
    page_width: float,
):
    colors = ft.use_context(ThemeContext)
    tab, set_tab = ft.use_state("home")
    map_open, set_map_open = ft.use_state(False)

    navigation = navigation_for(tracking)
    width = min(page_width, MAX_CONTENT_WIDTH)
    page = c.page

    home_alert = (
        colors.danger
        if tracking.mode in ("denied", "disabled")
        else colors.warn
        if tracking.status == "off-route"
        else None
    )

    # Мини‑плеер — только когда рассказ запускали, и не на экране гида,
    # где есть полный плеер
    show_mini_player = tab != "guide" and audio.started
    bottom_space = 10 + 72 + (78 if show_mini_player else 0) + 30

    def run(fn, *args):
        page.run_task(fn, *args)

    def update_settings(**changes):
        async def apply():
            await c.update_settings(**changes)

        run(apply)

    def select(index: int, auto_play: bool = False):
        run(c.audio.select, index, auto_play)

    def toggle():
        run(c.audio.toggle)

    def open_url(app_url: str, web_url: str = ""):
        run(c.open_url, app_url, web_url or app_url)

    if tab == "guide":
        screen = GuideScreen(
            audio,
            progress,
            settings,
            tracking.direction,
            bottom_space,
            width,
            on_toggle=toggle,
            on_select=select,
            on_seek=lambda s: run(c.audio.seek_to, s),
            on_seek_by=lambda s: run(c.audio.seek_by, s),
            on_update_settings=update_settings,
        )
    elif tab == "route":
        screen = StopsScreen(audio, progress, tracking, bottom_space, on_toggle=toggle, on_select=select)
    elif tab == "more":
        screen = SettingsScreen(
            settings,
            tracking,
            bottom_space,
            page.web,
            demo,
            on_update_settings=update_settings,
            on_set_demo=lambda enabled: run(c.set_demo, enabled),
            on_set_demo_speed=lambda speed: setattr(c.demo_state, "speed", speed),
            on_reset_progress=lambda: run(c.reset_progress),
            on_open_gps_settings=lambda: run(c.location.open_settings),
            on_open_url=lambda url: open_url(url),
        )
    else:
        screen = HomeScreen(
            tracking,
            navigation,
            walk,
            progress,
            audio,
            demo,
            bottom_space,
            width,
            on_retry_gps=lambda: run(c.retry_gps),
            on_demo_pause=c.demo.pause,
            on_demo_resume=c.demo.resume,
            on_demo_restart=c.demo.restart,
            on_toggle=toggle,
            on_open_guide=lambda: set_tab("guide"),
            on_expand_map=lambda: set_map_open(True),
        )

    floating: list[ft.Control] = []
    if show_mini_player:
        floating.append(MiniPlayer(audio, on_open=lambda: set_tab("guide"), on_toggle=toggle))
    floating.append(
        BottomNav(tab, on_change=set_tab, home_alert=home_alert, guide_playing=audio.playing)
    )

    column = ft.Stack(
        [
            ft.SafeArea(content=screen, expand=True, avoid_intrusions_bottom=False),
            ft.SafeArea(
                left=12,
                right=12,
                bottom=10,
                avoid_intrusions_top=False,
                content=ft.Column(floating, spacing=8, tight=True),
            ),
        ],
        width=width,
        expand=True,
    )

    layers: list[ft.Control] = []
    if tab != "guide":
        layers.extend(BackgroundGlow(colors))
    layers.append(ft.Row([column], alignment=ft.MainAxisAlignment.CENTER, expand=True))

    if map_open:
        layers.append(
            FullscreenMap(
                tracking,
                navigation,
                walk,
                progress,
                on_close=lambda: set_map_open(False),
                on_open_url=open_url,
            )
        )

    return ft.Container(
        expand=True,
        bgcolor=colors.bg,
        content=ft.Stack(layers, expand=True),
    )


@ft.component
def App(c: Controller, settings: Settings):
    page = c.page
    brightness, set_brightness = ft.use_state(page.platform_brightness)
    page_width, set_page_width = ft.use_state(page.width or 400)

    def setup():
        # Тип события Flet определяет по подписи функции; проще читать со страницы
        page.on_platform_brightness_change = lambda _: set_brightness(page.platform_brightness)
        page.on_resize = lambda _: set_page_width(page.width)

        async def on_lifecycle(e: ft.AppLifecycleStateChangeEvent):
            if e.state == ft.AppLifecycleState.RESUME:
                await c.on_resume()

        page.on_app_lifecycle_state_change = on_lifecycle
        page.run_task(c.start)

    ft.on_mounted(setup)

    colors = palette_for(settings.theme, brightness)

    def apply_page_colors():
        page.bgcolor = colors.bg
        page.theme_mode = ft.ThemeMode.LIGHT if colors.scheme == "light" else ft.ThemeMode.DARK
        page.update()

    ft.use_effect(apply_page_colors, [colors.scheme])

    return ThemeContext(
        colors,
        lambda: AppContent(c, c.tracking, c.audio_state, settings, c.progress, c.walk, c.demo_state, page_width),
    )
