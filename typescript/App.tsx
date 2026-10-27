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
import { BottomSpaceContext, MAX_CONTENT_WIDTH } from './src/components/layout';
import MiniPlayer from './src/components/MiniPlayer';
import { BackgroundGlow } from './src/components/ui';
import { useNavigation } from './src/location/useNavigation';
import { useRouteTracking } from './src/location/useRouteTracking';
import GuideScreen from './src/screens/GuideScreen';
import HomeScreen from './src/screens/HomeScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import StopsScreen from './src/screens/StopsScreen';
import {
  EMPTY_TRIP,
  loadProgress,
  loadTrip,
  saveProgress,
  saveTrip,
  SettingsProvider,
  TRIGGER_DISTANCE,
  TRIP_GAP_MS,
  useSettings,
  type Trip,
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
  const tripRef = useRef<Trip>(EMPTY_TRIP);

  const audio = useGuideAudio(settings.playbackRate);

  // Прогресс и текущая поездка переживают перезапуск приложения
  useEffect(() => {
    loadProgress().then((saved) => {
      const merged = [...new Set([...saved, ...completedRef.current])];
      completedRef.current = merged;
      setCompleted(merged);
    });

    loadTrip().then((saved) => {
      // Пока читали, могли уже доехать до остановки — тогда эта поездка свежее
      if (saved.updatedAt > tripRef.current.updatedAt) tripRef.current = saved;
    });
  }, []);

  const setProgress = (next: number[]) => {
    completedRef.current = next;
    setCompleted(next);
    saveProgress(next);
  };

  const setTrip = (next: Trip) => {
    tripRef.current = next;
    saveTrip(next);
  };

  const tracking = useRouteTracking({
    triggerDistance: TRIGGER_DISTANCE[settings.triggerTiming],
    onStopReached: (index, direction) => {
      const now = Date.now();
      let trip = tripRef.current;

      // Давно не было остановок или поехали обратно — это новая поездка,
      // и все рассказы снова запускаются сами
      if (now - trip.updatedAt > TRIP_GAP_MS || trip.direction !== direction) {
        trip = { played: [], direction, updatedAt: now };
      }

      if (trip.played.includes(index)) return;

      setTrip({ played: [...trip.played, index], direction, updatedAt: now });

      if (!completedRef.current.includes(index)) {
        setProgress([...completedRef.current, index]);
      }

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
          onResetProgress={() => {
            setProgress([]);
            setTrip(EMPTY_TRIP);
          }}
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

      <View
        style={{
          flex: 1,
          width: '100%',
          maxWidth: MAX_CONTENT_WIDTH,
          alignSelf: 'center',
        }}
      >
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
