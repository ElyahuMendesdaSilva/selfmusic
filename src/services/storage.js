import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export async function getItem(key) {
  if (Platform.OS !== 'web') return SecureStore.getItemAsync(key);
  try { return globalThis.localStorage?.getItem(key) ?? null; } catch { return null; }
}

export async function setItem(key, value) {
  if (Platform.OS !== 'web') return SecureStore.setItemAsync(key, String(value));
  try { globalThis.localStorage?.setItem(key, String(value)); } catch { /* storage indisponível */ }
}

export async function removeItem(key) {
  if (Platform.OS !== 'web') return SecureStore.deleteItemAsync(key);
  try { globalThis.localStorage?.removeItem(key); } catch { /* storage indisponível */ }
}
