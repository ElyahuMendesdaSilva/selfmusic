import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getDefaultThemeId, getThemeById, THEMES } from '../theme/themes';
import { getStoredThemeId, storeThemeId } from '../services/themeStorage';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(getDefaultThemeId());

  useEffect(() => {
    let active = true;
    getStoredThemeId()
      .then((storedId) => {
        if (active && storedId && getThemeById(storedId)) {
          setThemeId(storedId);
        }
      })
      .catch(() => {
        // sem tema salvo — usa o padrão
      });
    return () => {
      active = false;
    };
  }, []);

  const setTheme = useCallback((nextId) => {
    if (!getThemeById(nextId)) {
      return;
    }
    setThemeId(nextId);
    storeThemeId(nextId).catch(() => {
      // falha ao persistir não impede a troca de tema
    });
  }, []);

  const value = useMemo(
    () => ({
      themeId,
      theme: getThemeById(themeId),
      themes: THEMES,
      setTheme,
    }),
    [themeId, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme precisa ser usado dentro de <ThemeProvider>.');
  }
  return context;
}
