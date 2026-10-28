export function formatTime(seconds: number) {
  const total = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(total / 60);

  return `${minutes}:${String(total % 60).padStart(2, '0')}`;
}

export function formatDistance(meters: number) {
  return meters < 1000
    ? `${Math.round(meters)} м`
    : `${(meters / 1000).toFixed(1).replace('.', ',')} км`;
}

export function formatDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));

  return minutes < 60
    ? `${minutes} мин`
    : `${Math.floor(minutes / 60)} ч ${minutes % 60} мин`;
}

export type LookHint = { arrow: string; text: string };

/**
 * Подсказка «куда смотреть» с учётом направления поездки.
 * side задан для поездки к метро (direction = 1); обратно лево и право меняются.
 */
export function lookHint(
  side: 'left' | 'right' | 'ahead' | null,
  direction: 1 | -1
): LookHint | null {
  if (side == null) return null;
  if (side === 'ahead') return { arrow: '↑', text: 'Смотрите вперёд' };

  const left = (side === 'left') === (direction === 1);
  return left
    ? { arrow: '←', text: 'Смотрите в левое окно' }
    : { arrow: '→', text: 'Смотрите в правое окно' };
}

/** Поиск остановки по названию: без учёта регистра, «ё» = «е», кавычки не важны */
export function matchesSearch(name: string, query: string) {
  const normalize = (text: string) =>
    text.toLowerCase().replace(/ё/g, 'е').replace(/[«»"]/g, '').trim();
  const q = normalize(query);
  return q === '' || normalize(name).includes(q);
}
