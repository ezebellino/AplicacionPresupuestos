import { FormEvent, useState } from 'react';
import Swal from 'sweetalert2';

import { apiClient } from '../../shared/api/client';

type LoginPageProps = {
  onLogin?: (accessToken: string) => void;
};

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') !== 'light');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleTheme = () => {
    setIsDarkMode((current) => {
      const next = !current;
      localStorage.setItem('theme', next ? 'dark' : 'light');
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await apiClient.login({ email, password });
      localStorage.setItem('auth_token', response.access_token);
      onLogin?.(response.access_token);
    } catch {
      await Swal.fire({
        title: 'No se pudo iniciar sesion',
        text: 'Revisa email y contrasena, y vuelve a intentar.',
        icon: 'error',
        confirmButtonText: 'Cerrar',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main style={loginStyles.page(isDarkMode)}>
      <section style={loginStyles.panel(isDarkMode)} aria-labelledby="login-title">
        <div style={styles.brandRow}>
          <img alt="" src="/FacturEasy.png" style={styles.logoMark} />
          <div>
            <p style={loginStyles.brand(isDarkMode)}>FacturEasy</p>
            <p style={loginStyles.caption(isDarkMode)}>Workspace operativo</p>
          </div>
        </div>
        <button onClick={toggleTheme} style={loginStyles.themeButton(isDarkMode)} type="button">
          {isDarkMode ? 'Modo claro' : 'Dark mode'}
        </button>

        <div style={styles.header}>
          <h1 id="login-title" style={loginStyles.title(isDarkMode)}>
            Iniciar sesion
          </h1>
          <p style={loginStyles.subtitle(isDarkMode)}>
            Gestiona clientes, costos, presupuestos y tesoreria desde un solo lugar.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={loginStyles.label(isDarkMode)}>
            Email
            <input
              autoComplete="email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              style={loginStyles.input(isDarkMode)}
              type="email"
              value={email}
            />
          </label>

          <label style={loginStyles.label(isDarkMode)}>
            Contrasena
            <input
              autoComplete="current-password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              style={loginStyles.input(isDarkMode)}
              type="password"
              value={password}
            />
          </label>

          <button disabled={isSubmitting} style={loginStyles.button} type="submit">
            {isSubmitting ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </section>
    </main>
  );
}

const styles = {
  brandRow: {
    alignItems: 'center',
    display: 'flex',
    gap: '12px',
    marginBottom: '32px',
  },
  logoMark: {
    borderRadius: '6px',
    display: 'block',
    height: '132px',
    objectFit: 'contain',
    width: '132px',
  },
  header: {
    marginBottom: '24px',
  },
  form: {
    display: 'grid',
    gap: '16px',
  },
} satisfies Record<string, React.CSSProperties>;

const loginStyles = {
  page: (isDarkMode: boolean): React.CSSProperties => ({
    alignItems: 'center',
    background: isDarkMode
      ? 'radial-gradient(circle at 16% 18%, rgba(218, 165, 32, 0.22), transparent 28%), radial-gradient(circle at 84% 76%, rgba(37, 211, 102, 0.08), transparent 24%), #07070c'
      : 'linear-gradient(135deg, #f8fafc, #eef2f7)',
    color: isDarkMode ? '#f8fafc' : '#0f172a',
    display: 'flex',
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '32px',
  }),
  panel: (isDarkMode: boolean): React.CSSProperties => ({
    background: isDarkMode ? 'rgba(14, 17, 24, 0.96)' : '#ffffff',
    border: isDarkMode ? '1px solid rgba(218, 165, 32, 0.28)' : '1px solid #d8e0ea',
    borderRadius: '8px',
    boxShadow: isDarkMode
      ? '0 24px 80px rgba(0, 0, 0, 0.45), 0 0 32px rgba(218, 165, 32, 0.08)'
      : '0 22px 60px rgba(15, 23, 42, 0.12)',
    maxWidth: '440px',
    padding: '32px',
    position: 'relative',
    width: '100%',
  }),
  brand: (isDarkMode: boolean): React.CSSProperties => ({
    color: isDarkMode ? '#f8fafc' : '#0f172a',
    fontSize: '16px',
    fontWeight: 700,
    lineHeight: 1.2,
    margin: 0,
  }),
  caption: (isDarkMode: boolean): React.CSSProperties => ({
    color: isDarkMode ? '#a7b0c0' : '#475569',
    fontSize: '13px',
    lineHeight: 1.3,
    margin: '3px 0 0',
  }),
  themeButton: (isDarkMode: boolean): React.CSSProperties => ({
    background: isDarkMode ? '#111827' : '#f8fafc',
    border: isDarkMode ? '1px solid rgba(218, 165, 32, 0.34)' : '1px solid #cbd5e1',
    borderRadius: '6px',
    color: isDarkMode ? '#f8fafc' : '#0f172a',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 700,
    padding: '8px 10px',
    position: 'absolute',
    right: '20px',
    top: '20px',
  }),
  title: (isDarkMode: boolean): React.CSSProperties => ({
    color: isDarkMode ? '#f8fafc' : '#0f172a',
    fontSize: '28px',
    lineHeight: 1.15,
    margin: 0,
  }),
  subtitle: (isDarkMode: boolean): React.CSSProperties => ({
    color: isDarkMode ? '#a7b0c0' : '#475569',
    fontSize: '15px',
    lineHeight: 1.5,
    margin: '10px 0 0',
  }),
  label: (isDarkMode: boolean): React.CSSProperties => ({
    color: isDarkMode ? '#f8fafc' : '#0f172a',
    display: 'grid',
    fontSize: '14px',
    fontWeight: 600,
    gap: '7px',
  }),
  input: (isDarkMode: boolean): React.CSSProperties => ({
    background: isDarkMode ? '#111827' : '#eaf1fb',
    border: isDarkMode ? '1px solid rgba(218, 165, 32, 0.28)' : '1px solid #cbd5e1',
    borderRadius: '6px',
    color: isDarkMode ? '#f8fafc' : '#0f172a',
    font: 'inherit',
    padding: '11px 12px',
  }),
  button: {
    background: '#daa520',
    border: 0,
    borderRadius: '6px',
    color: '#09090b',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 700,
    marginTop: '4px',
    padding: '12px 16px',
  },
};
