type DashboardPageProps = {
  onLogout: () => void;
};

const metrics = [
  { label: 'Open quotes', value: '12' },
  { label: 'Pending approvals', value: '4' },
  { label: 'Monthly margin', value: '28%' },
];

const quoteRows = [
  { client: 'Acme Clima', quote: 'Q-1024', status: 'Draft', total: '$18,420' },
  { client: 'Norte Obras', quote: 'Q-1025', status: 'Sent', total: '$9,870' },
  { client: 'Soluciones HVAC', quote: 'Q-1026', status: 'Approved', total: '$31,200' },
];

export function DashboardPage({ onLogout }: DashboardPageProps) {
  return (
    <main style={styles.page}>
      <aside style={styles.sidebar} aria-label="Main navigation">
        <div style={styles.logoRow}>
          <div style={styles.logoMark}>P</div>
          <strong>Presupuestos</strong>
        </div>
        <nav style={styles.nav}>
          <a style={styles.navActive} href="/dashboard">
            Dashboard
          </a>
          <a style={styles.navItem} href="/dashboard">
            Clients
          </a>
          <a style={styles.navItem} href="/dashboard">
            Cost items
          </a>
          <a style={styles.navItem} href="/dashboard">
            Quotes
          </a>
        </nav>
      </aside>

      <section style={styles.content}>
        <header style={styles.topbar}>
          <div>
            <h1 style={styles.title}>Dashboard</h1>
            <p style={styles.subtitle}>Track quote activity and work waiting for action.</p>
          </div>
          <button onClick={onLogout} style={styles.secondaryButton} type="button">
            Sign out
          </button>
        </header>

        <section style={styles.metrics} aria-label="Quote metrics">
          {metrics.map((metric) => (
            <article key={metric.label} style={styles.metricCard}>
              <p style={styles.metricLabel}>{metric.label}</p>
              <strong style={styles.metricValue}>{metric.value}</strong>
            </article>
          ))}
        </section>

        <section style={styles.tablePanel} aria-labelledby="recent-quotes-title">
          <div style={styles.panelHeader}>
            <h2 id="recent-quotes-title" style={styles.panelTitle}>
              Recent quotes
            </h2>
            <button style={styles.primaryButton} type="button">
              New quote
            </button>
          </div>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Client</th>
                <th style={styles.th}>Quote</th>
                <th style={styles.th}>Status</th>
                <th style={styles.thRight}>Total</th>
              </tr>
            </thead>
            <tbody>
              {quoteRows.map((row) => (
                <tr key={row.quote}>
                  <td style={styles.td}>{row.client}</td>
                  <td style={styles.td}>{row.quote}</td>
                  <td style={styles.td}>{row.status}</td>
                  <td style={styles.tdRight}>{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </section>
    </main>
  );
}

const styles = {
  page: {
    background: '#f4f6f8',
    color: '#17202a',
    display: 'flex',
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    minHeight: '100vh',
  },
  sidebar: {
    background: '#ffffff',
    borderRight: '1px solid #d9e0e7',
    padding: '24px',
    width: '240px',
  },
  logoRow: {
    alignItems: 'center',
    display: 'flex',
    gap: '10px',
    marginBottom: '32px',
  },
  logoMark: {
    alignItems: 'center',
    background: '#1d4ed8',
    borderRadius: '6px',
    color: '#ffffff',
    display: 'flex',
    fontWeight: 700,
    height: '34px',
    justifyContent: 'center',
    width: '34px',
  },
  nav: {
    display: 'grid',
    gap: '6px',
  },
  navItem: {
    borderRadius: '6px',
    color: '#526071',
    fontSize: '14px',
    padding: '10px 12px',
    textDecoration: 'none',
  },
  navActive: {
    background: '#eaf1ff',
    borderRadius: '6px',
    color: '#1d4ed8',
    fontSize: '14px',
    fontWeight: 700,
    padding: '10px 12px',
    textDecoration: 'none',
  },
  content: {
    flex: 1,
    padding: '32px',
  },
  topbar: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
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
    margin: '8px 0 0',
  },
  secondaryButton: {
    background: '#ffffff',
    border: '1px solid #c9d3df',
    borderRadius: '6px',
    color: '#344054',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 700,
    padding: '10px 14px',
  },
  metrics: {
    display: 'grid',
    gap: '16px',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    marginBottom: '24px',
  },
  metricCard: {
    background: '#ffffff',
    border: '1px solid #d9e0e7',
    borderRadius: '8px',
    padding: '20px',
  },
  metricLabel: {
    color: '#526071',
    fontSize: '13px',
    fontWeight: 700,
    margin: 0,
    textTransform: 'uppercase',
  },
  metricValue: {
    display: 'block',
    fontSize: '30px',
    marginTop: '10px',
  },
  tablePanel: {
    background: '#ffffff',
    border: '1px solid #d9e0e7',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  panelHeader: {
    alignItems: 'center',
    borderBottom: '1px solid #d9e0e7',
    display: 'flex',
    justifyContent: 'space-between',
    padding: '18px 20px',
  },
  panelTitle: {
    fontSize: '18px',
    margin: 0,
  },
  primaryButton: {
    background: '#1d4ed8',
    border: 0,
    borderRadius: '6px',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 700,
    padding: '10px 14px',
  },
  table: {
    borderCollapse: 'collapse',
    width: '100%',
  },
  th: {
    color: '#526071',
    fontSize: '12px',
    padding: '12px 20px',
    textAlign: 'left',
    textTransform: 'uppercase',
  },
  thRight: {
    color: '#526071',
    fontSize: '12px',
    padding: '12px 20px',
    textAlign: 'right',
    textTransform: 'uppercase',
  },
  td: {
    borderTop: '1px solid #edf1f5',
    fontSize: '14px',
    padding: '14px 20px',
  },
  tdRight: {
    borderTop: '1px solid #edf1f5',
    fontSize: '14px',
    fontWeight: 700,
    padding: '14px 20px',
    textAlign: 'right',
  },
} satisfies Record<string, React.CSSProperties>;
