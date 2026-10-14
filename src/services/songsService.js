import { getApiBaseUrl } from '../config';
import { apiRequest, getFreshAccessToken } from './apiClient';

// A API atual envia URLs absolutas, mas versões anteriores e proxies podem
// enviar o caminho relativo (/songs/:id/cover). Normalizar na fronteira evita
// que cada tela tente carregar um URI inválido e mantém o backend inalterado.
export function resolveMediaUrl(value) {
  const url = String(value || '').trim();
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${getApiBaseUrl()}${url.startsWith('/') ? '' : '/'}${url}`;
}

export function normalizeSong(song) {
  return song ? { ...song, thumbnail_url: resolveMediaUrl(song.thumbnail_url) } : song;
}

function normalizeSongs(data) {
  return (Array.isArray(data) ? data : data?.items ?? []).map(normalizeSong);
}

export function formatDuration(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

export async function searchSongs(query, limit = 20, { signal } = {}) {
  const data = await apiRequest({
    path: `/songs/search?q=${encodeURIComponent(query)}&limit=${limit}`,
    method: 'GET',
    signal,
  });
  return normalizeSongs(data);
}

// Feed global de "últimas músicas" (GET /songs): devolve as músicas mais
// recentes da biblioteca compartilhada, sem termo de busca.
export async function getRecentSongs(limit = 20, skip = 0) {
  const data = await apiRequest({
    path: `/songs/?skip=${skip}&limit=${limit}`,
    method: 'GET',
  });
  return normalizeSongs(data);
}

// Monta a fonte de áudio para o player, incluindo o header de autorização
// exigido pelo endpoint GET /songs/{id}/stream.
export async function createStreamSource(songId) {
  const token = await getFreshAccessToken();
  return {
    uri: `${getApiBaseUrl()}/songs/${songId}/stream`,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  };
}
