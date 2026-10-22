import { useEffect, useRef, useState } from 'react';
import { Asset } from 'expo-asset';

import { routePoints } from '../data/route';
import type { GuideAudio } from './useGuideAudio';

// Веб-версия плеера. Браузеры (особенно Safari на iPhone) не дают
// включать звук без касания экрана, а разрешение выдают конкретному
// <audio>. expo-audio в браузере создаёт новый элемент на каждый трек,
// и рассказ, запущенный по GPS, блокировался бы. Поэтому здесь два
// постоянных элемента — рассказ и служебные фразы. Первое касание любого
// места страницы «разблокирует» оба, дальше рассказы у остановок
// запускаются сами.

// Полсекунды тишины: чтобы разблокировать элемент, у которого ещё нет записи
const SILENCE =
  'data:audio/wav;base64,UklGRnQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVAAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==';

function uriOf(source: unknown): string | null {
  if (source == null) return null;
  if (typeof source === 'string') return source;
  if (typeof source === 'object' && 'uri' in source) {
    return String((source as { uri: string }).uri);
  }
  return Asset.fromModule(source as number).uri;
}

function createAudio() {
  const audio = new Audio();
  audio.preload = 'metadata';
  return audio;
}

/** play() без необработанной ошибки, если браузер всё же не разрешил звук */
function safePlay(audio: HTMLAudioElement) {
  audio.play().catch(() => {});
}

