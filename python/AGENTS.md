# Flet 1.0 HAS CHANGED

API Flet 1.0 сильно отличается от 0.x (компоненты `@ft.component`, хуки, сервисы
`ft.Service`, `ft.run`). Не пишите по памяти: сверяйтесь с установленными
исходниками `.venv/lib/python*/site-packages/flet*` и документацией https://flet.dev/docs/.

- Запуск: `.venv/bin/flet run --web src/main.py`; тесты: `.venv/bin/python -m pytest`.
- Данные в `src/app/data/` сгенерированы из `typescript/src/data/` — меняйте в обеих версиях.
