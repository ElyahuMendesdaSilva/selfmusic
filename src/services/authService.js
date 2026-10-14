import { apiRequest } from './apiClient';

// Login por e-mail (JSON): POST /auth/login com {"email": "...", "password": "..."}
// Retorna apenas o usuário criado. O login é feito em seguida.
export function apiLogin(email, password) {
  return apiRequest({
    path: '/auth/login',
    method: 'POST',
    json: { email, password },
  });
}

// Registro de novo usuário: POST /auth/register com {"username": "...", "email": "...", "password": "..."}
// Retorna: { access_token, refresh_token, user }
export function apiRegister({ username, email, password }) {
  return apiRequest({
    path: '/auth/register',
    method: 'POST',
    json: { username, email, password },
  });
}

// Refresh do Access Token: POST /auth/refresh com {"refresh_token": "..."}
// Retorna: { access_token, refresh_token }
export function apiRefresh(refreshToken) {
  return apiRequest({
    path: '/auth/refresh',
    method: 'POST',
    json: { refresh_token: refreshToken },
  });
}

// Logout: POST /auth/logout com {"refresh_token": "..."}
// Invalida o refresh token no servidor
export function apiLogout(refreshToken) {
  return apiRequest({
    path: '/auth/logout',
    method: 'POST',
    json: { refresh_token: refreshToken },
  });
}

// Obtém dados do usuário atual: GET /auth/me
export function apiMe(token) {
  return apiRequest({ path: '/auth/me', method: 'GET', token });
}
