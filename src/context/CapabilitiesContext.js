import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

const CapabilitiesContext = createContext(null);

// A API só expõe a configuração allow_user_playlists ao administrador. Para
// usuários comuns o estado começa como "desconhecido" e uma resposta 403 é a
// fonte de verdade que desabilita a ação imediatamente nesta sessão.
export function CapabilitiesProvider({ children }) {
  const { user } = useAuth();
  const [personalPlaylistCreation, setPersonalPlaylistCreation] = useState('unknown');
  const isAdmin = user?.role === 'admin';
  const canCreatePlaylist = isAdmin || personalPlaylistCreation !== 'denied';
  const canManagePlaylist = useCallback((playlist) => {
    if (!playlist) return false;
    return isAdmin || playlist.source_type === 'personal';
  }, [isAdmin]);
  const denyPersonalPlaylistCreation = useCallback(() => setPersonalPlaylistCreation('denied'), []);
  const value = useMemo(() => ({
    isAdmin,
    canCreatePlaylist,
    canManagePlaylist,
    denyPersonalPlaylistCreation,
  }), [isAdmin, canCreatePlaylist, canManagePlaylist, denyPersonalPlaylistCreation]);
  return <CapabilitiesContext.Provider value={value}>{children}</CapabilitiesContext.Provider>;
}

export function useCapabilities() {
  const context = useContext(CapabilitiesContext);
  if (!context) throw new Error('useCapabilities precisa ser usado dentro de <CapabilitiesProvider>.');
  return context;
}
