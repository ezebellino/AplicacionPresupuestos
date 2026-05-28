import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { History, MapPin, Pencil, Phone, Trash2 } from 'lucide-react';
import { FileText } from 'lucide-react';
import Swal from 'sweetalert2';
import type { Client, ClientPayload, ClientServiceRecord, Quote } from '../../../shared/api/client';
import type {
  ClientForm,
  ClientRecordRequest,
  ClientRecordSection,
  ClientSection,
  ClientsViewProps,
  ServiceRecordForm,
} from '../types';
import { clientName, formatDate, formatMoney, matchesSearch, quoteTimestamp } from '../helpers';
import { styles } from '../styles';
import { Field, StatusBadge } from '../ui';

export function ClientsView({
  clients,
  editingClientId,
  form,
  isCompactLayout,
  isSaving,
  recordRequest,
  quotes,
  selectedClientId,
  serviceRecordForm,
  serviceRecords,
  onCancel,
  onCreateQuoteForClient,
  onDelete,
  onEdit,
  onHistory,
  onOpenQuote,
  onQuickCreate,
  onRecordRequestHandled,
  onFormChange,
  onServiceFormChange,
  onServiceSubmit,
  onSubmit,
}: ClientsViewProps) {
  const [activeSection, setActiveSection] = useState<ClientSection>('list');
  const [activeRecordSection, setActiveRecordSection] = useState<ClientRecordSection>('data');
  const [search, setSearch] = useState('');
  const clientSections = [
    { id: 'list' as const, label: 'Listado' },
    { id: 'record' as const, label: 'Ficha' },
  ];
  const recordSections = [
    { id: 'data' as const, label: 'Datos' },
    { id: 'services' as const, label: 'Servicios' },
    { id: 'quotes' as const, label: 'Presupuestos' },
  ];
  const filteredClients = clients.filter((client) =>
    matchesSearch(
      [client.name, client.document, client.email, client.phone, client.address],
      search,
    ),
  );
  const selectedClient = clients.find((client) => client.id === selectedClientId) ?? null;
  const selectedClientQuotes = selectedClient
    ? quotes
        .filter((quote) => quote.client_id === selectedClient.id)
        .sort((left, right) => quoteTimestamp(right) - quoteTimestamp(left))
    : [];
  const quotesByClientId = quotes.reduce<Record<string, number>>((accumulator, quote) => {
    accumulator[quote.client_id] = (accumulator[quote.client_id] ?? 0) + 1;
    return accumulator;
  }, {});
  const latestSelectedClientQuote = selectedClientQuotes[0] ?? null;
  useEffect(() => {
    if (!recordRequest || recordRequest.clientId !== selectedClientId) {
      return;
    }

    setActiveRecordSection(recordRequest.section);
    setActiveSection('record');
    onRecordRequestHandled();
  }, [onRecordRequestHandled, recordRequest, selectedClientId]);

  const openClientRecord = async (client: Client, section: ClientRecordSection = 'data') => {
    setActiveRecordSection(section);
    setActiveSection('record');
    await onHistory(client);
  };
  const handleQuickCreate = async () => {
    const result = await Swal.fire({
      title: 'Nuevo cliente',
      html: `
        <p style="margin:0 0 14px;text-align:left;color:#64748b;font-size:13px;">
          Carga lo minimo para empezar y completa el resto despues desde la ficha.
        </p>
        <label style="display:grid;gap:6px;text-align:left;margin-bottom:12px;">
          <span>Nombre</span>
          <input id="client-name" class="swal2-input" placeholder="Ej. Juan Perez" style="margin:0;" />
        </label>
        <label style="display:grid;gap:6px;text-align:left;margin-bottom:12px;">
          <span>Telefono</span>
          <input id="client-phone" class="swal2-input" placeholder="Ej. 2245 476329" style="margin:0;" />
        </label>
        <label style="display:grid;gap:6px;text-align:left;">
          <span>Direccion</span>
          <input id="client-address" class="swal2-input" placeholder="Ej. Ameghino 655" style="margin:0;" />
        </label>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Crear cliente',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const nameValue = (document.getElementById('client-name') as HTMLInputElement | null)?.value.trim() ?? '';
        const phoneValue = (document.getElementById('client-phone') as HTMLInputElement | null)?.value.trim() ?? '';
        const addressValue =
          (document.getElementById('client-address') as HTMLInputElement | null)?.value.trim() ?? '';

        if (!nameValue || !phoneValue || !addressValue) {
          Swal.showValidationMessage('Completa nombre, telefono y direccion.');
          return undefined;
        }

        return {
          address: addressValue,
          name: nameValue,
          phone: phoneValue,
        };
      },
    });

    if (!result.isConfirmed || !result.value) {
      return;
    }

    const createdClient = await onQuickCreate(result.value);
    if (!createdClient) {
      return;
    }

    setActiveRecordSection('data');
    setActiveSection('record');
  };

  return (
    <section style={styles.companyWorkspace}>
      <div style={styles.companyWorkspaceHeader}>
        <div>
          <h2 style={styles.panelTitle}>Clientes</h2>
          <p style={styles.panelSubtitle}>Alta rapida, seguimiento y relacion completa de cada cliente en una sola ficha.</p>
        </div>
        <div style={styles.actions}>
          <button disabled={isSaving} onClick={() => void handleQuickCreate()} style={styles.primaryButton} type="button">
            Nuevo cliente
          </button>
          {isCompactLayout ? (
            <label style={styles.platformSelectField}>
              <span style={styles.labelCaption}>Seccion de clientes</span>
              <select
                aria-label="Seccion de clientes"
                onChange={(event) => setActiveSection(event.target.value as ClientSection)}
                style={styles.select}
                value={activeSection}
              >
                {clientSections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div style={styles.platformSectionNav} role="tablist" aria-label="Navegacion de clientes">
              {clientSections.map((section) => (
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
        <section style={styles.tablePanel} aria-labelledby="clients-title">
          <div style={styles.panelHeader}>
            <div>
              <h2 id="clients-title" style={styles.panelTitle}>
                Listado
              </h2>
              <p style={styles.panelSubtitle}>Busca rapido, abre la ficha y manten a mano las acciones mas usadas.</p>
            </div>
          </div>
          <div style={styles.filterBar}>
            <label style={styles.compactLabel}>
              Buscar
              <input
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nombre, documento o contacto"
                style={styles.searchInput}
                value={search}
              />
            </label>
          </div>
          {clients.length === 0 ? (
            <p style={styles.emptyState}>Todavia no hay clientes cargados.</p>
          ) : filteredClients.length === 0 ? (
            <p style={styles.emptyState}>No hay clientes que coincidan con la busqueda.</p>
          ) : (
            <div style={styles.clientList}>
              {filteredClients.map((client) => (
                <article key={client.id} style={styles.clientRow}>
                  <button
                    onClick={() => void openClientRecord(client, 'data')}
                    style={styles.clientRowButton}
                    type="button"
                  >
                    <div style={styles.clientIdentity}>
                      <strong>{client.name}</strong>
                      <span style={styles.mutedText}>{client.document || 'Sin documento cargado'}</span>
                    </div>
                    <div style={styles.clientContact}>
                      <span style={styles.clientContactLine}>
                        <Phone aria-hidden="true" size={14} strokeWidth={2} />
                        {client.phone || 'Sin telefono'}
                      </span>
                      <span style={styles.clientContactLineMuted}>
                        <MapPin aria-hidden="true" size={14} strokeWidth={2} />
                        {client.address || client.email || 'Sin direccion cargada'}
                      </span>
                    </div>
                    <div style={styles.clientMetaStack}>
                      <span style={styles.clientMetaPill}>{quotesByClientId[client.id] ?? 0} presup.</span>
                      {client.email ? <span style={styles.mutedText}>{client.email}</span> : null}
                    </div>
                  </button>
                  <div style={styles.clientActions}>
                    <button
                      aria-label="Editar"
                      onClick={() => {
                        void openClientRecord(client, 'data');
                        onEdit(client);
                      }}
                      style={styles.iconActionButton}
                      title="Editar"
                      type="button"
                    >
                      <Pencil aria-hidden="true" size={15} strokeWidth={2.2} />
                    </button>
                    <button
                      aria-label="Historial"
                      onClick={() => void openClientRecord(client, 'services')}
                      style={styles.iconActionButton}
                      title="Historial"
                      type="button"
                    >
                      <History aria-hidden="true" size={15} strokeWidth={2.2} />
                    </button>
                    <button
                      aria-label="Eliminar"
                      onClick={() => onDelete(client)}
                      style={styles.iconDangerButton}
                      title="Eliminar"
                      type="button"
                    >
                      <Trash2 aria-hidden="true" size={15} strokeWidth={2.2} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {activeSection === 'record' ? (
        <section style={styles.tablePanel} aria-labelledby="client-record-title">
          <div style={styles.panelHeader}>
            <div>
              <h2 id="client-record-title" style={styles.panelTitle}>
                {selectedClient ? `Ficha de ${selectedClient.name}` : 'Ficha del cliente'}
              </h2>
              <p style={styles.panelSubtitle}>
                {selectedClient
                  ? 'Consulta datos, servicios y presupuestos del cliente seleccionado.'
                  : 'Selecciona un cliente desde el listado o crea uno nuevo para continuar.'}
              </p>
            </div>
          </div>
          {!selectedClient ? (
            <p style={styles.emptyState}>Selecciona un cliente desde el listado para abrir su ficha.</p>
          ) : (
            <div style={styles.clientRecordShell}>
              {isCompactLayout ? (
                <label style={styles.platformSelectField}>
                  <span style={styles.labelCaption}>Seccion de ficha</span>
                  <select
                    aria-label="Seccion de ficha"
                    onChange={(event) => setActiveRecordSection(event.target.value as ClientRecordSection)}
                    style={styles.select}
                    value={activeRecordSection}
                  >
                    {recordSections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div style={styles.platformSectionNav} role="tablist" aria-label="Navegacion de ficha del cliente">
                  {recordSections.map((section) => (
                    <button
                      aria-pressed={activeRecordSection === section.id}
                      key={section.id}
                      onClick={() => setActiveRecordSection(section.id)}
                      style={
                        activeRecordSection === section.id
                          ? styles.platformSectionButtonActive
                          : styles.platformSectionButton
                      }
                      type="button"
                    >
                      {section.label}
                    </button>
                  ))}
                </div>
              )}

              {activeRecordSection === 'data' ? (
                editingClientId === selectedClient.id ? (
                  <form onSubmit={onSubmit} style={styles.formPanel}>
                    <h3 style={styles.compactTitle}>Editar cliente</h3>
                    <Field label="Nombre" required value={form.name} onChange={(name) => onFormChange({ ...form, name })} />
                    <Field label="CUIT/DNI" value={form.document} onChange={(document) => onFormChange({ ...form, document })} />
                    <Field label="Email" type="email" value={form.email} onChange={(email) => onFormChange({ ...form, email })} />
                    <Field label="Telefono" required value={form.phone} onChange={(phone) => onFormChange({ ...form, phone })} />
                    <Field label="Direccion" required value={form.address} onChange={(address) => onFormChange({ ...form, address })} />
                    <label style={styles.label}>
                      Notas
                      <textarea
                        onChange={(event) => onFormChange({ ...form, notes: event.target.value })}
                        rows={3}
                        style={styles.textarea}
                        value={form.notes}
                      />
                    </label>
                    <div style={styles.actions}>
                      <button disabled={isSaving} style={styles.primaryButton} type="submit">
                        Guardar cambios
                      </button>
                      <button onClick={onCancel} style={styles.secondaryButton} type="button">
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <section style={styles.quoteEditorSection}>
                    <article style={styles.quoteEditorBlock}>
                      <div style={styles.panelHeaderCompact}>
                        <div>
                          <h3 style={styles.compactTitle}>Datos</h3>
                          <p style={styles.helperText}>Identidad, contacto y contexto operativo del cliente seleccionado.</p>
                        </div>
                        <div style={styles.actions}>
                          <button onClick={() => onCreateQuoteForClient(selectedClient.id)} style={styles.primaryButton} type="button">
                            Nuevo presupuesto
                          </button>
                          <button onClick={() => onEdit(selectedClient)} style={styles.secondaryButton} type="button">
                            Editar cliente
                          </button>
                        </div>
                      </div>
                      <div style={styles.clientOverviewBar}>
                        <span style={styles.clientMetaPill}>Presupuestos: {selectedClientQuotes.length}</span>
                        <span style={styles.clientMetaPill}>Servicios: {serviceRecords.length}</span>
                        <span style={styles.clientMetaPill}>
                          Ult. mov.: {latestSelectedClientQuote ? formatDate(latestSelectedClientQuote.issued_at ?? latestSelectedClientQuote.created_at) : 'Sin actividad'}
                        </span>
                      </div>
                      <div style={styles.quoteSummaryGrid}>
                        <div style={styles.quoteSummaryCard}>
                          <span style={styles.quoteSummaryLabel}>Nombre</span>
                          <strong>{selectedClient.name}</strong>
                        </div>
                        <div style={styles.quoteSummaryCard}>
                          <span style={styles.quoteSummaryLabel}>Telefono</span>
                          <strong>{selectedClient.phone || 'Sin telefono'}</strong>
                        </div>
                        <div style={styles.quoteSummaryCard}>
                          <span style={styles.quoteSummaryLabel}>Direccion</span>
                          <strong>{selectedClient.address || 'Sin direccion'}</strong>
                        </div>
                        <div style={styles.quoteSummaryCard}>
                          <span style={styles.quoteSummaryLabel}>Email</span>
                          <strong>{selectedClient.email || 'Sin email'}</strong>
                        </div>
                        <div style={styles.quoteSummaryCard}>
                          <span style={styles.quoteSummaryLabel}>Documento</span>
                          <strong>{selectedClient.document || 'Sin documento'}</strong>
                        </div>
                        <div style={styles.quoteSummaryCard}>
                          <span style={styles.quoteSummaryLabel}>Notas</span>
                          <strong>{selectedClient.notes || 'Sin notas operativas'}</strong>
                        </div>
                      </div>
                    </article>
                  </section>
                )
              ) : null}

              {activeRecordSection === 'services' ? (
                <section style={styles.quoteEditorSection}>
                  <article style={styles.quoteEditorBlock}>
                    <div>
                      <h3 style={styles.compactTitle}>Servicios realizados</h3>
                      <p style={styles.helperText}>Registro cronologico para trabajos ya ejecutados o novedades operativas.</p>
                    </div>
                    <form onSubmit={onServiceSubmit} style={styles.serviceForm}>
                      <Field
                        label="Fecha"
                        required
                        type="date"
                        value={serviceRecordForm.performed_at}
                        onChange={(performedAt) => onServiceFormChange({ ...serviceRecordForm, performed_at: performedAt })}
                      />
                      <Field
                        label="Servicio"
                        required
                        value={serviceRecordForm.title}
                        onChange={(title) => onServiceFormChange({ ...serviceRecordForm, title })}
                      />
                      <Field
                        label="Importe"
                        min="0"
                        step="0.01"
                        type="number"
                        value={serviceRecordForm.amount}
                        onChange={(amount) => onServiceFormChange({ ...serviceRecordForm, amount })}
                      />
                      <label style={styles.label}>
                        Detalle
                        <textarea
                          onChange={(event) => onServiceFormChange({ ...serviceRecordForm, description: event.target.value })}
                          rows={3}
                          style={styles.textarea}
                          value={serviceRecordForm.description}
                        />
                      </label>
                      <button disabled={isSaving} style={styles.primaryButton} type="submit">
                        Agregar servicio
                      </button>
                    </form>
                    {serviceRecords.length === 0 ? (
                      <p style={styles.compactEmpty}>Todavia no hay servicios registrados.</p>
                    ) : (
                      <div style={styles.serviceList}>
                        {serviceRecords.map((record) => (
                          <article key={record.id} style={styles.serviceRecord}>
                            <div style={styles.historyRecordHeader}>
                              <div>
                                <strong>{record.title}</strong>
                                <p style={styles.panelSubtitle}>{formatDate(record.performed_at)}</p>
                              </div>
                              {record.amount ? <strong>{formatMoney(record.amount)}</strong> : null}
                            </div>
                            {record.description ? <p style={styles.serviceDescription}>{record.description}</p> : null}
                          </article>
                        ))}
                      </div>
                    )}
                  </article>
                </section>
              ) : null}

              {activeRecordSection === 'quotes' ? (
                <section style={styles.quoteEditorSection}>
                  <article style={styles.quoteEditorBlock}>
                    <div>
                      <h3 style={styles.compactTitle}>Presupuestos</h3>
                      <p style={styles.helperText}>Historial completo de presupuestos emitidos para este cliente.</p>
                    </div>
                    {selectedClientQuotes.length === 0 ? (
                      <p style={styles.compactEmpty}>Todavia no hay presupuestos para este cliente.</p>
                    ) : (
                      <div style={styles.serviceList}>
                        {selectedClientQuotes.map((quote) => (
                          <article key={quote.id} style={styles.historyQuoteRecord}>
                            <div style={styles.historyRecordHeader}>
                              <div>
                                <strong>{quote.title || quote.number}</strong>
                                <p style={styles.panelSubtitle}>
                                  {quote.number} - {formatDate(quote.issued_at ?? quote.created_at)}
                                </p>
                              </div>
                              <StatusBadge status={quote.status} />
                            </div>
                            {quote.items.length > 0 ? (
                              <p style={styles.serviceDescription}>{quote.items.map((item) => item.name).join(', ')}</p>
                            ) : (
                              <p style={styles.serviceDescription}>Presupuesto sin items cargados.</p>
                            )}
                            <div style={styles.panelHeaderCompact}>
                              <strong>{formatMoney(quote.total)}</strong>
                              <button
                                aria-label="Abrir presupuesto"
                                onClick={() => onOpenQuote(quote.id)}
                                style={styles.iconActionButton}
                                title="Abrir presupuesto"
                                type="button"
                              >
                                <FileText aria-hidden="true" size={15} strokeWidth={2.2} />
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </article>
                </section>
              ) : null}
            </div>
          )}
        </section>
      ) : null}
    </section>
  );
}