export function useGuideAudio(playbackRate: number): GuideAudio {
  const [main] = useState(createAudio);
  const [notice] = useState(createAudio);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [started, setStarted] = useState(false);

  const currentIndexRef = useRef(0);
  const rateRef = useRef(playbackRate);
  rateRef.current = playbackRate;
  // Мы сами хотим, чтобы рассказ играл (а не только разблокировка)
  const wantPlayRef = useRef(false);
  // Точки, до которых доехали, пока шёл рассказ о предыдущей
  const queueRef = useRef<number[]>([]);

  const play = () => {
    notice.pause();
    wantPlayRef.current = true;
    safePlay(main);
  };

  const pause = () => {
    wantPlayRef.current = false;
    main.pause();
  };

  const load = (index: number, autoPlay: boolean) => {
    const wasPlaying = !main.paused;
    const uri = uriOf(routePoints[index]?.audioRu);

    currentIndexRef.current = index;
    setCurrentIndex(index);
    setCurrentTime(0);
    setDuration(0);

    if (!uri) {
      pause();
      main.removeAttribute('src');
      main.load();
      return;
    }

    main.src = uri;
    main.playbackRate = rateRef.current;
    if (wasPlaying || autoPlay) play();
  };

  const select = (index: number, autoPlay = false) => {
    notice.pause();

    if (index === currentIndexRef.current) {
      if (autoPlay) {
        main.currentTime = 0;
        play();
      }
      return;
    }

    load(index, autoPlay);
  };

  // Последняя версия select — для обработчика окончания записи
  const selectRef = useRef(select);
  selectRef.current = select;

  // Первая запись и подписка на события элемента
  useEffect(() => {
    const first = uriOf(routePoints[0]?.audioRu);
    if (first && !main.src) main.src = first;

    const onPlay = () => {
      setPlaying(true);
      setStarted(true);
    };
    const onPause = () => setPlaying(false);
    const onTime = () => setCurrentTime(main.currentTime);
    const onDuration = () => {
      setDuration(Number.isFinite(main.duration) ? main.duration : 0);
      // Скорость сбрасывается при смене записи
      main.playbackRate = rateRef.current;
    };
    const onEnded = () => {
      setPlaying(false);
      wantPlayRef.current = false;

      const next = queueRef.current.shift();
      if (next != null) selectRef.current(next, true);
    };

    main.addEventListener('play', onPlay);
    main.addEventListener('pause', onPause);
    main.addEventListener('timeupdate', onTime);
    main.addEventListener('seeked', onTime);
    main.addEventListener('loadedmetadata', onDuration);
    main.addEventListener('durationchange', onDuration);
    main.addEventListener('ended', onEnded);

    return () => {
      main.removeEventListener('play', onPlay);
      main.removeEventListener('pause', onPause);
      main.removeEventListener('timeupdate', onTime);
      main.removeEventListener('seeked', onTime);
      main.removeEventListener('loadedmetadata', onDuration);
      main.removeEventListener('durationchange', onDuration);
      main.removeEventListener('ended', onEnded);
      main.pause();
      notice.pause();
    };
  }, [main, notice]);

  // Разблокировка звука первым касанием страницы
  useEffect(() => {
    const unlock = (audio: HTMLAudioElement, isMain: boolean) => {
      if (!audio.paused) return;
      if (!audio.src) audio.src = SILENCE;

      const time = audio.currentTime;
      audio.muted = true;

      audio
        .play()
        .then(() => {
          // Касание могло быть кнопкой «Играть» — тогда не останавливаем
          if (!(isMain && wantPlayRef.current)) {
            audio.pause();
            audio.currentTime = time;
          }
        })
        .catch(() => {})
        .finally(() => {
          audio.muted = false;
        });
    };

    const onGesture = () => {
      unlock(main, true);
      unlock(notice, false);
      remove();
    };

    const events = ['pointerdown', 'touchend', 'keydown'] as const;
    const remove = () =>
      events.forEach((name) =>
        document.removeEventListener(name, onGesture, true)
      );

    events.forEach((name) => document.addEventListener(name, onGesture, true));
    return remove;
  }, [main, notice]);

  useEffect(() => {
    main.playbackRate = playbackRate;
  }, [main, playbackRate]);

  // Карточка в шторке / на экране блокировки (Media Session API)
  useEffect(() => {
    const session = typeof navigator !== 'undefined' ? navigator.mediaSession : undefined;
    if (!session || typeof MediaMetadata === 'undefined') return;

    const point = routePoints[currentIndex];
    const artwork = uriOf(point?.image);

    session.metadata = new MediaMetadata({
      title: point?.name ?? 'Петергоф',
      artist: 'Аудиогид · 343Э',
      artwork: artwork ? [{ src: artwork }] : [],
    });
  }, [currentIndex]);

  useEffect(() => {
    const session = typeof navigator !== 'undefined' ? navigator.mediaSession : undefined;
    if (!session) return;

    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => play()],
      ['pause', () => pause()],
      ['seekbackward', () => (main.currentTime = Math.max(0, main.currentTime - 15))],
      ['seekforward', () => (main.currentTime = main.currentTime + 15)],
    ];

    handlers.forEach(([action, handler]) => {
      try {
        session.setActionHandler(action, handler);
      } catch {
        // действие не поддерживается браузером
      }
    });

    return () =>
      handlers.forEach(([action]) => {
        try {
          session.setActionHandler(action, null);
        } catch {
          // действие не поддерживается браузером
        }
      });
  }, [main]);

  const clamp = (seconds: number) =>
    Math.min(Math.max(seconds, 0), main.duration || 0);

  return {
    currentIndex,
    playing,
    currentTime,
    duration,
    started,

    toggle: () => {
      if (!main.paused) {
        pause();
        return;
      }

      // После окончания записи позиция остаётся в конце — начинаем заново
      if (main.duration > 0 && main.currentTime >= main.duration - 0.25) {
        main.currentTime = 0;
      }
      play();
    },

    seekTo: (seconds) => {
      main.currentTime = clamp(seconds);
    },

    seekBy: (seconds) => {
      main.currentTime = clamp(main.currentTime + seconds);
    },

    select,

    arriveAt: (index, autoPlay) => {
      if (!autoPlay) {
        // Без автозапуска просто показываем точку, если ничего не играет
        if (main.paused) select(index, false);
        return;
      }

      if (!main.paused) {
        queueRef.current.push(index);
      } else {
        select(index, true);
      }
    },

    playNotice: (source) => {
      const uri = uriOf(source);
      if (!uri) return;

      pause();
      notice.src = uri;
      safePlay(notice);
    },

    clearQueue: () => {
      queueRef.current = [];
    },
  };
}
