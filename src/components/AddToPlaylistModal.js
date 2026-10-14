import { useMemo, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useDataCache } from '../context/DataCacheContext';
import { useCapabilities } from '../context/CapabilitiesContext';
import { addSongToPlaylist, createPlaylist } from '../services/playlistsService';
import { withAlpha } from '../theme/themes';
import { useTheme } from '../context/ThemeContext';

export default function AddToPlaylistModal({ visible, song, onClose }) {
  const { theme } = useTheme(); const colors = theme.colors; const styles = useMemo(() => createStyles(colors), [colors]);
  const { playlists, loadPlaylists, upsertPlaylist, invalidatePlaylist } = useDataCache();
  const { canCreatePlaylist, denyPersonalPlaylistCreation } = useCapabilities();
  const [loading, setLoading] = useState(false); const [creating, setCreating] = useState(false); const [name, setName] = useState('');
  useEffect(() => { if (visible) loadPlaylists().catch(() => {}); }, [visible, loadPlaylists]);
  const add = useCallback(async (playlist) => {
    if (!song || loading) return;
    setLoading(true);
    try { await addSongToPlaylist(playlist.id, song.id); invalidatePlaylist(playlist.id); Alert.alert('Adicionada', `“${song.title}” foi adicionada a “${playlist.name}”.`); onClose(); }
    catch (error) { Alert.alert('Não foi possível adicionar', error.message); }
    finally { setLoading(false); }
  }, [song, loading, invalidatePlaylist, onClose]);
  const create = async () => {
    const trimmed = name.trim(); if (!trimmed || creating) return;
    setCreating(true);
    try { const playlist = await createPlaylist(trimmed); upsertPlaylist(playlist); setName(''); setCreating(false); if (song) await add(playlist); else { Alert.alert('Playlist criada', `“${playlist.name}” já está na sua Biblioteca.`); onClose(); } }
    catch (error) { if (error.status === 403) denyPersonalPlaylistCreation(); Alert.alert('Não foi possível criar', error.message); setCreating(false); }
  };
  const personal = playlists.filter((item) => item.source_type === 'personal');
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.backdrop}><View style={styles.sheet}>
      <View style={styles.header}><Text style={styles.title}>{song ? 'Adicionar à playlist' : 'Nova playlist'}</Text><Pressable onPress={onClose}><Ionicons name="close" size={24} color={colors.text}/></Pressable></View>
      {song ? <><Text style={styles.caption} numberOfLines={1}>{song.title}</Text>{personal.length ? personal.map((playlist) => <Pressable key={playlist.id} disabled={loading} onPress={() => add(playlist)} style={styles.row}><Ionicons name="musical-notes" size={20} color={colors.accent}/><Text style={styles.rowText}>{playlist.name}</Text>{loading ? <ActivityIndicator color={colors.accent}/> : <Ionicons name="add-circle-outline" size={22} color={colors.text}/>}</Pressable>) : <Text style={styles.empty}>Você ainda não possui playlists.</Text>}</> : null}
      {canCreatePlaylist ? <View style={styles.create}><TextInput value={name} onChangeText={setName} placeholder="Nome da nova playlist" placeholderTextColor={withAlpha(colors.text, .45)} style={styles.input} editable={!creating && !loading}/><Pressable disabled={!name.trim() || creating || loading} onPress={create} style={styles.createButton}>{creating ? <ActivityIndicator color={colors.onAccent}/> : <Text style={styles.createText}>Criar e adicionar</Text>}</Pressable></View> : null}
    </View></View>
  </Modal>;
}
function createStyles(colors) { return StyleSheet.create({ backdrop:{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(0,0,0,.5)'},sheet:{backgroundColor:colors.surface,borderTopLeftRadius:22,borderTopRightRadius:22,padding:20,gap:12},header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},title:{fontSize:19,fontWeight:'700',color:colors.text},caption:{color:withAlpha(colors.text,.6)},row:{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:12},rowText:{flex:1,color:colors.text,fontSize:15},empty:{color:withAlpha(colors.text,.65),paddingVertical:8},create:{gap:8,marginTop:4},input:{height:46,borderRadius:10,paddingHorizontal:12,color:colors.text,backgroundColor:withAlpha(colors.text,.08)},createButton:{height:44,borderRadius:22,alignItems:'center',justifyContent:'center',backgroundColor:colors.accent},createText:{fontWeight:'700',color:colors.onAccent} }); }
