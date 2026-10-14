import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { getPlaylist, listPlaylists } from '../services/playlistsService';
import { getRecentSongs, searchSongs } from '../services/songsService';

const DataCacheContext = createContext(null);
const DataCacheActionsContext = createContext(null);

// Playlists são privadas e podem mudar após uma importação/exclusão. O catálogo
// muda menos, enquanto resultados de busca podem ficar obsoletos mais rápido.
const TTL = {
  playlists: 30 * 1000,
  recentSongs: 2 * 60 * 1000,
  search: 60 * 1000,
};

function remember(map, key, value) {
  map.delete(key);
  map.set(key, value);
  if (map.size > 30) map.delete(map.keys().next().value);
}

function createCache() {
  return {
    playlists: { data: [], updatedAt: 0 },
    recentSongs: { data: [], limit: 0, updatedAt: 0 },
    searches: new Map(),
    playlistDetails: new Map(),
  };
}

export function DataCacheProvider({ children }) {
  const { user, status } = useAuth();
  const scope = status === 'signedIn' && user?.id != null ? String(user.id) : null;
  return <ScopedDataCacheProvider key={scope ?? 'anonymous'} scope={scope}>{children}</ScopedDataCacheProvider>;
}

function ScopedDataCacheProvider({ children, scope }) {
  const cacheRef = useRef(createCache());
  const requestsRef = useRef(new Map());
  const scopeRef = useRef(scope);
  const [, setVersion] = useState(0);

  const publish = useCallback(() => setVersion((value) => value + 1), []);

  const request = useCallback(async (key, fetcher, apply) => {
    const requestMap = requestsRef.current;
    const current = requestMap.get(key);
    if (current) return current;

    const requestScope = scopeRef.current;
    const promise = (async () => {
      try {
        const data = await fetcher();
        if (scopeRef.current === requestScope) {
          apply(data);
          publish();
        }
        return data;
      } finally {
        requestMap.delete(key);
      }
    })();
    requestMap.set(key, promise);
    return promise;
  }, [publish]);

  const loadPlaylists = useCallback(async ({ force = false } = {}) => {
    const entry = cacheRef.current.playlists;
    if (!force && !entry.stale && entry.updatedAt && Date.now() - entry.updatedAt < TTL.playlists) {
      return entry.data;
    }
    return request('playlists', listPlaylists, (data) => {
      cacheRef.current.playlists = { data, updatedAt: Date.now(), stale: false };
    });
  }, [request]);

  const loadRecentSongs = useCallback(async (limit = 20, { force = false } = {}) => {
    const entry = cacheRef.current.recentSongs;
    const valid = entry.updatedAt && Date.now() - entry.updatedAt < TTL.recentSongs;
    if (!force && valid && entry.limit >= limit) {
      return entry.data.slice(0, limit);
    }
    const key = `recentSongs:${Math.max(limit, entry.limit)}`;
    return request(key, () => getRecentSongs(Math.max(limit, entry.limit)), (data) => {
      cacheRef.current.recentSongs = {
        data,
        limit: Math.max(limit, entry.limit),
        updatedAt: Date.now(),
      };
    }).then((data) => data.slice(0, limit));
  }, [request]);

  const loadSearch = useCallback(async (query, { force = false, signal } = {}) => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return [];
    const entry = cacheRef.current.searches.get(normalized);
    if (!force && entry?.updatedAt && Date.now() - entry.updatedAt < TTL.search) {
      return entry.data;
    }
    // A busca digitada pode ser cancelada sem cancelar uma busca compartilhada
    // já em cache. Assim, termos ultrapassados deixam de ocupar rede/UI.
    if (signal) {
      const data = await searchSongs(query.trim(), 20, { signal });
      if (!signal.aborted) remember(cacheRef.current.searches, normalized, { data, updatedAt: Date.now() });
      return data;
    }
    return request(`search:${normalized}`, () => searchSongs(query.trim()), (data) => {
      remember(cacheRef.current.searches, normalized, { data, updatedAt: Date.now() });
    });
  }, [request]);

  const removePlaylistFromCache = useCallback((playlistId) => {
    const entry = cacheRef.current.playlists;
    if (!entry.updatedAt) return;
    cacheRef.current.playlists = {
      data: entry.data.filter((playlist) => String(playlist.id) !== String(playlistId)),
      updatedAt: Date.now(),
    };
    publish();
  }, [publish]);

  const upsertPlaylist = useCallback((playlist) => {
    const entry = cacheRef.current.playlists;
    const existing = entry.data.filter((item) => String(item.id) !== String(playlist.id));
    cacheRef.current.playlists = { data: [playlist, ...existing], updatedAt: Date.now() };
    publish();
  }, [publish]);

  const loadPlaylistDetail = useCallback(async (playlistId, { force = false } = {}) => {
    const entry = cacheRef.current.playlistDetails.get(String(playlistId));
    if (!force && entry && Date.now() - entry.updatedAt < TTL.playlists) return entry.data;
    return request(`playlist:${playlistId}`, () => getPlaylist(playlistId), (data) => {
      cacheRef.current.playlistDetails.set(String(playlistId), { data, updatedAt: Date.now() });
      if (cacheRef.current.playlistDetails.size > 30) cacheRef.current.playlistDetails.delete(cacheRef.current.playlistDetails.keys().next().value);
      upsertPlaylist(data);
    });
  }, [request, upsertPlaylist]);

  const invalidatePlaylist = useCallback((playlistId) => {
    cacheRef.current.playlistDetails.delete(String(playlistId));
    cacheRef.current.playlists.stale = true;
    publish();
  }, [publish]);

  const playlists = cacheRef.current.playlists.data;
  const recentSongs = cacheRef.current.recentSongs.data;
  const hasPlaylists = Boolean(cacheRef.current.playlists.updatedAt);
  const hasRecentSongs = Boolean(cacheRef.current.recentSongs.updatedAt);

  const data = useMemo(() => ({ playlists, recentSongs, hasPlaylists, hasRecentSongs }), [playlists, recentSongs, hasPlaylists, hasRecentSongs]);
  const actions = useMemo(() => ({
    loadPlaylists,
    loadRecentSongs,
    loadSearch,
    removePlaylistFromCache,
    upsertPlaylist,
    loadPlaylistDetail,
    invalidatePlaylist,
  }), [loadPlaylists, loadRecentSongs, loadSearch, removePlaylistFromCache, upsertPlaylist, loadPlaylistDetail, invalidatePlaylist]);

  return <DataCacheActionsContext.Provider value={actions}><DataCacheContext.Provider value={data}>{children}</DataCacheContext.Provider></DataCacheActionsContext.Provider>;
}

export function useDataCache() {
  const data = useContext(DataCacheContext);
  const actions = useContext(DataCacheActionsContext);
  if (!data || !actions) {
    throw new Error('useDataCache precisa ser usado dentro de <DataCacheProvider>.');
  }
  return { ...data, ...actions };
}

export function useDataCacheActions() {
  const context = useContext(DataCacheActionsContext);
  if (!context) throw new Error('useDataCacheActions precisa ser usado dentro de <DataCacheProvider>.');
  return context;
}
