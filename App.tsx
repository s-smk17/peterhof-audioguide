import React, { useEffect, useRef, useState } from 'react';
import { StatusBar, View } from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { useGuideAudio } from './src/audio/useGuideAudio';
import BottomNav, { type Tab } from './src/components/BottomNav';
import FullscreenMap from './src/components/FullscreenMap';
import { BottomSpaceContext } from './src/components/layout';
import MiniPlayer from './src/components/MiniPlayer';
import { BackgroundGlow } from './src/components/ui';
import { useNavigation } from './src/location/useNavigation';
import { useRouteTracking } from './src/location/useRouteTracking';
import GuideScreen from './src/screens/GuideScreen';
import HomeScreen from './src/screens/HomeScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import StopsScreen from './src/screens/StopsScreen';
import {
  loadProgress,
  saveProgress,
  SettingsProvider,
  TRIGGER_DISTANCE,
  useSettings,
} from './src/settings';
import { ThemeProvider, useTheme } from './src/theme';

const OFF_ROUTE_AUDIO = require('./assets/audio/off-route.mp3');
const BACK_ON_ROUTE_AUDIO = require('./assets/audio/back-on-route.mp3');

export default function App() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <ThemedApp />
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

function ThemedApp() {
  const { settings } = useSettings();

  return (
    <ThemeProvider preference={settings.theme}>
      <AppContent />
    </ThemeProvider>
  );
}

function AppContent() {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const [tab, setTab] = useState<Tab>('home');
  const [mapOpen, setMapOpen] = useState(false);
  const [completed, setCompleted] = useState<number[]>([]);
  const completedRef = useRef<number[]>([]);

  const audio = useGuideAudio(settings.playbackRate);

  // Прогресс переживает перезапуск приложения
  useEffect(() => {
    loadProgress().then((saved) => {
      const merged = [...new Set([...saved, ...completedRef.current])];
      completedRef.current = merged;
      setCompleted(merged);
    });
  }, []);

  const setProgress = (next: number[]) => {
    completedRef.current = next;
    setCompleted(next);
    saveProgress(next);
  };

  const tracking = useRouteTracking({
    triggerDistance: TRIGGER_DISTANCE[settings.triggerTiming],
    onStopReached: (index) => {
      if (completedRef.current.includes(index)) return;

      setProgress([...completedRef.current, index]);
      audio.arriveAt(index, settings.autoPlay);
    },
    onLeftRoute: () => {
      audio.clearQueue();
      if (settings.routeAnnouncements) audio.playNotice(OFF_ROUTE_AUDIO);
    },
    onReturnedToRoute: () => {
      if (settings.routeAnnouncements) audio.playNotice(BACK_ON_ROUTE_AUDIO);
    },
  });

  const navigation = useNavigation(tracking);

  const homeAlert =
    tracking.mode === 'denied' || tracking.mode === 'disabled'
      ? colors.danger
      : tracking.status === 'off-route'
        ? colors.warn
        : null;

  // Мини‑плеер — только когда рассказ запускали, и не на экране гида,
  // где есть полный плеер
  const showMiniPlayer = tab !== 'guide' && audio.started;
  const bottomSpace = insets.bottom + 10 + 72 + (showMiniPlayer ? 78 : 0) + 30;

  let screen: React.ReactNode;

  switch (tab) {
    case 'guide':
      screen = <GuideScreen audio={audio} completed={completed} />;
      break;

    case 'route':
      screen = (
        <StopsScreen audio={audio} completed={completed} tracking={tracking} />
      );
      break;

    case 'more':
      screen = (
        <SettingsScreen
          tracking={tracking}
          onResetProgress={() => setProgress([])}
        />
      );
      break;

    default:
      screen = (
        <HomeScreen
          tracking={tracking}
          navigation={navigation}
          completed={completed}
          audio={audio}
          onRetryGps={tracking.retry}
          onOpenGuide={() => setTab('guide')}
          onExpandMap={() => setMapOpen(true)}
        />
      );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar
        barStyle={colors.scheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg}
      />

      {tab !== 'guide' && <BackgroundGlow />}

      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <BottomSpaceContext.Provider value={bottomSpace}>
          {screen}
        </BottomSpaceContext.Provider>
      </SafeAreaView>

      <View
        style={{
          position: 'absolute',
          left: 12,
          right: 12,
          bottom: 10 + insets.bottom,
          gap: 8,
        }}
      >
        {showMiniPlayer && (
          <MiniPlayer audio={audio} onOpen={() => setTab('guide')} />
        )}

        <BottomNav
          tab={tab}
          onChange={setTab}
          homeAlert={homeAlert}
          guidePlaying={audio.playing}
        />
      </View>

      <FullscreenMap
        visible={mapOpen}
        onClose={() => setMapOpen(false)}
        tracking={tracking}
        navigation={navigation}
        completed={completed}
      />
    </View>
  );
}
