import { Eye } from 'lucide-react';

import type { SummaryViewProps } from '../types';

import { styles } from '../styles';
import { StatusBadge } from '../ui';
import { clientName, formatDate, formatMoney, quoteTimestamp } from '../helpers';

export function SummaryView({
  clients,
  costItems,
  isLoading,
  metrics,
  onNewQuote,
  onOpenQuote,
  quotes,
}: SummaryViewProps) {
  const recentQuotes = [...quotes].sort((left, right) => quoteTimestamp(right) - quoteTimestamp(left)).slice(0, 5);
  const pendingQuotes = recentQuotes.filter((quote) => quote.status === 'issued');

  return (
    <>
      <section style={styles.metrics} aria-label="Indicadores">
        {metrics.map((metric) => (
          <article key={metric.label} style={styles.metricCard}>
            <p style={styles.metricLabel}>{metric.label}</p>
            <strong style={styles.metricValue}>{isLoading ? '...' : metric.value}</strong>
          </article>
        ))}
      </section>

      <section style={styles.gridTwo}>
        <section style={styles.tablePanel} aria-labelledby="services-summary-title">
          <div style={styles.panelHeader}>
            <div>
              <h2 id="services-summary-title" style={styles.panelTitle}>
                Servicios activos
              </h2>
              <p style={styles.panelSubtitle}>Referencia rapida del catalogo que usas para presupuestar.</p>
            </div>
          </div>
          {costItems.length === 0 ? (
            <p style={styles.emptyState}>Todavia no hay servicios cargados.</p>
          ) : (
            <div style={styles.categoryGrid}>
              {costItems.slice(0, 5).map((item) => (
                <div key={item.id} style={styles.categoryRow}>
                  <div style={styles.treasuryMovementPrimary}>
                    <strong>{item.name}</strong>
                    {item.description ? <span style={styles.mutedText}>{item.description}</span> : null}
                  </div>
                  <strong>{formatMoney(item.unit_cost)}</strong>
                </div>
              ))}
              {costItems.length > 5 ? (
                <div style={styles.categoryRow}>
                  <span>Otros servicios cargados</span>
                  <strong>{costItems.length - 5}</strong>
                </div>
              ) : null}
            </div>
          )}
        </section>

        <section style={styles.tablePanel} aria-labelledby="recent-quotes-title">
          <div style={styles.panelHeader}>
            <div>
              <h2 id="recent-quotes-title" style={styles.panelTitle}>
                Presupuestos recientes
              </h2>
              <p style={styles.panelSubtitle}>Ultimos movimientos para reabrir rapido el trabajo reciente.</p>
            </div>
            <button onClick={onNewQuote} style={styles.primaryButton} type="button">
              Nuevo presupuesto
            </button>
          </div>
          {recentQuotes.length === 0 ? (
            <p style={styles.emptyState}>Todavia no hay presupuestos cargados.</p>
          ) : (
            <div style={styles.clientList}>
              {recentQuotes.map((quote) => (
                <article key={quote.id} style={styles.historyQuoteRecord}>
                  <div style={styles.historyRecordHeader}>
                    <div>
                      <strong>{clientName(clients, quote.client_id)}</strong>
                      <p style={styles.panelSubtitle}>
                        {quote.number} - {formatDate(quote.issued_at ?? quote.created_at)}
                      </p>
                    </div>
                    <StatusBadge status={quote.status} />
                  </div>
                  <div style={styles.panelHeaderCompact}>
                    <span style={styles.mutedText}>{quote.title || 'Sin titulo'}</span>
                    <strong>{formatMoney(quote.total)}</strong>
                  </div>
                  <div style={styles.clientActions}>
                    <button
                      aria-label="Abrir presupuesto"
                      onClick={() => onOpenQuote(quote.id)}
                      style={styles.iconActionButton}
                      title="Abrir presupuesto"
                      type="button"
                    >
                      <Eye aria-hidden="true" size={15} strokeWidth={2.2} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>

      <section style={styles.tablePanel} aria-labelledby="summary-attention-title">
        <div style={styles.panelHeader}>
          <div>
            <h2 id="summary-attention-title" style={styles.panelTitle}>
              Atencion inmediata
            </h2>
            <p style={styles.panelSubtitle}>Presupuestos emitidos que todavia conviene seguir de cerca.</p>
          </div>
        </div>
        {pendingQuotes.length === 0 ? (
          <p style={styles.emptyState}>No hay presupuestos emitidos pendientes dentro de la actividad reciente.</p>
        ) : (
          <div style={styles.clientList}>
            {pendingQuotes.map((quote) => (
              <article key={quote.id} style={styles.treasuryMovementRow}>
                <div style={styles.treasuryMovementPrimary}>
                  <strong>{clientName(clients, quote.client_id)}</strong>
                  <span style={styles.treasuryMovementMeta}>
                    {quote.number} - {formatDate(quote.issued_at ?? quote.created_at)}
                  </span>
                  <span style={styles.mutedText}>{quote.title || 'Sin titulo'}</span>
                </div>
                <StatusBadge status={quote.status} />
                <strong style={styles.treasuryMovementAmount}>{formatMoney(quote.total)}</strong>
                <button
                  aria-label="Abrir presupuesto"
                  onClick={() => onOpenQuote(quote.id)}
                  style={styles.iconActionButton}
                  title="Abrir presupuesto"
                  type="button"
                >
                  <Eye aria-hidden="true" size={15} strokeWidth={2.2} />
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
