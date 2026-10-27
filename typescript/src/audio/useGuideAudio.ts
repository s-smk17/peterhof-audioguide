import { useEffect, useRef, useState } from 'react';
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from 'expo-audio';

import { routePoints } from '../data/route';

export type GuideAudio = {
  currentIndex: number;
  playing: boolean;
  currentTime: number;
  duration: number;
  /** Рассказ хоть раз запускали — показываем мини‑плеер */
  started: boolean;
  toggle: () => void;
  seekTo: (seconds: number) => void;
  seekBy: (seconds: number) => void;
  /** Выбрать точку вручную; autoPlay — сразу включить */
  select: (index: number, autoPlay?: boolean) => void;
  /** Точка сработала по GPS: если идёт рассказ — встанет в очередь */
  arriveAt: (index: number, autoPlay: boolean) => void;
  playNotice: (source: number) => void;
  clearQueue: () => void;
};

export function useGuideAudio(playbackRate: number): GuideAudio {
  const [currentIndex, setCurrentIndex] = useState(0);
  const player = useAudioPlayer(routePoints[0]?.audioRu ?? null, {
    updateInterval: 250,
  });
  const status = useAudioPlayerStatus(player);
  // Отдельный плеер для служебных фраз («вы не на маршруте» и т. п.)
  const noticePlayer = useAudioPlayer(null);

  const loadedIndex = useRef(0);
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;
  const autoPlayRef = useRef(false);
  // Точки, до которых доехали, пока шёл рассказ о предыдущей
  const queueRef = useRef<number[]>([]);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    });
  }, []);

  useEffect(() => {
    if (status.playing) setStarted(true);
  }, [status.playing]);

  useEffect(() => {
    player.setPlaybackRate(playbackRate);
  }, [player, playbackRate, currentIndex]);

  // Смена точки — загружаем её запись; если звук уже играл, продолжаем
  useEffect(() => {
    if (loadedIndex.current === currentIndex) return;
    loadedIndex.current = currentIndex;

    const wasPlaying = player.playing;
    const source = routePoints[currentIndex]?.audioRu;

    if (!source) {
      player.pause();
      return;
    }

    player.replace(source);
    player.setPlaybackRate(playbackRate);
    if (wasPlaying || autoPlayRef.current) player.play();
    autoPlayRef.current = false;
  }, [currentIndex, player]);

  // Карточка на экране блокировки / в шторке, нужна и для фоновой работы на Android
  useEffect(() => {
    if (!status.playing) return;

    player.setActiveForLockScreen(true, {
      title: routePoints[currentIndex]?.name ?? 'Петергоф',
      artist: 'Аудиогид · 343Э',
    });
  }, [status.playing, currentIndex, player]);

  const select = (index: number, autoPlay = false) => {
    noticePlayer.pause();

    if (index === currentIndexRef.current) {
      if (autoPlay) {
        player.seekTo(0);
        player.play();
      }
      return;
    }

    autoPlayRef.current = autoPlay;
    setCurrentIndex(index);
  };

  useEffect(() => {
    if (!status.didJustFinish) return;

    const next = queueRef.current.shift();
    if (next != null) select(next, true);
  }, [status.didJustFinish]);

  return {
    currentIndex,
    playing: status.playing,
    currentTime: status.currentTime,
    duration: status.duration,
    started,

    toggle: () => {
      noticePlayer.pause();

      if (player.playing) {
        player.pause();
        return;
      }

      // После окончания записи позиция остаётся в конце — начинаем заново
      if (player.duration > 0 && player.currentTime >= player.duration - 0.25) {
        player.seekTo(0);
      }
      player.play();
    },

    seekTo: (seconds) =>
      player.seekTo(Math.min(Math.max(seconds, 0), player.duration || 0)),

    seekBy: (seconds) =>
      player.seekTo(
        Math.min(
          Math.max(player.currentTime + seconds, 0),
          player.duration || 0
        )
      ),

    select,

    arriveAt: (index, autoPlay) => {
      if (!autoPlay) {
        // Без автозапуска просто показываем точку, если ничего не играет
        if (!player.playing) select(index, false);
        return;
      }

      if (player.playing) {
        queueRef.current.push(index);
      } else {
        select(index, true);
      }
    },

    playNotice: (source) => {
      player.pause();
      noticePlayer.replace(source);
      noticePlayer.play();
    },

    clearQueue: () => {
      queueRef.current = [];
    },
  };
}
