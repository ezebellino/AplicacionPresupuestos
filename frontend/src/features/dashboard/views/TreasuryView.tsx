import { useState } from 'react';
import { Eye, FileText, MessageCircle } from 'lucide-react';

import type { ExpenseFilter, TreasuryMovementFilter, TreasurySection, TreasuryViewProps } from '../types';
import type { ExpenseStatus } from '../../../shared/api/client';

import { buildSmartTreasury, clientName, formatDate, formatMoney, quoteTimestamp, sumExpenses, sumQuotes } from '../helpers';
import { styles } from '../styles';
import { ChartPanel, Field, StatusBadge } from '../ui';

export function TreasuryView({
  clients,
  expenseCategories,
  expenseEntries,
  expenseForm,
  isCompactLayout,
  isSaving,
  onExpenseFormChange,
  onExpenseStatusChange,
  onExpenseSubmit,
  onManageExpenseCategories,
  onDownloadPdf,
  onOpenQuote,
  onSendInvoiceByWhatsApp,
  quotes,
}: TreasuryViewProps) {
  const [activeSection, setActiveSection] = useState<TreasurySection>('overview');
  const [isSmartTreasury, setIsSmartTreasury] = useState(false);
  const [movementFilter, setMovementFilter] = useState<TreasuryMovementFilter>('all');
  const [expenseFilter, setExpenseFilter] = useState<ExpenseFilter>('all');
  const acceptedQuotes = quotes.filter((quote) => quote.status === 'accepted');
  const issuedQuotes = quotes.filter((quote) => quote.status === 'issued');
  const rejectedQuotes = quotes.filter((quote) => quote.status === 'rejected');
  const pendingExpenses = expenseEntries.filter((entry) => entry.status === 'pending');
  const paidExpenses = expenseEntries.filter((entry) => entry.status === 'paid');
  const treasurySections = [
    { id: 'overview' as const, label: 'Resumen' },
    { id: 'movements' as const, label: 'Movimientos' },
    { id: 'pending' as const, label: 'Cobros pendientes' },
    { id: 'expenses' as const, label: 'Gastos' },
  ];
  const treasuryMetrics = [
    { label: 'Facturado aceptado', value: formatMoney(sumQuotes(acceptedQuotes)) },
    { label: 'Pendiente emitido', value: formatMoney(sumQuotes(issuedQuotes)) },
    { label: 'Rechazado', value: formatMoney(sumQuotes(rejectedQuotes)) },
    { label: 'Gastos pendientes', value: formatMoney(sumExpenses(pendingExpenses)) },
    { label: 'Gastos cobrados', value: formatMoney(sumExpenses(paidExpenses)) },
    { label: 'Total de presupuestos', value: String(quotes.length) },
    {
      label: 'Mes actual',
      value: new Intl.DateTimeFormat('es-AR', {
        month: 'long',
        timeZone: 'America/Buenos_Aires',
        year: 'numeric',
      }).format(new Date()),
    },
  ];
  const averageAccepted = acceptedQuotes.length ? sumQuotes(acceptedQuotes) / acceptedQuotes.length : 0;
  const conversionRate = quotes.length ? (acceptedQuotes.length / quotes.length) * 100 : 0;
  const netBalance = sumQuotes(acceptedQuotes) - sumExpenses(expenseEntries);
  const latestMovements = [...quotes]
    .filter((quote) => quote.status !== 'draft')
    .filter((quote) => movementFilter === 'all' || quote.status === movementFilter)
    .sort((left, right) => quoteTimestamp(right) - quoteTimestamp(left))
    .slice(0, 12);
  const pendingQuotes = [...issuedQuotes].sort((left, right) => quoteTimestamp(right) - quoteTimestamp(left));
  const filteredExpenseEntries = expenseEntries.filter((entry) => expenseFilter === 'all' || entry.status === expenseFilter);
  const smartTreasury = buildSmartTreasury(acceptedQuotes, quotes, expenseEntries);
  const movementRowStyle = {
    ...styles.treasuryMovementRow,
    ...(isCompactLayout ? styles.treasuryMovementRowCompact : null),
  };
  const movementFooterStyle = {
    ...styles.treasuryRowFooter,
    ...(isCompactLayout ? styles.treasuryRowFooterCompact : null),
  };
  const movementAmountStyle = {
    ...styles.treasuryMovementAmount,
    ...(isCompactLayout ? styles.treasuryMovementAmountCompact : null),
  };
  const actionGroupStyle = {
    ...styles.treasuryActionGroup,
    ...(isCompactLayout ? styles.treasuryActionGroupCompact : null),
  };

  if (isSmartTreasury) {
    return (
      <>
        <section style={styles.smartHeader}>
          <div>
            <h2 style={styles.panelTitle}>Tesoreria inteligente</h2>
            <p style={styles.panelSubtitle}>Lectura rapida de cierres, facturacion y oportunidades de seguimiento.</p>
          </div>
          <button onClick={() => setIsSmartTreasury(false)} style={styles.secondaryButton} type="button">
            Volver a tesoreria
          </button>
        </section>

        <section style={styles.metrics} aria-label="Indicadores inteligentes">
          {smartTreasury.cards.map((card) => (
            <article key={card.label} style={styles.metricCard}>
              <p style={styles.metricLabel}>{card.label}</p>
              <strong style={styles.metricValue}>{card.value}</strong>
            </article>
          ))}
        </section>

        <section style={styles.gridTwo}>
          <ChartPanel
            emptyText="Todavia no hay presupuestos aceptados."
            rows={smartTreasury.acceptedByMonth}
            title="Presupuestos aceptados por mes"
            valueFormatter={(value) => `${value.toFixed(0)} cierres`}
          />
          <ChartPanel
            emptyText="Todavia no hay facturacion aceptada."
            rows={smartTreasury.months}
            title="Meses mas facturados"
            valueFormatter={formatMoney}
          />
        </section>

        <section style={styles.tablePanel} aria-labelledby="smart-report-title">
          <div style={styles.panelHeader}>
            <h2 id="smart-report-title" style={styles.panelTitle}>
              Reporte inteligente
            </h2>
          </div>
          <div style={styles.smartReportGrid}>
            {smartTreasury.insights.map((insight) => (
              <article key={insight.title} style={styles.smartInsight}>
                <strong>{insight.title}</strong>
                <p>{insight.text}</p>
              </article>
            ))}
          </div>
        </section>
      </>
    );
  }

  return (
    <section style={styles.companyWorkspace}>
      <section style={styles.smartHeader}>
        <div>
          <h2 style={styles.panelTitle}>Tesoreria</h2>
          <p style={styles.panelSubtitle}>Seguimiento operativo de presupuestos, cobros y movimientos del negocio.</p>
        </div>
        <div style={styles.actions}>
          <button onClick={() => setIsSmartTreasury(true)} style={styles.primaryButton} type="button">
            Tesoreria inteligente
          </button>
          {isCompactLayout ? (
            <label style={styles.platformSelectField}>
              <span style={styles.labelCaption}>Seccion de tesoreria</span>
              <select
                aria-label="Seccion de tesoreria"
                onChange={(event) => setActiveSection(event.target.value as TreasurySection)}
                style={styles.select}
                value={activeSection}
              >
                {treasurySections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div style={styles.platformSectionNav} role="tablist" aria-label="Navegacion de tesoreria">
              {treasurySections.map((section) => (
                <button
                  aria-pressed={activeSection === section.id}
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  style={activeSection === section.id ? styles.platformSectionButtonActive : styles.platformSectionButton}
                  type="button"
                >
                  {section.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {activeSection === 'overview' ? (
        <>
          <section style={styles.metrics} aria-label="Metricas de tesoreria">
            {treasuryMetrics.map((metric) => (
              <article key={metric.label} style={styles.metricCard}>
                <p style={styles.metricLabel}>{metric.label}</p>
                <strong style={styles.metricValue}>{metric.value}</strong>
              </article>
            ))}
          </section>

          <section style={styles.gridTwo}>
            <section style={styles.tablePanel} aria-labelledby="treasury-health-title">
              <div style={styles.panelHeader}>
                <div>
                  <h2 id="treasury-health-title" style={styles.panelTitle}>
                    Resumen de tesoreria
                  </h2>
                  <p style={styles.panelSubtitle}>Lectura rapida de conversion, volumen, ticket promedio y gasto acumulado.</p>
                </div>
              </div>
              <div style={styles.treasuryOverviewStrip}>
                <span style={styles.clientMetaPill}>{acceptedQuotes.length} aceptados</span>
                <span style={styles.clientMetaPill}>{issuedQuotes.length} emitidos</span>
                <span style={styles.clientMetaPill}>{rejectedQuotes.length} rechazados</span>
              </div>
              <div style={styles.categoryGrid}>
                <div style={styles.categoryRow}>
                  <span>Ticket promedio aceptado</span>
                  <strong>{formatMoney(String(averageAccepted))}</strong>
                </div>
                <div style={styles.categoryRow}>
                  <span>Conversion aceptada</span>
                  <strong>{conversionRate.toFixed(0)}%</strong>
                </div>
                <div style={styles.categoryRow}>
                  <span>Presupuestos aceptados</span>
                  <strong>{acceptedQuotes.length}</strong>
                </div>
                <div style={styles.categoryRow}>
                  <span>Presupuestos emitidos</span>
                  <strong>{issuedQuotes.length}</strong>
                </div>
                <div style={styles.categoryRow}>
                  <span>Gasto pendiente</span>
                  <strong>{formatMoney(String(sumExpenses(pendingExpenses)))}</strong>
                </div>
                <div style={styles.categoryRow}>
                  <span>Balance neto</span>
                  <strong>{formatMoney(String(netBalance))}</strong>
                </div>
              </div>
            </section>

            <section style={styles.tablePanel} aria-labelledby="treasury-attention-title">
              <div style={styles.panelHeader}>
                <div>
                  <h2 id="treasury-attention-title" style={styles.panelTitle}>
                    Atencion inmediata
                  </h2>
                  <p style={styles.panelSubtitle}>Presupuestos emitidos que todavia requieren seguimiento.</p>
                </div>
              </div>
              {pendingQuotes.length === 0 ? (
                <p style={styles.emptyState}>No hay presupuestos emitidos pendientes de seguimiento.</p>
              ) : (
                <div style={styles.clientList}>
                  {pendingQuotes.map((quote) => (
                    <article key={quote.id} style={movementRowStyle}>
                      <div style={styles.treasuryMovementPrimary}>
                        <strong>{clientName(clients, quote.client_id)}</strong>
                        <span style={styles.treasuryMovementMeta}>
                          {quote.number} - {formatDate(quote.issued_at ?? quote.created_at)}
                        </span>
                        <span style={styles.mutedText}>{quote.title || 'Sin titulo'}</span>
                      </div>
                      <div style={movementFooterStyle}>
                        <StatusBadge status={quote.status} />
                        <strong style={movementAmountStyle}>{formatMoney(quote.total)}</strong>
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
        </>
      ) : null}

      {activeSection === 'movements' ? (
        <section style={styles.tablePanel} aria-labelledby="treasury-movements-title">
          <div style={styles.panelHeader}>
            <div>
              <h2 id="treasury-movements-title" style={styles.panelTitle}>
                Movimientos
              </h2>
              <p style={styles.panelSubtitle}>Cronologia de presupuestos emitidos, aceptados y rechazados.</p>
            </div>
          </div>
          <div style={styles.platformFilterBar}>
            {[
              { key: 'all', label: 'Todos' },
              { key: 'accepted', label: 'Aceptados' },
              { key: 'issued', label: 'Emitidos' },
              { key: 'rejected', label: 'Rechazados' },
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => setMovementFilter(filter.key as TreasuryMovementFilter)}
                style={movementFilter === filter.key ? styles.platformFilterButtonActive : styles.platformFilterButton}
                type="button"
              >
                {filter.label}
              </button>
            ))}
          </div>
          {latestMovements.length === 0 ? (
            <p style={styles.emptyState}>No hay movimientos para ese filtro.</p>
          ) : (
            <div style={styles.clientList}>
              {latestMovements.map((quote) => (
                <article key={quote.id} style={movementRowStyle}>
                  <div style={styles.treasuryMovementPrimary}>
                    <strong>{clientName(clients, quote.client_id)}</strong>
                    <span style={styles.treasuryMovementMeta}>
                      {quote.number} - {formatDate(quote.issued_at ?? quote.created_at)}
                    </span>
                    <span style={styles.mutedText}>{quote.title || 'Sin titulo'}</span>
                  </div>
                  <div style={movementFooterStyle}>
                    <StatusBadge status={quote.status} />
                    <strong style={movementAmountStyle}>{formatMoney(quote.total)}</strong>
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
      ) : null}

      {activeSection === 'pending' ? (
        <section style={styles.tablePanel} aria-labelledby="treasury-pending-title">
          <div style={styles.panelHeader}>
            <div>
              <h2 id="treasury-pending-title" style={styles.panelTitle}>
                Cobros pendientes
              </h2>
              <p style={styles.panelSubtitle}>Cola operativa para seguimiento, envio y reapertura rapida.</p>
            </div>
          </div>
          {pendingQuotes.length === 0 ? (
            <p style={styles.emptyState}>No hay cobros pendientes en este momento.</p>
          ) : (
            <div style={styles.clientList}>
              {pendingQuotes.map((quote) => (
                <article key={quote.id} style={movementRowStyle}>
                  <div style={styles.treasuryMovementPrimary}>
                    <strong>{clientName(clients, quote.client_id)}</strong>
                    <span style={styles.treasuryMovementMeta}>
                      {quote.number} - {formatDate(quote.issued_at ?? quote.created_at)}
                    </span>
                    <span style={styles.mutedText}>{quote.title || 'Sin titulo'}</span>
                  </div>
                  <div style={movementFooterStyle}>
                    <StatusBadge status={quote.status} />
                    <strong style={movementAmountStyle}>{formatMoney(quote.total)}</strong>
                    <div style={actionGroupStyle}>
                      <button
                        aria-label="Abrir presupuesto"
                        onClick={() => onOpenQuote(quote.id)}
                        style={styles.iconActionButton}
                        title="Abrir presupuesto"
                        type="button"
                      >
                        <Eye aria-hidden="true" size={15} strokeWidth={2.2} />
                      </button>
                      <button
                        aria-label="Enviar PDF por WhatsApp"
                        onClick={() => onSendInvoiceByWhatsApp(quote)}
                        style={styles.whatsAppIconButton}
                        title="Enviar PDF por WhatsApp"
                        type="button"
                      >
                        <MessageCircle aria-hidden="true" size={16} strokeWidth={2.2} />
                      </button>
                      <button
                        aria-label="Descargar PDF"
                        onClick={() => onDownloadPdf(quote)}
                        style={styles.iconActionButton}
                        title="Descargar PDF"
                        type="button"
                      >
                        <FileText aria-hidden="true" size={15} strokeWidth={2.2} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {activeSection === 'expenses' ? (
        <section style={styles.tablePanel} aria-labelledby="treasury-expenses-title">
          <div style={styles.panelHeader}>
            <div>
              <h2 id="treasury-expenses-title" style={styles.panelTitle}>
                Gastos
              </h2>
              <p style={styles.panelSubtitle}>Registro de gastos e inversiones de la empresa con seguimiento simple.</p>
            </div>
            <button onClick={onManageExpenseCategories} style={styles.secondaryButton} type="button">
              Administrar categorias
            </button>
          </div>
          <div style={styles.quoteEditorSection}>
            <section style={styles.quoteEditorBlock}>
              <div>
                <h3 style={styles.compactTitle}>Nuevo gasto</h3>
                <p style={styles.helperText}>La fecha queda fija al momento de crear el gasto. Cliente y categoria son opcionales.</p>
              </div>
              <form onSubmit={onExpenseSubmit} style={styles.serviceForm}>
                <div style={styles.formGridTwo}>
                  <Field
                    label="Monto"
                    min="0"
                    required
                    step="0.01"
                    type="number"
                    value={expenseForm.amount}
                    onChange={(amount) => onExpenseFormChange({ ...expenseForm, amount })}
                  />
                  <Field
                    label="Detalle"
                    required
                    value={expenseForm.detail}
                    onChange={(detail) => onExpenseFormChange({ ...expenseForm, detail })}
                  />
                </div>
                <div style={styles.formGridTwo}>
                  <label style={styles.label}>
                    Cliente
                    <select
                      onChange={(event) => onExpenseFormChange({ ...expenseForm, client_id: event.target.value })}
                      style={styles.input}
                      value={expenseForm.client_id}
                    >
                      <option value="">Sin cliente asociado</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={styles.label}>
                    Categoria
                    <select
                      onChange={(event) => onExpenseFormChange({ ...expenseForm, category_id: event.target.value })}
                      style={styles.input}
                      value={expenseForm.category_id}
                    >
                      <option value="">Sin categoria</option>
                      {expenseCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div style={styles.formGridTwo}>
                  <label style={styles.label}>
                    Estado
                    <select
                      onChange={(event) => onExpenseFormChange({ ...expenseForm, status: event.target.value as ExpenseStatus })}
                      style={styles.input}
                      value={expenseForm.status}
                    >
                      <option value="pending">Pendiente</option>
                      <option value="paid">Cobrado</option>
                    </select>
                  </label>
                </div>
                <label style={styles.label}>
                  Notas
                  <textarea
                    onChange={(event) => onExpenseFormChange({ ...expenseForm, notes: event.target.value })}
                    rows={3}
                    style={styles.textarea}
                    value={expenseForm.notes}
                  />
                </label>
                <button disabled={isSaving} style={styles.primaryButton} type="submit">
                  Registrar gasto
                </button>
              </form>
            </section>

            <section style={styles.quoteEditorBlock}>
              <div style={styles.panelHeaderCompact}>
                <div>
                  <h3 style={styles.compactTitle}>Historial de gastos</h3>
                  <p style={styles.helperText}>Consulta y actualiza rapido el estado de cada gasto registrado.</p>
                </div>
                <div style={styles.platformFilterBar}>
                  {[
                    { key: 'all', label: 'Todos' },
                    { key: 'pending', label: 'Pendientes' },
                    { key: 'paid', label: 'Cobrados' },
                  ].map((filter) => (
                    <button
                      key={filter.key}
                      onClick={() => setExpenseFilter(filter.key as ExpenseFilter)}
                      style={expenseFilter === filter.key ? styles.platformFilterButtonActive : styles.platformFilterButton}
                      type="button"
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>
              {filteredExpenseEntries.length === 0 ? (
                <p style={styles.compactEmpty}>Todavia no hay gastos para ese filtro.</p>
              ) : (
                <div style={styles.clientList}>
                  {filteredExpenseEntries.map((entry) => (
                    <article key={entry.id} style={styles.treasuryMovementRow}>
                      <div style={styles.treasuryMovementPrimary}>
                        <strong>{entry.detail}</strong>
                        <span style={styles.treasuryMovementMeta}>{formatDate(entry.created_at)}</span>
                        <span style={styles.mutedText}>
                          {[entry.client_name, entry.category_name].filter(Boolean).join(' · ') || 'Sin cliente ni categoria'}
                        </span>
                        {entry.notes ? <span style={styles.mutedText}>{entry.notes}</span> : null}
                      </div>
                      <StatusBadge
                        status={entry.status === 'paid' ? 'accepted' : 'issued'}
                        label={entry.status === 'paid' ? 'Cobrado' : 'Pendiente'}
                      />
                      <strong style={styles.treasuryMovementAmount}>{formatMoney(entry.amount)}</strong>
                      <div style={styles.treasuryActionGroup}>
                        {entry.status === 'pending' ? (
                          <button onClick={() => onExpenseStatusChange(entry, 'paid')} style={styles.primaryButton} type="button">
                            Marcar cobrado
                          </button>
                        ) : (
                          <button onClick={() => onExpenseStatusChange(entry, 'pending')} style={styles.secondaryButton} type="button">
                            Volver a pendiente
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </section>
      ) : null}
    </section>
  );
}
