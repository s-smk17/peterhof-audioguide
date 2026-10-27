"""Аудиогид Петергоф — версия на Python (Flet).

Запуск на компьютере:      flet run src/main.py
В браузере:                flet run --web src/main.py
На телефоне (Flet app):    flet run --android src/main.py
"""

import flet as ft

from app.app import App
from app.controller import Controller


def main(page: ft.Page):
    page.title = "Аудиогид Петергоф"
    page.padding = 0
    page.spacing = 0
    page.bgcolor = "#05090D"
    page.theme = ft.Theme(color_scheme_seed="#63E6FF")
    page.dark_theme = ft.Theme(color_scheme_seed="#63E6FF")

    controller = Controller(page)
    page.render(App, controller, controller.settings)


if __name__ == "__main__":
    ft.run(main, assets_dir="assets")
