import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  setAudioModeAsync,
  requestNotificationPermissionsAsync,
} from 'expo-audio';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { createStreamSource } from '../services/songsService';

const PlayerContext = createContext(null);
const PlayerStatusContext = createContext(null);
const PlaybackStateContext = createContext(null);

// No Expo Go o serviço nativo do expo-audio não está registrado no manifesto,
// portanto a notificação com controles e o segundo plano sustentado só funcionam
// em builds geradas com o config plugin (ex.: `npx expo run:android` ou EAS Build).
const IS_EXPO_GO = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Controles do sistema (notificação, tela de bloqueio, fone/Bluetooth, carro).
// O expo-audio não expõe os botões de próxima/anterior, então usamos o
// expo-media-control só para os controles e o expo-audio só para tocar.
// Não funciona no Expo Go: exige development build.
let MediaControlModule = null;
if (!IS_EXPO_GO) {
  try {
    MediaControlModule = require('expo-media-control');
  } catch {
    MediaControlModule = null;
  }
}

function buildMediaMetadata(song) {
  return {
    title: song?.title || 'Sem título',
    artist: song?.artist || song?.album || undefined,
    album: song?.album || undefined,
    artwork: song?.thumbnail_url ? { uri: song.thumbnail_url } : undefined,
    duration: Number(song?.duration_seconds) || undefined,
  };
}

