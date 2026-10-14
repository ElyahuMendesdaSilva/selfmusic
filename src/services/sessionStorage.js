import { getItem, removeItem, setItem } from './storage';

const ACCESS_TOKEN_KEY = 'music_api_access_token';
const REFRESH_TOKEN_KEY = 'music_api_refresh_token';
const USER_KEY = 'music_api_user';

export async function saveSession(accessToken, refreshToken, user) {
  await Promise.all([
    setItem(ACCESS_TOKEN_KEY, accessToken),
    setItem(REFRESH_TOKEN_KEY, refreshToken),
    setItem(USER_KEY, JSON.stringify(user)),
  ]);
}

export const getAccessToken = () => getItem(ACCESS_TOKEN_KEY);
export const getRefreshToken = () => getItem(REFRESH_TOKEN_KEY);

export async function getStoredUser() {
  const raw = await getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function clearSession() {
  await Promise.all([removeItem(ACCESS_TOKEN_KEY), removeItem(REFRESH_TOKEN_KEY), removeItem(USER_KEY)]);
}

export async function updateTokens(newAccessToken, newRefreshToken) {
  await Promise.all([setItem(ACCESS_TOKEN_KEY, newAccessToken), setItem(REFRESH_TOKEN_KEY, newRefreshToken)]);
}
