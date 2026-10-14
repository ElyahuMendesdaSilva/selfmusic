import { useMemo, memo, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useDataCacheActions } from '../context/DataCacheContext';
import { useCapabilities } from '../context/CapabilitiesContext';
import { usePlayer } from '../context/PlayerContext';
import { deletePlaylist, removeSongFromPlaylist, updatePlaylist } from '../services/playlistsService';
import { formatDuration } from '../services/songsService';
import { useTheme } from '../context/ThemeContext'; import { withAlpha } from '../theme/themes';
import SongCover from '../components/SongCover';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PLAYLIST_ROW_HEIGHT = 58;

const PlaylistSongRow = memo(function PlaylistSongRow({ item, songs, manageable, busy, colors, styles, onPlay, onRemove }) {
    return <Pressable onPress={() => onPlay(item, songs)} style={styles.row}>
        <SongCover uri={item.thumbnail_url} color={colors.text} />
        <View style={styles.info}><Text style={styles.song} numberOfLines={1}>{item.title}</Text><Text style={styles.meta} numberOfLines={1}>{item.artist || item.album || 'Artista desconhecido'}</Text></View>
        <Text style={styles.duration}>{formatDuration(item.duration_seconds)}</Text>
        {manageable ? <Pressable hitSlop={8} onPress={() => onRemove(item)} disabled={busy}><Ionicons name="remove-circle-outline" size={22} color="#ff9b9b" /></Pressable> : null}
    </Pressable>;
});

export default function PlaylistScreen({ playlistId, onClose }) {
    const insets = useSafeAreaInsets();
    const { theme } = useTheme(), colors = theme.colors, styles = useMemo(() => createStyles(colors), [colors]); const { playSong } = usePlayer(); const { loadPlaylistDetail, invalidatePlaylist, removePlaylistFromCache, upsertPlaylist } = useDataCacheActions(); const { canManagePlaylist } = useCapabilities();
    const [playlist, setPlaylist] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState(null), [editing, setEditing] = useState(false), [name, setName] = useState(''), [busy, setBusy] = useState(false);
    const load = useCallback(async (force = false) => { setError(null); try { const result = await loadPlaylistDetail(playlistId, { force }); setPlaylist(result); setName(result.name); } catch (e) { setError(e.message); } finally { setLoading(false); } }, [playlistId, loadPlaylistDetail]);
    useEffect(() => { load(); }, [load]);
    const save = async () => { if (!name.trim() || busy) return; setBusy(true); try { const result = await updatePlaylist(playlist.id, name.trim()); setPlaylist((current) => ({ ...current, ...result })); upsertPlaylist(result); setEditing(false); } catch (e) { Alert.alert('Não foi possível renomear', e.message); } finally { setBusy(false); } };
    const removeSong = async (song) => { if (busy) return; setBusy(true); try { await removeSongFromPlaylist(playlist.id, song.id); invalidatePlaylist(playlist.id); setPlaylist((current) => ({ ...current, total_songs: Math.max(0, (current.total_songs || current.songs.length) - 1), songs: current.songs.filter(item => String(item.id) !== String(song.id)) })); } catch (e) { Alert.alert('Não foi possível remover', e.message); } finally { setBusy(false); } };
    const remove = () => Alert.alert('Excluir playlist', `Excluir “${playlist?.name}”?`, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Excluir', style: 'destructive', onPress: async () => { try { await deletePlaylist(playlist.id); removePlaylistFromCache(playlist.id); onClose(); } catch (e) { Alert.alert('Não foi possível excluir', e.message); } } }]);
    if (loading) return <View style={[styles.root, styles.center, { paddingTop: 10 + insets.top }]}><ActivityIndicator color={colors.accent} /></View>; if (error) return <View style={[styles.root, styles.center, { paddingTop: 10 + insets.top }]}><Text style={styles.error}>{error}</Text><Pressable onPress={() => load(true)}><Text style={styles.link}>Tentar novamente</Text></Pressable></View>; if (!playlist) return null;
    const manageable = canManagePlaylist(playlist); const songs = playlist.songs || [];
    const renderItem = ({ item }) => <PlaylistSongRow item={item} songs={songs} manageable={manageable} busy={busy} colors={colors} styles={styles} onPlay={playSong} onRemove={removeSong} />;
    return <View style={[styles.root, { paddingTop: 10 + insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
            <Pressable onPress={onClose}>
                <Ionicons name="chevron-back" size={28} color={colors.text} />
            </Pressable>
            <View style={styles.headerText}>
                {editing ? <TextInput value={name} onChangeText={setName} style={styles.input} autoFocus /> : <Text style={styles.title} numberOfLines={1}>{playlist.name}</Text>}
                <Text style={styles.meta}>{songs.length} {songs.length === 1 ? 'música' : 'músicas'} · {playlist.source_type === 'personal' ? 'Sua playlist' : 'Playlist da biblioteca'}</Text>
            </View>
            {
                manageable ? <Pressable onPress={editing ? save : () => setEditing(true)} disabled={busy}><Ionicons name={editing ? 'checkmark' : 'create-outline'} size={24} color={colors.accent} /></Pressable> : null
            }
        </View>
        <FlatList data={songs} keyExtractor={item => String(item.id)} getItemLayout={(_, index) => ({ length: PLAYLIST_ROW_HEIGHT, offset: PLAYLIST_ROW_HEIGHT * index, index })} initialNumToRender={10} windowSize={7} maxToRenderPerBatch={8} updateCellsBatchingPeriod={50} removeClippedSubviews contentContainerStyle={styles.list} ListEmptyComponent={<View style={styles.center}><Text style={styles.meta}>Esta playlist ainda não possui músicas.</Text></View>} renderItem={renderItem} />
        {manageable ? <Pressable style={[styles.delete, { bottom: 28 + insets.bottom }]} onPress={remove}><Text style={styles.deleteText}>Excluir playlist</Text></Pressable> : null}</View>;
}


function createStyles(colors) {
    return StyleSheet.create({
        root: {
            position: 'absolute',
            inset: 0,
            zIndex: 30,
            backgroundColor: colors.primary,
            paddingTop: 10
        },
        header: {
            minHeight: 72,
            paddingHorizontal: 16,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14
        }, headerText: { flex: 1, justifyContent: 'center' }, title: { fontSize: 21, lineHeight: 26, fontWeight: '700', color: colors.text }, meta: { fontSize: 13, color: withAlpha(colors.text, .6), marginTop: 3 }, input: { color: colors.text, fontSize: 18, fontWeight: '700', borderBottomWidth: 1, borderColor: colors.accent }, list: { padding: 16, paddingBottom: 145 }, row: { height: PLAYLIST_ROW_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: 11 }, info: { flex: 1 }, song: { fontSize: 15, fontWeight: '600', color: colors.text }, duration: { fontSize: 12, color: withAlpha(colors.text, .5) }, center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, padding: 24 }, error: { color: '#ff9b9b', textAlign: 'center' }, link: { color: colors.accent, fontWeight: '700' }, delete: { position: 'absolute', bottom: 28, left: 16, right: 16, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,107,107,.12)' }, deleteText: { color: '#ff9b9b', fontWeight: '700' }
    })
}
