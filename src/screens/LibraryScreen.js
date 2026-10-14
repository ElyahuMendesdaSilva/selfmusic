import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { Host, Icon, FilledTonalIconButton } from '@expo/ui/jetpack-compose';
import Add from '@expo/material-symbols/add.xml';
import { usePlayer } from '../context/PlayerContext';
import { useTheme } from '../context/ThemeContext';
import { useDataCache } from '../context/DataCacheContext';
import { formatDuration, getRecentSongs } from '../services/songsService';
import { withAlpha } from '../theme/themes';
import AddToPlaylistModal from '../components/AddToPlaylistModal';
import { useCapabilities } from '../context/CapabilitiesContext';
import SongCover from '../components/SongCover';

const ItemSeparator = () => <View style={separatorStyles.item} />;
const SectionSeparator = () => <View style={separatorStyles.section} />;
const separatorStyles = StyleSheet.create({ item: { height: 12 }, section: { height: 8 } });

const PlaylistRow = memo(function PlaylistRow({ playlist, onPress }) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const songCount = Number(playlist.total_songs || 0);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Abrir ${playlist.name}`} onPress={() => onPress(playlist.id)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.playlistIcon}>
        <Ionicons name="musical-notes" size={28} color={colors.text} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {playlist.name}
        </Text>
        <Text style={styles.rowSubtitle} numberOfLines={1}>
          Playlist · {songCount} {songCount === 1 ? 'música' : 'músicas'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={withAlpha(colors.text, 0.4)} />
    </Pressable>
  );
});

const SongRow = memo(function SongRow({ song, onPress }) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Reproduzir ${song.title}`}
      onPress={() => onPress(song)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <SongCover uri={song.thumbnail_url} color={colors.text} size={48} iconSize={18} style={styles.songIcon} />
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {song.title}
        </Text>
        <Text style={styles.rowSubtitle} numberOfLines={1}>
          {song.artist || song.album || 'Artista desconhecido'}
        </Text>
      </View>
      <Text style={styles.duration}>{formatDuration(song.duration_seconds)}</Text>
    </Pressable>
  );
});

