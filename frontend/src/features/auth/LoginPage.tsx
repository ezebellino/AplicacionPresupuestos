import { FormEvent, useState } from 'react';
import Swal from 'sweetalert2';

import { apiClient } from '../../shared/api/client';

type LoginPageProps = {
  onLogin?: (accessToken: string) => void;
};

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await apiClient.login({ email, password });
      localStorage.setItem('auth_token', response.access_token);
      onLogin?.(response.access_token);
    } catch {
      await Swal.fire({
        title: 'Unable to sign in',
        text: 'Check your email and password, then try again.',
        icon: 'error',
        confirmButtonText: 'Close',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main style={styles.page}>
      <section style={styles.panel} aria-labelledby="login-title">
        <div style={styles.brandRow}>
          <div style={styles.logoMark}>P</div>
          <div>
            <p style={styles.brand}>Presupuestos</p>
            <p style={styles.caption}>Operations workspace</p>
          </div>
        </div>

        <div style={styles.header}>
          <h1 id="login-title" style={styles.title}>
            Sign in
          </h1>
          <p style={styles.subtitle}>
            Manage clients, cost items, quotes, and approval status from one place.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Email
            <input
              autoComplete="email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              style={styles.input}
              type="email"
              value={email}
            />
          </label>

          <label style={styles.label}>
            Password
            <input
              autoComplete="current-password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              style={styles.input}
              type="password"
              value={password}
            />
          </label>

          <button disabled={isSubmitting} style={styles.button} type="submit">
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  );
}

const styles = {
  page: {
    alignItems: 'center',
    background: '#f4f6f8',
    color: '#17202a',
    display: 'flex',
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '32px',
  },
  panel: {
    background: '#ffffff',
    border: '1px solid #d9e0e7',
    borderRadius: '8px',
    boxShadow: '0 18px 45px rgba(24, 39, 75, 0.08)',
    maxWidth: '440px',
    padding: '32px',
    width: '100%',
  },
  brandRow: {
    alignItems: 'center',
    display: 'flex',
    gap: '12px',
    marginBottom: '32px',
  },
  logoMark: {
    alignItems: 'center',
    background: '#1d4ed8',
    borderRadius: '6px',
    color: '#ffffff',
    display: 'flex',
    fontSize: '18px',
    fontWeight: 700,
    height: '40px',
    justifyContent: 'center',
    width: '40px',
  },
  brand: {
    fontSize: '16px',
    fontWeight: 700,
    lineHeight: 1.2,
    margin: 0,
  },
  caption: {
    color: '#667085',
    fontSize: '13px',
    lineHeight: 1.3,
    margin: '3px 0 0',
  },
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '28px',
    lineHeight: 1.15,
    margin: 0,
  },
  subtitle: {
    color: '#526071',
    fontSize: '15px',
    lineHeight: 1.5,
    margin: '10px 0 0',
  },
  form: {
    display: 'grid',
    gap: '16px',
  },
  label: {
    color: '#344054',
    display: 'grid',
    fontSize: '14px',
    fontWeight: 600,
    gap: '7px',
  },
  input: {
    border: '1px solid #c9d3df',
    borderRadius: '6px',
    font: 'inherit',
    padding: '11px 12px',
  },
  button: {
    background: '#1d4ed8',
    border: 0,
    borderRadius: '6px',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 700,
    marginTop: '4px',
    padding: '12px 16px',
  },
} satisfies Record<string, React.CSSProperties>;
