import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Eye, FileText, Trash2 } from 'lucide-react';
import type { Client, CostItem, Quote, QuoteStatus } from '../../../shared/api/client';
import { emptyQuoteForm } from '../state';
import { statusLabels } from '../constants';
import type { ClientRecordSection, QuoteForm, QuoteSection, QuotesViewProps } from '../types';
import { clientName, formatDate, formatMoney, matchesSearch, quoteTimestamp } from '../helpers';
import { styles } from '../styles';
import { Field, QuoteProgress, StatusBadge } from '../ui';

export function QuotesView({
  clients,
  costItems,
  editorRequestId,
  form,
  isCompactLayout,
  isSaving,
  newQuoteClientIdRequest,
  onAddCostItem,
  onDeleteItem,
  onDeleteQuotes,
  onDownloadPdf,
  onEditClient,
  onEditorRequestHandled,
  onFormChange,
  onNewQuoteClientRequestHandled,
  onSelectQuote,
  onSubmit,
  onTransition,
  quotes,
  selectedQuoteId,
}: QuotesViewProps) {
  const [activeSection, setActiveSection] = useState<QuoteSection>('list');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'all'>('all');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedQuoteIds, setSelectedQuoteIds] = useState<string[]>([]);
  useEffect(() => {
    if (!newQuoteClientIdRequest) {
      return;
    }

    onFormChange({ ...emptyQuoteForm, client_id: newQuoteClientIdRequest });
    setIsCreatingNew(true);
    setActiveSection('editor');
    onNewQuoteClientRequestHandled();
  }, [newQuoteClientIdRequest, onFormChange, onNewQuoteClientRequestHandled]);

  useEffect(() => {
    if (!editorRequestId || selectedQuoteId !== editorRequestId) {
      return;
    }

    setIsCreatingNew(false);
    setActiveSection('editor');
    onEditorRequestHandled();
  }, [editorRequestId, onEditorRequestHandled, selectedQuoteId]);

  useEffect(() => {
    setSelectedQuoteIds((current) => current.filter((quoteId) => quotes.some((quote) => quote.id === quoteId)));
  }, [quotes]);

  const filteredQuotes = [...quotes]
    .sort((left, right) => quoteTimestamp(right) - quoteTimestamp(left))
    .filter((quote) => {
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;

    return (
      matchesStatus &&
      matchesSearch(
        [
          quote.number,
          quote.title,
          quote.notes,
          statusLabels[quote.status],
          clientName(clients, quote.client_id),
        ],
        search,
      )
    );
    });
  const selectedQuote = quotes.find((quote) => quote.id === selectedQuoteId) ?? null;
  const selectedQuotesForDeletion = quotes.filter((quote) => selectedQuoteIds.includes(quote.id));
  const canEditSelected = selectedQuote?.status === 'draft';
  const filteredCatalogItems = costItems.filter((item) =>
    matchesSearch([item.name, item.description], catalogSearch),
  );
  const quoteSections: Array<{ id: QuoteSection; label: string }> = [
    { id: 'list', label: `Listado (${filteredQuotes.length})` },
    { id: 'editor', label: 'Editor' },
  ];
  const handleCreateQuote = async (event: FormEvent<HTMLFormElement>) => {
    const wasCreated = await onSubmit(event);

    if (wasCreated) {
      setIsCreatingNew(false);
      setActiveSection('editor');
    }
  };
  const openNewQuoteEditor = () => {
    onFormChange(emptyQuoteForm);
    setIsCreatingNew(true);
    setActiveSection('editor');
  };
  const openExistingQuote = (quoteId: string) => {
    setIsCreatingNew(false);
    onSelectQuote(quoteId);
    setActiveSection('editor');
  };
  const toggleQuoteSelection = (quoteId: string) => {
    setSelectedQuoteIds((current) =>
      current.includes(quoteId) ? current.filter((id) => id !== quoteId) : [...current, quoteId],
    );
  };
  const handleDeleteSelectedQuotes = async () => {
    const deleted = await onDeleteQuotes(selectedQuotesForDeletion);
    if (deleted) {
      setSelectedQuoteIds([]);
    }
  };

  return (
    <section style={styles.companyWorkspace}>
      <div style={styles.companyWorkspaceHeader}>
        <div>
          <h2 style={styles.panelTitle}>Presupuestos</h2>
          <p style={styles.panelSubtitle}>Gestiona borradores, emisiones y seguimiento desde un flujo mas claro.</p>
        </div>
        <div style={styles.actions}>
          <button onClick={openNewQuoteEditor} style={styles.primaryButton} type="button">
            Nuevo presupuesto
          </button>
          {isCompactLayout ? (
            <label style={styles.platformSelectField}>
              <span style={styles.labelCaption}>Seccion de presupuestos</span>
              <select
                aria-label="Seccion de presupuestos"
                onChange={(event) => setActiveSection(event.target.value as QuoteSection)}
                style={styles.select}
                value={activeSection}
              >
                {quoteSections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div style={styles.platformSectionNav} role="tablist" aria-label="Navegacion de presupuestos">
              {quoteSections.map((section) => (
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
      </div>

      {activeSection === 'list' ? (
        <section style={styles.tablePanel} aria-labelledby="quotes-title">
          <div style={styles.panelHeader}>
            <div>
              <h2 id="quotes-title" style={styles.panelTitle}>
                Listado
              </h2>
              <p style={styles.panelSubtitle}>Ordena, filtra y reabre presupuestos desde una lectura mas clara.</p>
            </div>
          </div>
          <div style={styles.quoteFilterBar}>
            <label style={styles.compactLabel}>
              Buscar
              <input
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cliente, numero o titulo"
                style={styles.searchInput}
                value={search}
              />
            </label>
            <div aria-label="Filtro de estado" style={styles.statusFilterRow}>
              <button
                onClick={() => setStatusFilter('all')}
                style={statusFilter === 'all' ? styles.filterChipActive : styles.filterChip}
                type="button"
              >
                Todos
              </button>
              {Object.entries(statusLabels).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setStatusFilter(value as QuoteStatus)}
                  style={statusFilter === value ? styles.filterChipActive : styles.filterChip}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
            {selectedQuoteIds.length > 0 ? (
              <div style={styles.bulkActionBar}>
                <span style={styles.bulkActionText}>
                  {selectedQuoteIds.length} seleccionado{selectedQuoteIds.length === 1 ? '' : 's'}
                </span>
                <button
                  disabled={isSaving}
                  onClick={handleDeleteSelectedQuotes}
                  style={styles.dangerOutlineButton}
                  type="button"
                >
                  Eliminar seleccionados
                </button>
              </div>
            ) : null}
          </div>
          {quotes.length === 0 ? (
            <p style={styles.emptyState}>Todavia no hay presupuestos.</p>
          ) : filteredQuotes.length === 0 ? (
            <p style={styles.emptyState}>No hay presupuestos para esos filtros.</p>
          ) : (
            <div style={styles.quoteList}>
              {filteredQuotes.map((quote) => (
                <article
                  key={quote.id}
                  style={quote.id === selectedQuoteId ? styles.quoteListActive : styles.quoteListButton}
                >
                  <div style={styles.quoteListCard}>
                    <label style={styles.quoteSelectionControl}>
                      <input
                        aria-label={`Seleccionar ${quote.number}`}
                        checked={selectedQuoteIds.includes(quote.id)}
                        onChange={() => toggleQuoteSelection(quote.id)}
                        style={styles.checkbox}
                        type="checkbox"
                      />
                    </label>
                    <button
                      onClick={() => openExistingQuote(quote.id)}
                      style={styles.quoteOpenButton}
                      type="button"
                    >
                    <div style={styles.quoteRowMain}>
                      <span style={styles.quoteNumber}>{quote.number}</span>
                      <strong>{clientName(clients, quote.client_id)}</strong>
                      <span style={styles.quoteTitleText}>{quote.title || 'Sin titulo'}</span>
                      <span style={styles.mutedText}>{formatDate(quote.created_at)}</span>
                    </div>
                    <div style={styles.quoteListAside}>
                      <StatusBadge status={quote.status} />
                      <strong>{formatMoney(quote.total)}</strong>
                    </div>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {activeSection === 'editor' ? (
        <section style={styles.tablePanel} aria-labelledby="quote-detail-title">
          <div style={styles.panelHeader}>
            <div>
              <h2 id="quote-detail-title" style={styles.panelTitle}>
                {selectedQuote ? selectedQuote.number : 'Editor de presupuesto'}
              </h2>
              <p style={styles.panelSubtitle}>
                {selectedQuote
                  ? 'Trabaja el presupuesto seleccionado en un unico flujo de lectura y edicion.'
                  : 'Crea un borrador y continua cargando servicios sin salir del editor.'}
              </p>
            </div>
            {selectedQuote ? (
              <div style={styles.actions}>
                {selectedQuote.status === 'draft' ? (
                  <button onClick={() => onTransition(selectedQuote, 'issue')} style={styles.primaryButton} type="button">
                    Emitir
                  </button>
                ) : null}
                {selectedQuote.status === 'issued' ? (
                  <>
                    <button onClick={() => onTransition(selectedQuote, 'accept')} style={styles.primaryButton} type="button">
                      Aceptar
                    </button>
                    <button onClick={() => onTransition(selectedQuote, 'reject')} style={styles.secondaryButton} type="button">
                      Rechazar
                    </button>
                  </>
                ) : null}
                <button
                  aria-label="Descargar PDF"
                  onClick={() => onDownloadPdf(selectedQuote)}
                  style={styles.iconActionButton}
                  title="Descargar PDF"
                  type="button"
                >
                  <FileText aria-hidden="true" size={15} strokeWidth={2.2} />
                </button>
                <button
                  aria-label="Ver cliente"
                  onClick={() => {
                    void onEditClient(selectedQuote.client_id, 'data');
                  }}
                  style={styles.iconActionButton}
                  title="Ver cliente"
                  type="button"
                >
                  <Eye aria-hidden="true" size={15} strokeWidth={2.2} />
                </button>
              </div>
            ) : null}
          </div>

          {isCreatingNew || !selectedQuote ? (
            <form onSubmit={handleCreateQuote} style={styles.quoteEditorSection}>
              <section style={styles.quoteEditorBlock}>
                <div>
                  <h3 style={styles.compactTitle}>Cliente</h3>
                  <p style={styles.helperText}>Selecciona primero a quien va dirigido el presupuesto.</p>
                </div>
                <label style={styles.label}>
                  Cliente
                  <select
                    onChange={(event) => onFormChange({ ...form, client_id: event.target.value })}
                    required
                    style={styles.input}
                    value={form.client_id}
                  >
                    <option value="">Seleccionar cliente</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </label>
              </section>
              <section style={styles.quoteEditorBlock}>
                <div>
                  <h3 style={styles.compactTitle}>Datos del presupuesto</h3>
                  <p style={styles.helperText}>Define titulo, vigencia y notas generales antes de emitir.</p>
                </div>
                <Field label="Titulo" value={form.title} onChange={(title) => onFormChange({ ...form, title })} />
                <Field
                  label="Valido hasta"
                  type="date"
                  value={form.valid_until}
                  onChange={(validUntil) => onFormChange({ ...form, valid_until: validUntil })}
                />
                <label style={styles.label}>
                  Notas
                  <textarea
                    onChange={(event) => onFormChange({ ...form, notes: event.target.value })}
                    rows={3}
                    style={styles.textarea}
                    value={form.notes}
                  />
                </label>
              </section>
              <section style={styles.quoteEditorBlock}>
                <div>
                  <h3 style={styles.compactTitle}>Totales y acciones</h3>
                  <p style={styles.helperText}>Primero crea el borrador. Luego podras cargar servicios y emitirlo.</p>
                </div>
                <button disabled={isSaving || clients.length === 0} style={styles.primaryButton} type="submit">
                  Crear borrador
                </button>
              </section>
            </form>
          ) : (
            <>
              <QuoteProgress quote={selectedQuote} />
              <div style={styles.quoteEditorSection}>
                <section style={styles.quoteEditorBlock}>
                  <div>
                    <h3 style={styles.compactTitle}>Cliente</h3>
                    <p style={styles.helperText}>Empresa o cliente asociado al presupuesto actual.</p>
                  </div>
                    <div style={styles.quoteSummaryCard}>
                      <div style={styles.panelHeaderCompact}>
                        <strong>{clientName(clients, selectedQuote.client_id)}</strong>
                        <button
                          aria-label="Abrir ficha del cliente"
                          onClick={() => {
                            void onEditClient(selectedQuote.client_id, 'data');
                          }}
                          style={styles.iconActionButton}
                          title="Abrir ficha del cliente"
                          type="button"
                        >
                          <Eye aria-hidden="true" size={15} strokeWidth={2.2} />
                        </button>
                      </div>
                    <div style={styles.detailMeta}>
                      <span>{selectedQuote.title || 'Sin titulo'}</span>
                      <StatusBadge status={selectedQuote.status} />
                    </div>
                  </div>
                </section>

                <section style={styles.quoteEditorBlock}>
                  <div>
                    <h3 style={styles.compactTitle}>Datos del presupuesto</h3>
                    <p style={styles.helperText}>Resumen operativo del presupuesto seleccionado.</p>
                  </div>
                  <div style={styles.quoteSummaryGrid}>
                    <div style={styles.quoteSummaryCard}>
                      <span style={styles.quoteSummaryLabel}>Numero</span>
                      <strong>{selectedQuote.number}</strong>
                    </div>
                    <div style={styles.quoteSummaryCard}>
                      <span style={styles.quoteSummaryLabel}>Fecha</span>
                      <strong>{formatDate(selectedQuote.created_at)}</strong>
                    </div>
                    <div style={styles.quoteSummaryCard}>
                      <span style={styles.quoteSummaryLabel}>Vigencia</span>
                      <strong>{selectedQuote.valid_until ? formatDate(selectedQuote.valid_until) : 'Sin fecha'}</strong>
                    </div>
                    <div style={styles.quoteSummaryCard}>
                      <span style={styles.quoteSummaryLabel}>Notas</span>
                      <strong>{selectedQuote.notes || 'Sin notas'}</strong>
                    </div>
                  </div>
                </section>

                {canEditSelected ? (
                  <section style={styles.quoteEditorBlock} aria-label="Items de cobro">
                    <div>
                      <h3 style={styles.compactTitle}>Items de cobro</h3>
                      <p style={styles.helperText}>Agrega varios servicios seguidos sin salir del editor.</p>
                    </div>
                    <div style={styles.quoteCatalogSurface}>
                      <label style={styles.compactLabel}>
                        Buscar servicio
                        <input
                          onChange={(event) => setCatalogSearch(event.target.value)}
                          placeholder="Instalacion, mantenimiento o carga de gas"
                          style={styles.searchInput}
                          value={catalogSearch}
                        />
                      </label>
                      {costItems.length === 0 ? (
                        <p style={styles.emptyState}>Carga primero los servicios con su precio.</p>
                      ) : filteredCatalogItems.length === 0 ? (
                        <p style={styles.emptyState}>No hay servicios para esa busqueda.</p>
                      ) : (
                        <div style={styles.catalogGrid}>
                          {filteredCatalogItems.map((item) => (
                            <button
                              disabled={isSaving}
                              key={item.id}
                              onClick={() => onAddCostItem(selectedQuote, item)}
                              style={styles.catalogItemButton}
                              type="button"
                            >
                              <span>
                                <strong>{item.name}</strong>
                                {item.description ? <small style={styles.catalogItemDescription}>{item.description}</small> : null}
                              </span>
                              <span style={styles.catalogItemPrice}>{formatMoney(item.unit_cost)}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>
                ) : null}

                <section style={styles.quoteEditorBlock}>
                  <div>
                    <h3 style={styles.compactTitle}>Totales y acciones</h3>
                    <p style={styles.helperText}>Revisa el detalle cargado y ejecuta solo las acciones validas para su estado.</p>
                  </div>
                  {selectedQuote.items.length === 0 ? (
                    <p style={styles.emptyState}>Agrega items desde el catalogo de servicios.</p>
                  ) : (
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Item</th>
                          <th style={styles.thRight}>Cant.</th>
                          <th style={styles.thRight}>Unitario</th>
                          <th style={styles.thRight}>IVA</th>
                          <th style={styles.thRight}>Total</th>
                          {canEditSelected ? <th style={styles.thRight}>Acciones</th> : null}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedQuote.items.map((item) => (
                          <tr key={item.id}>
                            <td style={styles.td}>
                              <strong>{item.name}</strong>
                              {item.description ? (
                                <>
                                  <br />
                                  <span style={styles.mutedText}>{item.description}</span>
                                </>
                              ) : null}
                            </td>
                            <td style={styles.tdRight}>{item.quantity}</td>
                            <td style={styles.tdRight}>{formatMoney(item.unit_price)}</td>
                            <td style={styles.tdRight}>{item.tax_rate}%</td>
                            <td style={styles.tdRight}>{formatMoney(item.line_total)}</td>
                            {canEditSelected ? (
                              <td style={styles.tdRight}>
                                <button
                                  aria-label="Quitar item"
                                  onClick={() => onDeleteItem(selectedQuote, item.id)}
                                  style={styles.iconDangerButton}
                                  title="Quitar item"
                                  type="button"
                                >
                                  <Trash2 aria-hidden="true" size={15} strokeWidth={2.2} />
                                </button>
                              </td>
                            ) : null}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  <div style={styles.totals}>
                    <span>Subtotal {formatMoney(selectedQuote.subtotal)}</span>
                    <span>IVA {formatMoney(selectedQuote.tax_total)}</span>
                    <strong>Total {formatMoney(selectedQuote.total)}</strong>
                  </div>
                </section>
              </div>
            </>
          )}
        </section>
      ) : null}
    </section>
  );
}



