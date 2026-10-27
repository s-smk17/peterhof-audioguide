import type { ComponentType } from 'react';

import RouteMap from './RouteMap';
import type { RouteMapProps } from './routeMapTypes';

// В браузере всегда настоящая карта: './RouteMap' здесь — RouteMap.web.tsx
// на maplibre-gl
export const isExpoGo = false;

const MapView: ComponentType<RouteMapProps> = RouteMap;

export default MapView;
