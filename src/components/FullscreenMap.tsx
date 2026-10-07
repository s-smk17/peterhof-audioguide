import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { routePoints } from '../data/route';
import { openIn2Gis, openInYandexMaps } from '../location/externalMaps';
import { findNearestStop } from '../location/routeGeometry';
import type { Navigation } from '../location/useNavigation';
import type { RouteTrackingState } from '../location/useRouteTracking';
import { makeStyles } from '../theme';
import MapView from './MapView';
import NavigationInfo from './NavigationInfo';
import { Glass } from './ui';

type Props = {
  visible: boolean;
  onClose: () => void;
  tracking: RouteTrackingState;
  navigation: Navigation;
  completed: number[];
};

export default function FullscreenMap({
  visible,
  onClose,
  tracking,
  navigation,
  completed,
}: Props) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { position } = tracking;

  // Куда строить маршрут во внешних картах: выделенная остановка,
  // иначе ближайшая к человеку, иначе начало маршрута
  const targetIndex =
    navigation.targetIndex ??
    (position
      ? findNearestStop(position.latitude, position.longitude)?.index
      : null) ??
    0;
  const target = routePoints[targetIndex];
  const to =
    target.latitude != null && target.longitude != null
      ? { latitude: target.latitude, longitude: target.longitude }
      : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.screen}>
        <MapView
          style={StyleSheet.absoluteFill}
          fullscreen
          tracking={tracking}
          completed={completed}
          targetIndex={navigation.targetIndex}
          walkingRoute={navigation.walkingRoute}
        />

        <Pressable
          style={[styles.close, { top: insets.top + 12 }]}
          onPress={onClose}
          hitSlop={8}
        >
          <Text style={styles.closeText}>✕</Text>
        </Pressable>

        <Glass style={[styles.sheet, { bottom: insets.bottom + 16 }]}>
          <NavigationInfo tracking={tracking} navigation={navigation} />

          {to && (
            <View style={styles.external}>
              <Text style={styles.externalLabel}>
                ПЕШКОМ ДО «{target.name.toUpperCase()}»
              </Text>

              <View style={styles.externalRow}>
                <Pressable
                  style={[styles.externalButton, styles.yandex]}
                  onPress={() => openInYandexMaps(to, position)}
                >
                  <Text style={styles.yandexText}>Яндекс Карты</Text>
                </Pressable>

                <Pressable
                  style={[styles.externalButton, styles.dgis]}
                  onPress={() => openIn2Gis(to, position)}
                >
                  <Text style={styles.dgisText}>2ГИС</Text>
                </Pressable>
              </View>
            </View>
          )}
        </Glass>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  screen: {
    flex: 1,
    backgroundColor: c.mapBg,
  },

  close: {
    position: 'absolute',
    left: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: c.glass,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  closeText: {
    color: c.text,
    fontSize: 16,
    fontWeight: '800',
  },

  sheet: {
    position: 'absolute',
    left: 12,
    right: 12,
  },

  external: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  externalLabel: {
    color: c.muted,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: 8,
  },

  externalRow: {
    flexDirection: 'row',
    gap: 10,
  },

  externalButton: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Фирменные цвета сервисов — чтобы кнопки узнавались сразу
  yandex: {
    backgroundColor: '#FC3F1D',
  },

  yandexText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  dgis: {
    backgroundColor: '#19AA1E',
  },

  dgisText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
}));
