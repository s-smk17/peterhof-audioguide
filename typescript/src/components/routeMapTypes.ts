import type { ViewStyle } from 'react-native';

import type { RouteTrackingState } from '../location/useRouteTracking';
import type { WalkingRoute } from '../location/useWalkingRoute';

export type RouteMapProps = {
  tracking: RouteTrackingState;
  completed: number[];
  /** Выделенная остановка: следующая по ходу или ближайшая, если вне маршрута */
  targetIndex: number | null;
  walkingRoute: WalkingRoute | null;
  /** Полноэкранный режим: больше обзор, компас */
  fullscreen?: boolean;
  /** Палец на карте — родительскому списку стоит перестать прокручиваться */
  onInteractionChange?: (active: boolean) => void;
  style?: ViewStyle;
  onExpand?: () => void;
};
