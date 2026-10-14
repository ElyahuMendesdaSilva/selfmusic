import { getApiBaseUrl } from '../config';

// Módulo de baixo nível: não importa apiClient nem authService, removendo o ciclo.
export async function refreshAccessToken(refreshToken, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
      signal: controller.signal,
    });
    let data = null;
    try { data = await response.json(); } catch { /* resposta inválida */ }
    if (!response.ok || !data?.access_token) {
      throw new Error('Não foi possível renovar a sessão.');
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}
