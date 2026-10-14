import { getItem, setItem } from './storage';
import { normalizeApiUrl } from '../config';

const API_URL_KEY = 'music_api_base_url';

export async function getSavedApiUrl() {
  const value = await getItem(API_URL_KEY);
  if (!value) return null;
  try { return normalizeApiUrl(value); } catch { return null; }
}

export async function saveApiUrl(value) {
  const url = normalizeApiUrl(value);
  await setItem(API_URL_KEY, url);
  return url;
}
