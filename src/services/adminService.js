import { apiRequest } from './apiClient';

// Todas as operações administrativas documentadas, centralizadas para que as
// telas administrativas não precisem montar URLs nem cabeçalhos diretamente.
export const listAdminSongs = (skip = 0, limit = 100) => apiRequest({ path: `/admin/music?skip=${skip}&limit=${limit}` });
export const uploadSong = (formData) => apiRequest({ path: '/admin/music/upload', method: 'POST', formData, timeoutMs: 10 * 60 * 1000 });
export const deleteSong = (id) => apiRequest({ path: `/admin/music/${id}`, method: 'DELETE' });
export const updateSongMetadata = (id, metadata) => apiRequest({ path: `/admin/music/${id}/metadata`, method: 'PATCH', json: metadata });
export const uploadSongCover = (id, formData) => apiRequest({ path: `/admin/music/${id}/cover`, method: 'PUT', formData });
export const deleteSongCover = (id) => apiRequest({ path: `/admin/music/${id}/cover`, method: 'DELETE' });
export const uploadLibraryPlaylist = (formData) => apiRequest({ path: '/admin/playlists/upload', method: 'POST', formData, timeoutMs: 10 * 60 * 1000 });
export const updateAnyPlaylist = (id, name) => apiRequest({ path: `/admin/playlists/${id}`, method: 'PATCH', json: { name } });
export const deleteAnyPlaylist = (id) => apiRequest({ path: `/admin/playlists/${id}`, method: 'DELETE' });
export const addSongToAnyPlaylist = (playlistId, songId) => apiRequest({ path: `/admin/playlists/${playlistId}/songs/${songId}`, method: 'PUT' });
export const removeSongFromAnyPlaylist = (playlistId, songId) => apiRequest({ path: `/admin/playlists/${playlistId}/songs/${songId}`, method: 'DELETE' });
export const listSettings = () => apiRequest({ path: '/admin/settings' });
export const setRegistrationEnabled = (value) => apiRequest({ path: '/admin/settings/registration', method: 'PATCH', json: { value: String(value) } });
export const getUserPlaylistsEnabled = () => apiRequest({ path: '/admin/settings/user-playlists' });
export const setUserPlaylistsEnabled = (value) => apiRequest({ path: '/admin/settings/user-playlists', method: 'PATCH', json: { value: String(value) } });
export const listUsers = () => apiRequest({ path: '/admin/users' });
export const createUser = (user) => apiRequest({ path: '/admin/users', method: 'POST', json: user });
export const getUser = (id) => apiRequest({ path: `/admin/users/${id}` });
export const updateUser = (id, changes) => apiRequest({ path: `/admin/users/${id}`, method: 'PATCH', json: changes });
export const updateUserPassword = (id, password) => apiRequest({ path: `/admin/users/${id}/password`, method: 'PATCH', json: { password } });
export const deleteUser = (id) => apiRequest({ path: `/admin/users/${id}`, method: 'DELETE' });
export const listMessages = (skip = 0, limit = 100) => apiRequest({ path: `/admin/messages?skip=${skip}&limit=${limit}` });
export const getMessage = (id) => apiRequest({ path: `/admin/messages/${id}` });
export const updateMessage = (id, changes) => apiRequest({ path: `/admin/messages/${id}`, method: 'PATCH', json: changes });
export const deleteMessage = (id) => apiRequest({ path: `/admin/messages/${id}`, method: 'DELETE' });
export const sendMessage = (content) => apiRequest({ path: '/messages/', method: 'POST', json: { content } });
