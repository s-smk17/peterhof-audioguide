// Основные настройки — в app.json. Здесь только базовый путь веб-сборки:
// на GitHub Pages сайт живёт не в корне домена, а в /peterhof-audioguide.
// Путь задаётся переменной EXPO_BASE_URL при сборке (см. .github/workflows),
// локально сайт открывается из корня.
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}),
  },
});
