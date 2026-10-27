# Аудиогид «Петергоф» · маршрут 343Э

Аудиогид для автобуса 343Э (Ломоносов → Петергоф → метро «Проспект Ветеранов»).
Следит за положением по GPS и сам включает рассказ, когда автобус подъезжает
к остановке. 29 точек, фото, карта маршрута, светлая и тёмная темы.

Одна и та же программа написана на двух языках — каждая версия в своей папке:

| Папка | Язык | Сайт | Приложение |
| --- | --- | --- | --- |
| [`typescript/`](typescript/README.md) | TypeScript (Expo, React Native) | https://s-smk17.github.io/peterhof-audioguide/ | Android и iPhone через Expo / EAS |
| [`python/`](python/README.md) | Python (Flet) | https://s-smk17.github.io/peterhof-audioguide/python/ | APK для Android — в [Releases](https://github.com/s-smk17/peterhof-audioguide/releases/tag/python-latest) |

Оба сайта и APK собираются автоматически после каждого `git push` в `main`
(`.github/workflows/`).

Как мы разрабатывали приложение с нейросетью — пошаговый план со схемами:
[typescript/docs/development-plan.md](typescript/docs/development-plan.md)

## Лицензия

Все права защищены — см. [LICENSE](LICENSE).