export default function LibraryScreen({ onOpenPlaylist }) {
  const { playSong } = usePlayer();
  const { theme } = useTheme();
  const {
    playlists,
    recentSongs: songs,
    hasPlaylists,
    hasRecentSongs,
    loadPlaylists,
    loadRecentSongs,
  } = useDataCache();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = useState(() => !hasPlaylists || !hasRecentSongs);
  const [error, setError] = useState(null);
  const [extraSongs, setExtraSongs] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [createVisible, setCreateVisible] = useState(false);
  const didLoadRef = useRef(hasPlaylists && hasRecentSongs);
  const { canCreatePlaylist } = useCapabilities();

  const load = useCallback(async () => {
    if (!didLoadRef.current) setLoading(true);
    setError(null);
    try {
      await Promise.all([loadPlaylists(), loadRecentSongs(20)]);
      didLoadRef.current = true;
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível carregar a biblioteca.');
    } finally {
      setLoading(false);
    }
  }, [loadPlaylists, loadRecentSongs]);

  useEffect(() => {
    load();
  }, [load]);

  const allSongs = useMemo(() => [...songs, ...extraSongs], [songs, extraSongs]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || songs.length < 20) return;
    setLoadingMore(true);
    try {
      const next = await getRecentSongs(20, allSongs.length);
      if (next.length < 20) setHasMore(false);
      setExtraSongs((current) => [
        ...current,
        ...next.filter((song) => !allSongs.some((item) => String(item.id) === String(song.id))),
      ]);
    } catch (requestError) {
      setError(requestError.message || 'Não foi possível carregar mais músicas.');
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, songs.length, allSongs]);

  // No topo: só playlists criadas pelo próprio usuário (as "library" são do admin).
  const myPlaylists = useMemo(
    () => playlists.filter((playlist) => playlist.source_type === 'personal'),
    [playlists]
  );
  const openSong = useCallback((song) => playSong(song, allSongs), [playSong, allSongs]);
  const sections = useMemo(() => {
    const nextSections = [];
    if (myPlaylists.length > 0) nextSections.push({ title: 'Minhas playlists', data: myPlaylists, kind: 'playlist' });
    if (allSongs.length > 0) nextSections.push({ title: 'Todas as músicas', data: allSongs, kind: 'song' });
    return nextSections;
  }, [myPlaylists, allSongs]);
  const renderItem = useCallback(
    ({ item, section }) =>
      section.kind === 'playlist' ? (
        <PlaylistRow playlist={item} onPress={onOpenPlaylist} />
      ) : (
        <SongRow song={item} onPress={openSong} />
      ),
    [onOpenPlaylist, openSong]
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.statusText}>Carregando biblioteca…</Text>
      </View>
    );
  }

  if (error && !hasPlaylists && !hasRecentSongs) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="cloud-offline-outline" size={40} color={withAlpha(colors.text, 0.4)} />
        <Text style={styles.statusText}>{error}</Text>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
          onPress={load}
        >
          <Text style={styles.retryText}>Tentar novamente</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Biblioteca</Text>
        {canCreatePlaylist ? (
          <Host matchContents seedColor={colors.accent} colorScheme="dark">
            <FilledTonalIconButton onClick={() => setCreateVisible(true)}>
              <Icon source={Add} size={24} tint={colors.text} />
            </FilledTonalIconButton>
          </Host>
        ) : null}
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        stickySectionHeadersEnabled={false}
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={7}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.list}
        renderSectionHeader={({ section }) => <Text style={styles.sectionTitle}>{section.title}</Text>}
        ItemSeparatorComponent={ItemSeparator}
        SectionSeparatorComponent={SectionSeparator}
        renderItem={renderItem}
        ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.accent} style={{ marginVertical: 16 }} /> : null}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="musical-notes-outline" size={36} color={withAlpha(colors.text, 0.4)} />
            <Text style={styles.emptyTitle}>Biblioteca vazia</Text>
            <Text style={styles.emptyText}>
              Crie uma playlist ou aguarde o administrador adicionar músicas.
            </Text>
          </View>
        }
      />
      <AddToPlaylistModal visible={createVisible} song={null} onClose={() => setCreateVisible(false)} />
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    header: {
      fontSize: 32,
      fontWeight: '600',
      color: colors.text,
      marginTop: 28,
      marginBottom: 20,
      letterSpacing: -0.5,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 20 },
    list: {
      paddingHorizontal: 20,
      paddingBottom: 144,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
      marginTop: 8,
      marginBottom: 12,
    },
    separator: {
      height: 12,
    },
    sectionGap: {
      height: 8,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    playlistIcon: {
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: withAlpha(colors.text, 0.08),
      alignItems: 'center',
      justifyContent: 'center',
    },
    songIcon: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: withAlpha(colors.text, 0.08),
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    songThumb: {
      width: '100%',
      height: '100%',
    },
    rowInfo: {
      flex: 1,
    },
    rowTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    rowSubtitle: {
      fontSize: 13,
      color: withAlpha(colors.text, 0.6),
      marginTop: 1,
    },
    duration: {
      fontSize: 12,
      color: withAlpha(colors.text, 0.5),
    },
    pressed: {
      opacity: 0.6,
    },
    center: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      gap: 12,
    },
    statusText: {
      fontSize: 14,
      color: withAlpha(colors.text, 0.65),
      textAlign: 'center',
      lineHeight: 20,
    },
    retryButton: {
      height: 42,
      paddingHorizontal: 20,
      borderRadius: 21,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    retryText: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.onAccent,
    },
    empty: {
      alignItems: 'center',
      gap: 8,
      paddingVertical: 48,
      paddingHorizontal: 24,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    emptyText: {
      fontSize: 13,
      color: withAlpha(colors.text, 0.6),
      textAlign: 'center',
      lineHeight: 19,
    },
  });
}
