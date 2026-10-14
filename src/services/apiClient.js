import { getApiBaseUrl } from '../config';
import { clearSession, getAccessToken, getRefreshToken, updateTokens } from './sessionStorage';
import { refreshAccessToken } from './tokenRefreshService';

const REQUEST_TIMEOUT_MS = 10000;
const NETWORK_HINT =
  'Confira se a API está no ar com "uvicorn main:app --host 0.0.0.0 --port 8000" ' +
  'e se o aparelho consegue acessar o IP configurado em EXPO_PUBLIC_API_URL.';

// Flag para evitar múltiplas tentativas simultâneas de refresh
let isRefreshing = false;
// Fila de callbacks para requisições que esperam o refresh
let refreshSubscribers = [];
let sessionExpiredHandler = null;
let tokenInMemory;
let tokenRefreshPromise = null;

export function setSessionExpiredHandler(handler) {
  sessionExpiredHandler = handler;
}

export function setCachedAccessToken(token) {
  tokenInMemory = token || null;
}

function tokenExpiresSoon(token) {
  try {
    const encoded = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(globalThis.atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=')));
    return Number(payload.exp) * 1000 < Date.now() + 60_000;
  } catch {
    return false;
  }
}

export async function getFreshAccessToken() {
  tokenInMemory ||= await getAccessToken();
  if (tokenInMemory && tokenExpiresSoon(tokenInMemory)) {
    tokenRefreshPromise ||= attemptTokenRefresh().then(({ newAccessToken }) => {
      tokenInMemory = newAccessToken;
      return newAccessToken;
    }).catch(async () => {
      await clearSession();
      tokenInMemory = null;
      sessionExpiredHandler?.();
      throw new ApiError('Sessão expirada. Faça login novamente.', 401, null);
    }).finally(() => { tokenRefreshPromise = null; });
    return tokenRefreshPromise;
  }
  return tokenInMemory;
}

function onRefreshed(newAccessToken) {
  refreshSubscribers.forEach((callback) => callback(newAccessToken));
  refreshSubscribers = [];
}

function addRefreshSubscriber(callback) {
  refreshSubscribers.push(callback);
}

export class ApiError extends Error {
  constructor(message, status = 0, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

function extractDetail(data) {
  if (!data) {
    return null;
  }
  if (typeof data.detail === 'string') {
    return data.detail;
  }
  if (Array.isArray(data.detail)) {
    return data.detail.map((item) => item.msg).join(' ');
  }
  if (typeof data.message === 'string') {
    return data.message;
  }
  return null;
}

function friendlyMessage(status, detail) {
  if (detail) {
    return detail;
  }
  switch (status) {
    case 400:
      return 'Requisição inválida. Verifique os dados enviados.';
    case 401:
      return 'Sessão expirada. Faça login novamente.';
    case 403:
      return 'Você não tem permissão para essa ação.';
    case 404:
      return 'Recurso não encontrado na API.';
    case 409:
      return 'Já existe um cadastro com esses dados.';
    case 500:
      return 'Erro interno na API. Tente novamente em instantes.';
    default:
      return 'Não foi possível conectar com a API.';
  }
}

function buildFormBody(fields) {
  return Object.entries(fields)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value == null ? '' : value)}`
    )
    .join('&');
}

async function attemptTokenRefresh() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    throw new Error('Nenhum refresh token disponível');
  }

  const data = await refreshAccessToken(refreshToken, REQUEST_TIMEOUT_MS);
  const newAccessToken = data?.access_token;
  const newRefreshToken = data?.refresh_token;

  if (!newAccessToken) {
    throw new Error('A API não retornou um novo access token');
  }

  // Atualiza ambos os tokens no storage (refresh token pode ser rotativo)
  await updateTokens(newAccessToken, newRefreshToken || refreshToken);
  tokenInMemory = newAccessToken;

  return { newAccessToken, newRefreshToken: newRefreshToken || refreshToken };
}

export async function apiRequest({
  path,
  method = 'GET',
  token,
  json,
  form,
  formData,
  timeoutMs = REQUEST_TIMEOUT_MS,
  skipAuthRetry = false,
  signal,
}) {
  const headers = {};
  let body;

  if (form) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    body = buildFormBody(form);
  } else if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  } else if (formData !== undefined) {
    // Multipart: o React Native monta o próprio Content-Type com o boundary,
    // então não definimos manualmente aqui.
    body = formData;
  }

  const authToken = token || (tokenInMemory ?? (tokenInMemory = await getAccessToken()));
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  let response;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      method,
      headers,
      body,
      signal: combineSignals(signal, controller.signal),
    });
  } catch (error) {
    if (__DEV__) console.warn('API request failed:', error?.message || error);
    const timedOut = error?.name === 'AbortError';
    throw new ApiError(
      timedOut
        ? `A API em ${getApiBaseUrl()} não respondeu em ${Math.round(timeoutMs / 1000)}s.`
        : `Não foi possível acessar a API em ${getApiBaseUrl()}. ${NETWORK_HINT}`,
      0,
      null
    );
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 204) {
    return null;
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    // respostas sem corpo (ex.: 204 já tratado acima)
  }

  // Se token expirou (401) e não estamos já tentando refresh, tenta renovar
  if (response.status === 401 && !skipAuthRetry && authToken) {
    // Endpoints de auth não devem tentar refresh (evita loop infinito)
    const isAuthEndpoint = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'].includes(path);
    if (!isAuthEndpoint) {
      return await retryWithRefresh(path, method, headers, body, timeoutMs, signal);
    }
  }

  if (!response.ok) {
    throw new ApiError(friendlyMessage(response.status, extractDetail(data)), response.status, data);
  }

  return data;
}

function combineSignals(callerSignal, timeoutSignal) {
  if (!callerSignal) return timeoutSignal;
  if (typeof AbortSignal.any === 'function') return AbortSignal.any([callerSignal, timeoutSignal]);
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (callerSignal.aborted || timeoutSignal.aborted) abort();
  else {
    callerSignal.addEventListener('abort', abort, { once: true });
    timeoutSignal.addEventListener('abort', abort, { once: true });
  }
  return controller.signal;
}

async function retryWithRefresh(originalPath, originalMethod, originalHeaders, originalBody, timeoutMs, signal) {
  // Se já está fazendo refresh, espera o resultado
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      addRefreshSubscriber(async (newAccessToken) => {
        if (!newAccessToken) { reject(new ApiError('Sessão expirada. Faça login novamente.', 401)); return; }
        try {
          const retryHeaders = { ...originalHeaders, Authorization: `Bearer ${newAccessToken}` };
          const retryResponse = await fetchWithTimeout(originalPath, originalMethod, retryHeaders, originalBody, timeoutMs, signal);
          resolve(await handleResponse(retryResponse, originalPath, originalMethod, originalHeaders, originalBody, timeoutMs, true, signal));
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  // Inicia o refresh
  isRefreshing = true;
  let newAccessToken;
  try {
    ({ newAccessToken } = await attemptTokenRefresh());
  } catch (refreshError) {
    isRefreshing = false;
    onRefreshed(null); // Notifica falha para os subscribers
    // Limpa a sessão já que o refresh falhou
    await clearSession();
    tokenInMemory = null;
    sessionExpiredHandler?.();
    throw new ApiError('Sessão expirada. Faça login novamente.', 401, null);
  }
  isRefreshing = false;
  onRefreshed(newAccessToken);

  // Repete a requisição original com o novo token.
  const retryHeaders = { ...originalHeaders, Authorization: `Bearer ${newAccessToken}` };
  const retryResponse = await fetchWithTimeout(originalPath, originalMethod, retryHeaders, originalBody, timeoutMs, signal);
  return await handleResponse(retryResponse, originalPath, originalMethod, originalHeaders, originalBody, timeoutMs, true, signal);
}

async function fetchWithTimeout(path, method, headers, body, timeoutMs, signal) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${getApiBaseUrl()}${path}`, {
      method,
      headers,
      body,
      signal: combineSignals(signal, controller.signal),
    });
  } finally {
    clearTimeout(timer);
  }
}

async function handleResponse(response, path, method, headers, body, timeoutMs, skipAuthRetry, signal) {
  if (response.status === 204) {
    return null;
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    // respostas sem corpo
  }

  if (!response.ok) {
    // Se ainda der 401 após refresh, não tenta de novo (skipAuthRetry=true)
    if (response.status === 401 && !skipAuthRetry) {
      return await retryWithRefresh(path, method, headers, body, timeoutMs, signal);
    }
    throw new ApiError(friendlyMessage(response.status, extractDetail(data)), response.status, data);
  }

  return data;
}

export async function apiPing() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(`${getApiBaseUrl()}/`, {
      method: 'GET',
      signal: controller.signal,
    });
    return {
      connected: true,
      status: response.status,
      message: `API respondeu (HTTP ${response.status})`,
    };
  } catch (error) {
    const timedOut = error?.name === 'AbortError';
    return {
      connected: false,
      status: 0,
      message: timedOut
        ? 'Sem resposta em 5s. Confira o IP e o --host 0.0.0.0.'
        : NETWORK_HINT,
    };
  } finally {
    clearTimeout(timer);
  }
}
