// Карта сайта (maplibre-gl v6) обрабатывает данные в веб-воркере — отдельном
// файле. Сборщик Metro сам его не подхватывает, поэтому кладём копию в public/:
// оттуда он попадает и на локальный сервер, и в сборку для GitHub Pages.
// Запускается автоматически после npm install / npm ci (postinstall).
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const dist = dirname(require.resolve('maplibre-gl/dist/maplibre-gl.css'));

mkdirSync('public', { recursive: true });
copyFileSync(join(dist, 'maplibre-gl-worker.mjs'), join('public', 'maplibre-gl-worker.mjs'));
