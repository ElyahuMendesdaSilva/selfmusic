import { getItem, setItem } from './storage';

const THEME_KEY = 'music_api_theme_id';

export const getStoredThemeId = () => getItem(THEME_KEY);
export const storeThemeId = (themeId) => setItem(THEME_KEY, themeId);
