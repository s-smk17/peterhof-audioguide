import { createContext, useContext } from 'react';
import { Platform } from 'react-native';

/** На сайте приложение не шире телефона, иначе на компьютере всё растянуто */
export const MAX_CONTENT_WIDTH = Platform.OS === 'web' ? 560 : Infinity;

// Отступ снизу у прокрутки: зависит от того, показан ли мини‑плеер
export const BottomSpaceContext = createContext(210);

export function useScrollContentStyle() {
  const paddingBottom = useContext(BottomSpaceContext);

  return { paddingHorizontal: 18, paddingTop: 12, paddingBottom };
}
