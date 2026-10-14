import { apiRequest } from './apiClient';
import { normalizeSong } from './songsService';

export async function listPlaylists() {
  const data = await apiRequest({ path: '/playlists/', method: 'GET' });
  return Array.isArray(data) ? data : data?.playlists ?? [];
}

export function getPlaylist(playlistId) {
  return apiRequest({ path: `/playlists/${playlistId}`, method: 'GET' }).then((playlist) => ({
    ...playlist,
    songs: Array.isArray(playlist?.songs) ? playlist.songs.map(normalizeSong) : [],
  }));
}

export function createPlaylist(name) {
  return apiRequest({ path: '/playlists/', method: 'POST', json: { name } });
}

export function updatePlaylist(playlistId, name) {
  return apiRequest({ path: `/playlists/${playlistId}`, method: 'PATCH', json: { name } });
}

export function deletePlaylist(playlistId) {
  return apiRequest({ path: `/playlists/${playlistId}`, method: 'DELETE' });
}

export function addSongToPlaylist(playlistId, songId) {
  return apiRequest({ path: `/playlists/${playlistId}/songs/${songId}`, method: 'PUT' });
}

export function removeSongFromPlaylist(playlistId, songId) {
  return apiRequest({ path: `/playlists/${playlistId}/songs/${songId}`, method: 'DELETE' });
}
