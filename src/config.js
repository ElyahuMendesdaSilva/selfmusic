// Configurações globais do app.
//
// A URL da Music API (FastAPI no homelab) pode ser sobrescrita sem tocar no
// código, criando um arquivo `.env` na raiz do projeto com:
//
//   EXPO_PUBLIC_API_URL=http://192.168.0.12:8000
//
// Dicas por ambiente:
// - Android Emulator: use http://10.0.2.2:8000 (o 10.0.2.2 aponta para o host)
// - Celular físico / Expo Go: use o IP da máquina na rede local (ex.: 192.168.0.12)
//
// IMPORTANTE: variáveis EXPO_PUBLIC_* viram parte do bundle na hora do build.
// Depois de mudar o .env, é preciso rebuildar o app. Builds release do Android
// 9+ bloqueiam http:// por padrão — o app.json já libera (usesCleartextTraffic)
// para testes locais; em produção, use HTTPS.

export const DEFAULT_API_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://musicapi.elyahu.qzz.io').replace(/\/+$/, '');

export function normalizeApiUrl(value) {
  const url = String(value || '').trim().replace(/\/+$/, '');
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) {
    throw new Error('Informe uma URL HTTP ou HTTPS válida.');
  }
  return url;
}

let currentApiBaseUrl = DEFAULT_API_URL;

export function getApiBaseUrl() {
  return currentApiBaseUrl;
}

// Atualizada pelo ApiConfigProvider antes de a autenticação restaurar a sessão.
export function setApiBaseUrl(value) {
  currentApiBaseUrl = normalizeApiUrl(value);
}