export function PlayerProvider({ children }) {
  const player = useAudioPlayer(null);
  const playerStatus = useAudioPlayerStatus(player);
  const playerStatusRef = useRef(playerStatus);
  playerStatusRef.current = playerStatus;
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentSong, setCurrentSong] = useState(null);
  const didJustFinishHandled = useRef(false);
  const notificationPermissionRequested = useRef(false);
  const playRequestId = useRef(0);
  const playInFlight = useRef(false);

  useEffect(() => {
    async function configureAudio() {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: true,
          interruptionMode: 'doNotMix',
        });
      } catch {
        // Se o modo de áudio não estiver disponível, segue com o comportamento padrão.
      }
    }
    configureAudio();
  }, []);

  const requestNotificationPermission = useCallback(() => {
    if (Platform.OS !== 'android' || notificationPermissionRequested.current) {
      return;
    }
    notificationPermissionRequested.current = true;
    requestNotificationPermissionsAsync().catch(() => {
      // Sem permissão de notificação a reprodução continua, apenas sem controles na notificação.
    });
  }, []);

  const playAtIndex = useCallback(
    async (list, index) => {
      const target = list?.[index];
      if (!target) {
        return false;
      }
      const requestId = ++playRequestId.current;
      playInFlight.current = true;
      setCurrentIndex(index);
      setCurrentSong(target);
      didJustFinishHandled.current = false;
      requestNotificationPermission();
      try {
        const source = await createStreamSource(target.id);
        if (requestId !== playRequestId.current) return false;
        player.replace(source);
        player.play();
      } catch (error) {
        if (requestId === playRequestId.current && __DEV__) console.warn('Falha ao iniciar stream:', error);
      } finally {
        if (requestId === playRequestId.current) playInFlight.current = false;
      }
      return true;
    },
    [player, requestNotificationPermission]
  );

  const playSong = useCallback(
    async (song, songQueue) => {
      const list = Array.isArray(songQueue) && songQueue.length > 0 ? songQueue : [song];
      const index = Math.max(0, list.findIndex((item) => String(item.id) === String(song.id)));
      setQueue(list);
      await playAtIndex(list, index);
    },
    [playAtIndex]
  );

  const toggle = useCallback(() => {
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  }, [player]);

  const next = useCallback(() => {
    if (queue.length === 0 || playInFlight.current) {
      return false;
    }
    if (currentIndex + 1 >= queue.length) return false;
    return playAtIndex(queue, currentIndex + 1);
  }, [queue, currentIndex, playAtIndex]);

  const previous = useCallback(() => {
    if (queue.length === 0 || playInFlight.current) {
      return;
    }
    if (currentIndex > 0) {
      return playAtIndex(queue, currentIndex - 1);
    } else if ((playerStatusRef.current?.currentTime || 0) > 3) {
      player.seekTo(0);
      return true;
    } else {
      return false;
    }
  }, [queue, currentIndex, player, playAtIndex]);

  const seekTo = useCallback(
    (seconds) => {
      const position = Math.max(0, seconds);
      player.seekTo(position);
      if (MediaControlModule && currentSong) {
        const { MediaControl, PlaybackState } = MediaControlModule;
        const state = playerStatusRef.current?.playing ? PlaybackState.PLAYING : PlaybackState.PAUSED;
        MediaControl.updatePlaybackState(state, position).catch(() => {});
      }
    },
    [player, currentSong]
  );

  const skipTo = useCallback(
    (index) => {
      playAtIndex(queue, index);
    },
    [queue, playAtIndex]
  );

  const close = useCallback(() => {
    player.pause();
    if (MediaControlModule) {
      MediaControlModule.MediaControl.updatePlaybackState(MediaControlModule.PlaybackState.STOPPED).catch(() => {});
    }
    setCurrentSong(null);
    setQueue([]);
    setCurrentIndex(0);
  }, [player]);

  // Mantém os handlers dos controles do sistema sempre apontando para a versão atual.
  const controlsRef = useRef({});
  controlsRef.current = { next, previous, seekTo, player };

  useEffect(() => {
    if (!MediaControlModule) return undefined;
    const { MediaControl, Command } = MediaControlModule;
    let removeListener = null;
    let cancelled = false;

    (async () => {
      try {
        await MediaControl.enableMediaControls({
          capabilities: [
            Command.PLAY,
            Command.PAUSE,
            Command.NEXT_TRACK,
            Command.PREVIOUS_TRACK,
            Command.SEEK,
          ],
          compactCapabilities: [Command.PREVIOUS_TRACK, Command.PLAY, Command.NEXT_TRACK],
        });
        if (cancelled) return;
        removeListener = MediaControl.addListener((event) => {
          const { next: goNext, previous: goPrevious, seekTo: seek, player: audio } = controlsRef.current;
          switch (event.command) {
            case Command.PLAY:
              audio.play();
              break;
            case Command.PAUSE:
              audio.pause();
              break;
            case Command.NEXT_TRACK:
              goNext();
              break;
            case Command.PREVIOUS_TRACK:
              goPrevious();
              break;
            case Command.SEEK:
              if (typeof event.data?.position === 'number') seek(event.data.position);
              break;
            default:
              break;
          }
        });
      } catch {
        // Controles do sistema indisponíveis: a reprodução continua normalmente.
      }
    })();

    return () => {
      cancelled = true;
      if (removeListener) removeListener();
      MediaControl.disableMediaControls().catch(() => {});
    };
  }, []);

  // Metadados (título, artista, capa) da música atual.
  useEffect(() => {
    if (!MediaControlModule || !currentSong) return;
    MediaControlModule.MediaControl.updateMetadata(buildMediaMetadata(currentSong)).catch(() => {});
  }, [currentSong]);

  // Estado de reprodução (tocando/pausado/carregando) refletido nos controles.
  const isPlaying = !!playerStatus?.playing;
  const isBuffering = !!playerStatus?.isBuffering;
  useEffect(() => {
    if (!MediaControlModule || !currentSong) return;
    const { MediaControl, PlaybackState } = MediaControlModule;
    const state = isPlaying
      ? PlaybackState.PLAYING
      : isBuffering
        ? PlaybackState.BUFFERING
        : PlaybackState.PAUSED;
    MediaControl.updatePlaybackState(state, playerStatusRef.current?.currentTime || 0).catch(() => {});
  }, [isPlaying, isBuffering, currentSong]);

  // Avança para a próxima música da fila quando a atual termina.
  useEffect(() => {
    if (playerStatus?.didJustFinish && !didJustFinishHandled.current) {
      didJustFinishHandled.current = true;
      if (queue.length > 1) {
        next();
      }
    } else if (!playerStatus?.didJustFinish) {
      didJustFinishHandled.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerStatus?.didJustFinish]);

  const value = useMemo(
    () => ({
      currentSong,
      currentIndex,
      queue,
      playSong,
      toggle,
      next,
      previous,
      seekTo,
      skipTo,
      close,
    }),
    [
      currentSong,
      currentIndex,
      queue,
      playSong,
      toggle,
      next,
      previous,
      seekTo,
      skipTo,
      close,
    ]
  );
  const playbackState = useMemo(() => ({
    playing: !!playerStatus?.playing,
    isBuffering: !!playerStatus?.isBuffering,
    error: playerStatus?.error,
  }), [playerStatus?.playing, playerStatus?.isBuffering, playerStatus?.error]);

  return (
    <PlayerContext.Provider value={value}>
      <PlaybackStateContext.Provider value={playbackState}>
        <PlayerStatusContext.Provider value={playerStatus}>{children}</PlayerStatusContext.Provider>
      </PlaybackStateContext.Provider>
    </PlayerContext.Provider>
  );
}

export function usePlayerStatus() {
  return useContext(PlayerStatusContext);
}

export function usePlaybackState() {
  return useContext(PlaybackStateContext);
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer precisa ser usado dentro de <PlayerProvider>.');
  }
  return context;
}
