import { useMemo, useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Ionicons from "@react-native-vector-icons/ionicons";
import { usePlayer } from "../context/PlayerContext";
import { useTheme } from "../context/ThemeContext";
import { useDataCache } from "../context/DataCacheContext";
import { withAlpha } from "../theme/themes";
import SongCover from "../components/SongCover";

const COVER_COLORS = [
  "#1e488f",
  "#a8402f",
  "#1d6b3e",
  "#5b2f8f",
  "#b08020",
  "#8f2f3a",
  "#2f8f6e",
  "#3a5e8f",
];

function colorFromString(value) {
  const text = String(value || "");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return COVER_COLORS[hash % COVER_COLORS.length];
}

function SectionTitle({ children }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function PlaylistCard({ playlist }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);
  const songCount = Number(playlist.total_songs || 0);
  return (
    <View style={styles.card}>
      <View
        style={[
          styles.cover,
          { backgroundColor: colorFromString(playlist.name) },
        ]}
      >
        <Ionicons name="musical-notes" size={30} color="#ffffff" />
      </View>
      <Text style={styles.cardTitle} numberOfLines={1}>
        {playlist.name}
      </Text>
      <Text style={styles.cardSubtitle} numberOfLines={1}>
        {songCount} {songCount === 1 ? "música" : "músicas"}
      </Text>
    </View>
  );
}

function SongCard({ song, onPress }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Reproduzir ${song.title}`}
      onPress={() => onPress(song)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <SongCover
        uri={song.thumbnail_url}
        color={theme.colors.text}
        size={136}
        radius={18}
        iconSize={30}
        style={[styles.cover, { backgroundColor: colorFromString(song.title) }]}
      />
      <Text style={styles.cardTitle} numberOfLines={1}>
        {song.title}
      </Text>
      <Text style={styles.cardSubtitle} numberOfLines={1}>
        {song.artist || "Artista desconhecido"}
      </Text>
    </Pressable>
  );
}

function RecommendedRow({ song, position, onPress }) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Reproduzir ${song.title}`}
      onPress={() => onPress(song)}
      style={({ pressed }) => [styles.recommended, pressed && styles.pressed]}
    >
      <Text style={styles.rank}>{position}</Text>
      <SongCover
        uri={song.thumbnail_url}
        color={colors.text}
        size={48}
        radius={12}
        style={[
          styles.smallCover,
          { backgroundColor: colorFromString(song.title) },
        ]}
      />
      <View style={styles.recommendedInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {song.title}
        </Text>
        <Text style={styles.cardSubtitle} numberOfLines={1}>
          {song.artist || "Artista desconhecido"}
        </Text>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const { playSong } = usePlayer();
  const { theme } = useTheme();
  const {
    playlists,
    recentSongs: cachedSongs,
    hasPlaylists,
    hasRecentSongs,
    loadPlaylists,
    loadRecentSongs,
  } = useDataCache();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = useState(
    () => !hasPlaylists || !hasRecentSongs,
  );
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const didLoadRef = useRef(hasPlaylists && hasRecentSongs);

  const load = useCallback(
    async ({ force = false } = {}) => {
      if (!force && !didLoadRef.current) setLoading(true);
      setError(null);
      try {
        await Promise.all([
          loadPlaylists({ force }),
          loadRecentSongs(20, { force }),
        ]);
        didLoadRef.current = true;
      } catch (requestError) {
        setError(
          requestError.message || "Não foi possível carregar os dados da API.",
        );
      } finally {
        setLoading(false);
      }
    },
    [loadPlaylists, loadRecentSongs],
  );

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load({ force: true });
    setRefreshing(false);
  }, [load]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.statusText}>Carregando sua biblioteca…</Text>
      </View>
    );
  }

  if (error && !hasPlaylists && !hasRecentSongs) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons
          name="cloud-offline-outline"
          size={40}
          color={withAlpha(colors.text, 0.4)}
        />
        <Text style={styles.statusText}>{error}</Text>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.pressed,
          ]}
          onPress={() => load({ force: true })}
        >
          <Text style={styles.retryText}>Tentar novamente</Text>
        </Pressable>
      </View>
    );
  }

  const recentSongs = cachedSongs.slice(0, 10);
  const recommended = cachedSongs.slice(10, 15);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.accent}
          colors={[colors.accent]}
          progressBackgroundColor={colors.surface}
        />
      }
    >
      <Text style={styles.header}>Início</Text>

      {error ? <Text style={styles.refreshError}>{error}</Text> : null}

      {recentSongs.length > 0 ? (
        <>
          <SectionTitle>Últimas músicas</SectionTitle>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.row}
          >
            {recentSongs.map((song) => (
              <SongCard
                key={song.id}
                song={song}
                onPress={(song) => playSong(song, recentSongs)}
              />
            ))}
          </ScrollView>
        </>
      ) : null}

      {recommended.length > 0 ? (
        <>
          <SectionTitle>Recomendadas para você</SectionTitle>
          <View style={styles.recommendedList}>
            {recommended.map((song, index) => (
              <RecommendedRow
                key={song.id}
                song={song}
                position={index + 1}
                onPress={(item) => playSong(item, recommended)}
              />
            ))}
          </View>
        </>
      ) : null}

      {playlists.length === 0 && cachedSongs.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons
            name="musical-notes-outline"
            size={36}
            color={withAlpha(colors.text, 0.4)}
          />
          <Text style={styles.emptyTitle}>Nada por aqui ainda</Text>
          <Text style={styles.emptyText}>
            As músicas e playlists disponibilizadas pelo administrador
            aparecerão aqui.
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "transparent",
    },
    content: {
      paddingHorizontal: 20,
      paddingTop: 28,
      paddingBottom: 144,
    },
    header: {
      fontSize: 32,
      fontWeight: "600",
      color: colors.text,
      letterSpacing: -0.5,
    },
    sectionTitle: {
      fontSize: 22,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 16,
      marginTop: 8,
    },
    row: {
      gap: 16,
      paddingBottom: 8,
    },
    card: {
      width: 136,
    },
    cover: {
      width: 136,
      height: 136,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      marginBottom: 10,
    },
    coverImage: {
      width: "100%",
      height: "100%",
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    cardSubtitle: {
      fontSize: 13,
      color: withAlpha(colors.text, 0.6),
      marginTop: 1,
    },
    recommendedList: {
      gap: 10,
    },
    recommended: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: withAlpha(colors.text, 0.06),
      borderRadius: 18,
      padding: 12,
    },
    rank: {
      width: 22,
      textAlign: "center",
      fontSize: 14,
      fontWeight: "600",
      color: withAlpha(colors.text, 0.6),
    },
    smallCover: {
      width: 48,
      height: 48,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    recommendedInfo: {
      flex: 1,
    },
    center: {
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
      gap: 12,
    },
    statusText: {
      fontSize: 14,
      color: withAlpha(colors.text, 0.65),
      textAlign: "center",
      lineHeight: 20,
    },
    refreshError: {
      fontSize: 13,
      color: "#ff9b9b",
      marginBottom: 12,
      textAlign: "center",
    },
    retryButton: {
      height: 42,
      paddingHorizontal: 20,
      borderRadius: 21,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    retryText: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.onAccent,
    },
    pressed: {
      opacity: 0.6,
    },
    empty: {
      alignItems: "center",
      gap: 8,
      paddingVertical: 40,
      paddingHorizontal: 24,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    emptyText: {
      fontSize: 13,
      color: withAlpha(colors.text, 0.6),
      textAlign: "center",
      lineHeight: 19,
    },
  });
}
