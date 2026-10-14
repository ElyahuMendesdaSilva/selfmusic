import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as authService from '../services/authService';
import * as sessionStorage from '../services/sessionStorage';
import { useApiConfig } from './ApiConfigContext';
import { setCachedAccessToken, setSessionExpiredHandler } from '../services/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { apiUrl, ready: apiConfigReady } = useApiConfig();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [status, setStatus] = useState('loading');
  const restoredForUrl = useRef(null);

  useEffect(() => {
    if (!apiConfigReady || restoredForUrl.current === apiUrl) {
      return undefined;
    }
    restoredForUrl.current = apiUrl;
    let active = true;

    async function restoreSession() {
      try {
        const [storedToken, storedRefreshToken, storedUser] = await Promise.all([
          sessionStorage.getAccessToken(),
          sessionStorage.getRefreshToken(),
          sessionStorage.getStoredUser(),
        ]);
        
        if (!storedToken || !storedRefreshToken) {
          if (active) setStatus('signedOut');
          return;
        }
        
        setCachedAccessToken(storedToken);
        if (active) {
          setToken(storedToken);
          setUser(storedUser);
          if (storedUser) setStatus('signedIn');
        }
        try {
          const me = await authService.apiMe(storedToken);
          if (active) {
            setUser(me);
            setStatus('signedIn');
          }
        } catch (error) {
          // O apiClient já faz refresh em 401; falhas de rede mantêm a sessão local.
          if (error.status === 401) {
            await sessionStorage.clearSession();
            setCachedAccessToken(null);
            if (active) setStatus('signedOut');
          } else if (active && !storedUser) {
            setStatus('signedOut');
          }
        }
      } catch {
        if (active) setStatus('signedOut');
      }
    }

    restoreSession();
    return () => {
      active = false;
    };
  }, [apiConfigReady, apiUrl]);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      setToken(null);
      setUser(null);
      setStatus('signedOut');
    });
    return () => setSessionExpiredHandler(null);
  }, []);

  const startSession = useCallback(async (accessToken, refreshToken, loginUser) => {
    const me = loginUser || (await authService.apiMe(accessToken));
    await sessionStorage.saveSession(accessToken, refreshToken, me);
    setCachedAccessToken(accessToken);
    setToken(accessToken);
    setUser(me);
    setStatus('signedIn');
    return me;
  }, []);

  const signIn = useCallback(
    async (email, password) => {
      const data = await authService.apiLogin(email, password);
      const accessToken = data?.access_token;
      const refreshToken = data?.refresh_token;
      if (!accessToken || !refreshToken) {
        throw new Error('A API não retornou os tokens de acesso necessários.');
      }
      return startSession(accessToken, refreshToken, data.user);
    },
    [startSession]
  );

  const signUp = useCallback(
    async ({ username, email, password }) => {
      const data = await authService.apiRegister({ username, email, password });
      const accessToken = data?.access_token;
      const refreshToken = data?.refresh_token;
      if (accessToken && refreshToken) {
        return startSession(accessToken, refreshToken, data?.user);
      }
      // Registro sem token na resposta: entra automaticamente com o e-mail.
      return signIn(email, password);
    },
    [signIn, startSession]
  );

  const signOut = useCallback(async () => {
    try {
      const refreshToken = await sessionStorage.getRefreshToken();
      if (refreshToken) {
        await authService.apiLogout(refreshToken);
      }
    } catch (error) {
      // Mesmo se a chamada de logout falhar, limpa a sessão local
      console.warn('Erro ao fazer logout na API:', error.message);
    } finally {
      await sessionStorage.clearSession();
      setCachedAccessToken(null);
      setToken(null);
      setUser(null);
      setStatus('signedOut');
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      status,
      signIn,
      signUp,
      signOut,
    }),
    [user, token, status, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth precisa ser usado dentro de <AuthProvider>.');
  }
  return context;
}
