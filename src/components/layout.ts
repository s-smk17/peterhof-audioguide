import { createContext, useContext } from 'react';

// Отступ снизу у прокрутки: зависит от того, показан ли мини‑плеер
export const BottomSpaceContext = createContext(210);

export function useScrollContentStyle() {
  const paddingBottom = useContext(BottomSpaceContext);

  return { paddingHorizontal: 18, paddingTop: 12, paddingBottom };
}
