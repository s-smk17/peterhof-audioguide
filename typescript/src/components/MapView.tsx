import type { ComponentType } from 'react';
import Constants, { ExecutionEnvironment } from 'expo-constants';

import type { RouteMapProps } from './routeMapTypes';

// В Expo Go нет нативного модуля MapLibre: его импорт роняет приложение.
// Поэтому там подключаем упрощённую схему на SVG, а настоящую карту —
// только в нативной сборке. require ленивый: модуль карты в Expo Go
// даже не загружается.
export const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const MapView: ComponentType<RouteMapProps> = isExpoGo
  ? require('./SchematicMap').default
  : require('./RouteMap').default;

export default MapView;
