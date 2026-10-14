import { useMemo, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Slider from '@react-native-community/slider';
import Ionicons from '@react-native-vector-icons/ionicons';
import { usePlayer, usePlaybackState, usePlayerStatus } from '../context/PlayerContext';
import { useTheme } from '../context/ThemeContext';
import { formatDuration } from '../services/songsService';
import { withAlpha } from '../theme/themes';
import AddToPlaylistModal from '../components/AddToPlaylistModal';
import SongCover from '../components/SongCover';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PlayerScreen({ onClose }) {
  const {
    currentSong,
    currentIndex,
    queue,
    toggle,
    next,
    previous,
    seekTo,
    skipTo,
  } = usePlayer();
  const [showQueue, setShowQueue] = useState(false);
  const [playlistModalVisible, setPlaylistModalVisible] = useState(false);
  const playbackState = usePlaybackState();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const entrance = useRef(new Animated.Value(0)).current;
  const playScale = useRef(new Animated.Value(1)).current;
  const queueOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entrance, { toValue: 1, duration: 280, useNativeDriver: true }).start();
  }, [entrance]);

  useEffect(() => {
    Animated.timing(queueOpacity, { toValue: showQueue ? 1 : 0, duration: 200, useNativeDriver: true }).start();
  }, [showQueue, queueOpacity]);

  const handleClose = () => {
    Animated.timing(entrance, { toValue: 0, duration: 180, useNativeDriver: true }).start(onClose);
  };

  const handlePlayPressIn = () => {
    Animated.spring(playScale, { toValue: 0.92, friction: 6, useNativeDriver: true }).start();
  };

  const handlePlayPressOut = () => {
    Animated.spring(playScale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  };

  if (!currentSong) {
    return null;
  }

  const { playing, isBuffering: buffering } = playbackState || {};
  const upNext = queue.slice(currentIndex + 1);

  return (
    <Animated.View
      style={[
        styles.root,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 },
        {
          opacity: entrance,
          transform: [
            {
              translateY: entrance.interpolate({
                inputRange: [0, 1],
                outputRange: [28, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar player"
          hitSlop={10}
          onPress={handleClose}
          style={styles.topButton}
        >
          <Ionicons name="chevron-down" size={28} color={colors.text} />
        </Pressable>
        <Text style={styles.topTitle} numberOfLines={1}>
          Agora tocando
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Adicionar à playlist" onPress={() => setPlaylistModalVisible(true)} style={styles.topButton}>
          <Ionicons name="add-circle-outline" size={25} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.coverArea}>
        <SongCover uri={currentSong.thumbnail_url} color={colors.text} size={340} radius={16} iconSize={90} style={styles.cover} />
      </View>

      <View style={styles.songInfo}>
        <Text style={styles.songTitle} numberOfLines={2}>
          {currentSong.title}
        </Text>
        <Text style={styles.songArtist} numberOfLines={1}>
          {currentSong.artist || currentSong.album || 'Artista desconhecido'}
        </Text>
      </View>

      <ProgressTimeline colors={colors} styles={styles} seekTo={seekTo} />

      <View style={styles.controlsRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ver ordem das músicas"
          onPress={() => setShowQueue((value) => !value)}
          style={[styles.sideButton, showQueue && styles.sideButtonActive]}
        >
          <Ionicons
            name="list"
            size={24}
            color={showQueue ? colors.accent : withAlpha(colors.text, 0.8)}
          />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={previous}
          style={styles.roundButton}
        >
          <Ionicons name="play-skip-back" size={30} color={colors.text} />
        </Pressable>

        <Animated.View style={{ transform: [{ scale: playScale }] }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={playing ? 'Pausar' : 'Reproduzir'}
            onPress={toggle}
            onPressIn={handlePlayPressIn}
            onPressOut={handlePlayPressOut}
            style={styles.playButton}
          >
            {buffering ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <Ionicons name={playing ? 'pause' : 'play'} size={34} color={colors.onAccent} />
            )}
          </Pressable>
        </Animated.View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Avançar"
          onPress={next}
          style={styles.roundButton}
        >
          <Ionicons name="play-skip-forward" size={30} color={colors.text} />
        </Pressable>

        <View style={styles.sideButton} />
      </View>

      {showQueue ? (
        <Animated.View style={[styles.queuePanel, { opacity: queueOpacity }]}>
          <Text style={styles.queueTitle}>
            {upNext.length > 0 ? `Em seguida (${upNext.length})` : 'Fila vazia'}
          </Text>
          {upNext.length > 0 ? (
            <FlatList style={styles.queueList} data={upNext} keyExtractor={(song) => String(song.id)} getItemLayout={(_, index) => ({ length: 50, offset: 50 * index, index })} renderItem={({ item: song, index }) => (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => skipTo(currentIndex + 1 + index)}
                  style={({ pressed }) => [styles.queueRow, pressed && styles.pressed]}
                >
                  <Text style={styles.queuePosition}>{currentIndex + 2 + index}</Text>
                  <View style={styles.queueCover}>
                    <SongCover uri={song.thumbnail_url} color={colors.text} size={36} radius={6} iconSize={16} />
                  </View>
                  <View style={styles.queueRowInfo}>
                    <Text style={styles.queueRowTitle} numberOfLines={1}>
                      {song.title}
                    </Text>
                    <Text style={styles.queueRowArtist} numberOfLines={1}>
                      {song.artist || 'Artista desconhecido'}
                    </Text>
                  </View>
                  <Ionicons name="play" size={16} color={colors.accent} />
                </Pressable>
              )} />
          ) : (
            <Text style={styles.queueEmpty}>
              Essa é a única música da fila. Toque em outras músicas para adicioná-las.
            </Text>
          )}
        </Animated.View>
      ) : null}
      <AddToPlaylistModal visible={playlistModalVisible} song={currentSong} onClose={() => setPlaylistModalVisible(false)} />
    </Animated.View>
  );
}

function ProgressTimeline({ colors, styles, seekTo }) {
  const status = usePlayerStatus();
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);
  const duration = Number(status?.duration) || 0;
  const position = scrubbing ? scrubValue : Number(status?.currentTime) || 0;
  return (
    <View style={styles.timeline}>
      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={Math.max(duration, 0.001)}
        value={Math.min(position, Math.max(duration, 0.001))}
        onSlidingStart={() => setScrubbing(true)}
        onValueChange={setScrubValue}
        onSlidingComplete={(value) => { setScrubbing(false); seekTo(value); }}
        minimumTrackTintColor={colors.accent}
        maximumTrackTintColor={withAlpha(colors.text, 0.25)}
        thumbTintColor={colors.text}
        disabled={duration <= 0}
      />
      <View style={styles.timesRow}>
        <Text style={styles.timeLabel}>{formatDuration(position)}</Text>
        <Text style={styles.timeLabel}>{formatDuration(duration)}</Text>
      </View>
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
  root: {
    flex: 1,
    inset: 0,
    zIndex: 40,
    backgroundColor: colors.primary,
    paddingTop: 12,
    paddingHorizontal: 24,
    position: "absolute"
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  topButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    color: withAlpha(colors.text, 0.9),
  },
  coverArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  cover: {
    width: '100%',
    maxWidth: 340,
    aspectRatio: 1,
    borderRadius: 28,
    backgroundColor: withAlpha(colors.text, 0.1),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  songInfo: {
    alignItems: 'center',
    marginBottom: 12,
  },
  songTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  songArtist: {
    fontSize: 14,
    color: withAlpha(colors.text, 0.65),
    marginTop: 4,
    textAlign: 'center',
  },
  timeline: {
    marginTop: 8,
  },
  slider: {
    width: '100%',
    height: 36,
  },
  timesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -4,
  },
  timeLabel: {
    fontSize: 12,
    color: withAlpha(colors.text, 0.6),
    fontVariant: ['tabular-nums'],
  },
  controlsRow: {
    width:"100%",
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    marginTop: 8,
    marginBottom: 12,
  },
  sideButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideButtonActive: {
    backgroundColor: withAlpha(colors.accent, 0.15),
  },
  roundButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: withAlpha(colors.text, 0.1),
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queuePanel: {
    maxHeight: 260,
    backgroundColor: withAlpha(colors.text, 0.07),
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop:-40,
    marginBottom:20
  },
  queueTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: withAlpha(colors.text, 0.85),
    marginBottom: 6,
  },
  queueList: {
    flexGrow: 0,
  },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 7,
  },
  queuePosition: {
    width: 22,
    fontSize: 13,
    fontWeight: '600',
    color: withAlpha(colors.text, 0.45),
    textAlign: 'center',
  },
  queueCover: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: withAlpha(colors.text, 0.1),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  queueCoverImage: {
    width: '100%',
    height: '100%',
  },
  queueRowInfo: {
    flex: 1,
  },
  queueRowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  queueRowArtist: {
    fontSize: 12,
    color: withAlpha(colors.text, 0.55),
    marginTop: 1,
  },
  queueEmpty: {
    fontSize: 13,
    color: withAlpha(colors.text, 0.55),
    textAlign: 'center',
    paddingVertical: 10,
  },
  pressed: {
    opacity: 0.6,
  },
  });
}
