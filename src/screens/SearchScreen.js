import { useMemo, memo, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { usePlayer } from '../context/PlayerContext';
import { useTheme } from '../context/ThemeContext';
import { useDataCacheActions } from '../context/DataCacheContext';
import { formatDuration } from '../services/songsService';
import { withAlpha } from '../theme/themes';
import SongCover from '../components/SongCover';

const ItemSeparator = () => <View style={styles.separator} />;
const styles = StyleSheet.create({ separator: { height: 12 } });

const SongRow = memo(function SongRow({ song, onPress }) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(song)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <SongCover uri={song.thumbnail_url} color={colors.text} style={styles.cover} />
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {song.title}
        </Text>
        <Text style={styles.rowArtist} numberOfLines={1}>
          {song.artist || song.album || 'Artista desconhecido'}
        </Text>
      </View>
      <Text style={styles.duration}>{formatDuration(song.duration_seconds)}</Text>
      <Ionicons name="play-circle" size={26} color={colors.accent} />
    </Pressable>
  );
});

export default function SearchScreen() {
  const { playSong } = usePlayer();
  const { theme } = useTheme();
  const { loadSearch } = useDataCacheActions();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);
  const abortRef = useRef(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setSearched(false);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError(null);
      try {
        const items = await loadSearch(trimmed, { signal: controller.signal });
        if (cancelled) return;
        // A API normalmente já devolve IDs únicos; deduplicar aqui protege a
        // virtualização de chaves repetidas caso resultados sejam agregados.
        setResults(items.filter((item, index) => items.findIndex((candidate) => String(candidate.id) === String(item.id)) === index));
        setSearched(true);
      } catch (requestError) {
        if (cancelled) return;
        setResults([]);
        setSearched(true);
        setError(requestError.message || 'Não foi possível buscar na API.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [query, loadSearch]);

  const openSong = useCallback((song) => playSong(song, results), [playSong, results]);
  const renderItem = useCallback(({ item }) => <SongRow song={item} onPress={openSong} />, [openSong]);

  const isEmptyQuery = query.trim() === '';

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Buscar músicas</Text>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color={withAlpha(colors.text, 0.6)} />
        <TextInput
          style={styles.input}
          placeholder="Buscar músicas na biblioteca"
          placeholderTextColor={withAlpha(colors.text, 0.5)}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <Pressable accessibilityLabel="Limpar busca" onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={withAlpha(colors.text, 0.6)} />
          </Pressable>
        )}
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={7}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={ItemSeparator}
        ListHeaderComponent={
          loading ? (
            <View style={styles.statusRow}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.statusText}>Buscando…</Text>
            </View>
          ) : !isEmptyQuery && searched && results.length > 0 ? (
            <Text style={styles.sectionTitle}>
              {results.length} {results.length === 1 ? 'resultado' : 'resultados'}
            </Text>
          ) : null
        }
        renderItem={renderItem}
        ListEmptyComponent={
          isEmptyQuery ? (
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={32} color={withAlpha(colors.text, 0.4)} />
              <Text style={styles.emptyTitle}>Busque na biblioteca</Text>
              <Text style={styles.emptyText}>
                Pesquise por título, artista ou álbum. Toque em uma música para reproduzir.
              </Text>
            </View>
          ) : loading ? null : error ? (
            <View style={styles.empty}>
              <Ionicons name="cloud-offline-outline" size={32} color={withAlpha(colors.text, 0.4)} />
              <Text style={styles.emptyTitle}>Não foi possível buscar</Text>
              <Text style={styles.emptyText}>{error}</Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Nada encontrado</Text>
              <Text style={styles.emptyText}>Tente buscar por outro título ou artista.</Text>
            </View>
          )
        }
      />
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 20,
      marginTop: 4,
      marginBottom: 20,
      paddingHorizontal: 16,
      height: 56,
      borderRadius: 18,
      backgroundColor: withAlpha(colors.text, 0.08),
      borderWidth: 1,
      borderColor: withAlpha(colors.text, 0.08),
    },
    input: {
      flex: 1,
      height: '100%',
      fontSize: 16,
      color: colors.text,
    },
    list: {
      paddingHorizontal: 20,
      paddingBottom: 160,
    },
    header: {
      fontSize: 32,
      fontWeight: '600',
      letterSpacing: -0.5,
      color: colors.text,
      marginTop: 28,
      marginBottom: 20,
      marginHorizontal: 20,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    separator: {
      height: 12,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    rowPressed: {
      opacity: 0.7,
    },
    cover: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: withAlpha(colors.text, 0.08),
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    coverImage: {
      width: '100%',
      height: '100%',
    },
    rowInfo: {
      flex: 1,
    },
    rowTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    rowArtist: {
      fontSize: 13,
      color: withAlpha(colors.text, 0.6),
      marginTop: 1,
    },
    duration: {
      fontSize: 12,
      color: withAlpha(colors.text, 0.5),
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 12,
    },
    statusText: {
      fontSize: 14,
      color: withAlpha(colors.text, 0.6),
    },
    empty: {
      alignItems: 'center',
      marginTop: 32,
      gap: 8,
      paddingHorizontal: 12,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    emptyText: {
      fontSize: 13,
      color: withAlpha(colors.text, 0.6),
      textAlign: 'center',
    },
  });
}
