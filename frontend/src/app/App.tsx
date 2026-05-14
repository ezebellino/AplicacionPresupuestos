import { useCallback, useEffect, useState } from 'react';

import { DashboardPage } from '../features/dashboard/DashboardPage';
import { LoginPage } from '../features/auth/LoginPage';
import { getToken, routes } from './routes';

export function App() {
  const [token, setToken] = useState(() => getToken());
  const [path, setPath] = useState(() => window.location.pathname);

  const navigate = useCallback((nextPath: string) => {
    if (window.location.pathname === nextPath) {
      return;
    }

    window.history.pushState({}, '', nextPath);
    setPath(nextPath);
  }, []);

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (token && path !== routes.dashboard) {
      navigate(routes.dashboard);
      return;
    }

    if (!token && path !== routes.login) {
      navigate(routes.login);
    }
  }, [navigate, path, token]);

  const handleLogin = (accessToken: string) => {
    localStorage.setItem('auth_token', accessToken);
    setToken(accessToken);
    navigate(routes.dashboard);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    setToken(null);
    navigate(routes.login);
  };

  if (!token) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return <DashboardPage onLogout={handleLogout} />;
}
