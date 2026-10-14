import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_API_URL, normalizeApiUrl, setApiBaseUrl } from '../config';
import { getSavedApiUrl, saveApiUrl as persistApiUrl } from '../services/apiConfigStorage';
import { clearSession } from '../services/sessionStorage';
import { setCachedAccessToken } from '../services/apiClient';

const ApiConfigContext = createContext(null);

export function ApiConfigProvider({ children }) {
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    getSavedApiUrl()
      .then((savedUrl) => {
        const nextUrl = savedUrl || DEFAULT_API_URL;
        setApiBaseUrl(nextUrl);
        if (active) setApiUrl(nextUrl);
      })
      .catch(() => {
        setApiBaseUrl(DEFAULT_API_URL);
        if (active) setApiUrl(DEFAULT_API_URL);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => { active = false; };
  }, []);

  const saveApiUrl = useCallback(async (value) => {
    const nextUrl = normalizeApiUrl(value);
    if (nextUrl === apiUrl) return nextUrl;

    // Tokens pertencem ao servidor anterior e nunca podem ser enviados ao novo.
    await clearSession();
    setCachedAccessToken(null);
    const storedUrl = await persistApiUrl(nextUrl);
    setApiBaseUrl(storedUrl);
    setApiUrl(storedUrl);
    return storedUrl;
  }, [apiUrl]);

  const value = useMemo(() => ({ apiUrl, ready, saveApiUrl }), [apiUrl, ready, saveApiUrl]);
  return <ApiConfigContext.Provider value={value}>{children}</ApiConfigContext.Provider>;
}

export function useApiConfig() {
  const context = useContext(ApiConfigContext);
  if (!context) throw new Error('useApiConfig precisa ser usado dentro de <ApiConfigProvider>.');
  return context;
}
