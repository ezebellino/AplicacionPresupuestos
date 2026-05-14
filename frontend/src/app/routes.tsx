export const routes = {
  login: '/',
  dashboard: '/dashboard',
} as const;

export function getToken() {
  return localStorage.getItem('auth_token');
}
