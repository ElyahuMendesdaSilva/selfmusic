import { useMemo, useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { usePlayer, usePlaybackState } from '../context/PlayerContext';
import { useTheme } from '../context/ThemeContext';
import { withAlpha } from '../theme/themes';
import SongCover from './SongCover';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NowPlayingBar({ onOpenPlayer }) {
  const { currentSong, toggle, close } = usePlayer();
  const playerStatus = usePlaybackState();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 240, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 260, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);

  if (!currentSong) {
    return null;
  }

  const buffering = playerStatus?.isBuffering;
  const playbackError = playerStatus?.error;

  return (
    <Animated.View
      style={[styles.container, { opacity, bottom: 84 + insets.bottom, transform: [{ translateY }] }]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Abrir player"
        onPress={onOpenPlayer}
        style={styles.info}
      >
        <View style={styles.cover}>
          <SongCover uri={currentSong.thumbnail_url} size={44} radius={12} color={colors.text} />
        </View>
        <View style={styles.texts}>
          <Text style={styles.title} numberOfLines={1}>
            {currentSong.title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {currentSong.artist}
          </Text>
          {playbackError ? (
            <Text style={styles.error} numberOfLines={1}>
              Erro ao reproduzir
            </Text>
          ) : null}
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={playerStatus?.playing ? 'Pausar' : 'Reproduzir'}
        hitSlop={8}
        onPress={toggle}
        style={styles.playButton}
      >
        <Ionicons
          name={buffering ? 'ellipsis-horizontal' : playerStatus?.playing ? 'pause' : 'play'}
          size={26}
          color={colors.onAccent}
        />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fechar player"
        hitSlop={8}
        onPress={close}
        style={styles.closeButton}
      >
        <Ionicons name="close" size={22} color={withAlpha(colors.text, 0.7)} />
      </Pressable>
    </Animated.View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 40,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: withAlpha(colors.surface, 0.98),
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: withAlpha(colors.text, 0.08),
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 40,
  },
  info: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cover: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: withAlpha(colors.text, 0.12),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  texts: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: withAlpha(colors.text, 0.6),
    marginTop: 1,
  },
  error: {
    fontSize: 11,
    color: '#ff9b9b',
    marginTop: 1,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    padding: 4,
  },
  });
}
