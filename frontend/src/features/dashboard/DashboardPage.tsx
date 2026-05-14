import { FormEvent, useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';

import {
  apiClient,
  Client,
  ClientPayload,
  CostCategory,
  CostItem,
  CostItemPayload,
  Quote,
  QuoteItemPayload,
  QuotePayload,
  QuoteStatus,
} from '../../shared/api/client';

type DashboardPageProps = {
  onLogout: () => void;
};

type View = 'summary' | 'clients' | 'costs' | 'quotes';

type ClientForm = {
  name: string;
  document: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
};

type CostForm = {
  category: CostCategory;
  name: string;
  description: string;
  unit: string;
  unit_cost: string;
  tax_rate: string;
};

type QuoteForm = {
  client_id: string;
  title: string;
  notes: string;
  valid_until: string;
};

type QuoteItemForm = {
  source_cost_item_id: string;
  quantity: string;
  discount_amount: string;
};

const emptyClientForm: ClientForm = {
  name: '',
  document: '',
  email: '',
  phone: '',
  address: '',
  notes: '',
};

const emptyCostForm: CostForm = {
  category: 'equipment',
  name: '',
  description: '',
  unit: 'unidad',
  unit_cost: '',
  tax_rate: '',
};

const emptyQuoteForm: QuoteForm = {
  client_id: '',
  title: '',
  notes: '',
  valid_until: '',
};

const emptyQuoteItemForm: QuoteItemForm = {
  source_cost_item_id: '',
  quantity: '1',
  discount_amount: '0',
};

const categoryLabels: Record<CostCategory, string> = {
  equipment: 'Equipos',
  materials: 'Materiales',
  labor: 'Mano de obra',
  services: 'Servicios',
};

const statusLabels: Record<QuoteStatus, string> = {
  draft: 'Borrador',
  issued: 'Emitido',
  accepted: 'Aceptado',
  rejected: 'Rechazado',
};

export function DashboardPage({ onLogout }: DashboardPageProps) {
  const [activeView, setActiveView] = useState<View>('summary');
  const [clients, setClients] = useState<Client[]>([]);
  const [costItems, setCostItems] = useState<CostItem[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clientForm, setClientForm] = useState<ClientForm>(emptyClientForm);
  const [costForm, setCostForm] = useState<CostForm>(emptyCostForm);
  const [quoteForm, setQuoteForm] = useState<QuoteForm>(emptyQuoteForm);
  const [quoteItemForm, setQuoteItemForm] = useState<QuoteItemForm>(emptyQuoteItemForm);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editingCostId, setEditingCostId] = useState<string | null>(null);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const costTotalsByCategory = useMemo(
    () =>
      costItems.reduce<Record<CostCategory, number>>(
        (totals, item) => ({
          ...totals,
          [item.category]: totals[item.category] + 1,
        }),
        { equipment: 0, materials: 0, labor: 0, services: 0 },
      ),
    [costItems],
  );

  const metrics = [
    { label: 'Clientes', value: String(clients.length) },
    { label: 'Costos activos', value: String(costItems.length) },
    { label: 'Presupuestos', value: String(quotes.length) },
  ];

  const loadWorkspace = async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const [clientsResponse, costsResponse, quotesResponse] = await Promise.all([
        apiClient.listClients(),
        apiClient.listCostItems(),
        apiClient.listQuotes(),
      ]);
      setClients(clientsResponse.items);
      setCostItems(costsResponse.items);
      setQuotes(quotesResponse.items);
      setSelectedQuoteId((current) => {
        if (current && quotesResponse.items.some((quote) => quote.id === current)) {
          return current;
        }

        return quotesResponse.items[0]?.id ?? null;
      });
    } catch {
      setLoadError('No pude cargar los datos. Revisá que el backend esté activo y que tu sesión siga vigente.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkspace();
  }, []);

  const handleClientSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    const payload: ClientPayload = compactPayload(clientForm);

    try {
      if (editingClientId) {
        await apiClient.updateClient(editingClientId, payload);
      } else {
        await apiClient.createClient(payload);
      }

      setClientForm(emptyClientForm);
      setEditingClientId(null);
      await loadWorkspace();
    } catch {
      await Swal.fire({
        title: 'No se pudo guardar el cliente',
        text: 'Validá los datos e intentá nuevamente.',
        icon: 'error',
        confirmButtonText: 'Cerrar',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCostSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    const payload: CostItemPayload = {
      category: costForm.category,
      name: costForm.name.trim(),
      description: nullable(costForm.description),
      unit: costForm.unit.trim(),
      unit_cost: costForm.unit_cost,
      tax_rate: nullable(costForm.tax_rate),
    };

    try {
      if (editingCostId) {
        await apiClient.updateCostItem(editingCostId, payload);
      } else {
        await apiClient.createCostItem(payload);
      }

      setCostForm(emptyCostForm);
      setEditingCostId(null);
      await loadWorkspace();
    } catch {
      await Swal.fire({
        title: 'No se pudo guardar el costo',
        text: 'Revisá importe, unidad e IVA. El IVA vacío usa el valor general de la empresa.',
        icon: 'error',
        confirmButtonText: 'Cerrar',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const editClient = (client: Client) => {
    setEditingClientId(client.id);
    setClientForm({
      name: client.name,
      document: client.document ?? '',
      email: client.email ?? '',
      phone: client.phone ?? '',
      address: client.address ?? '',
      notes: client.notes ?? '',
    });
    setActiveView('clients');
  };

  const editCost = (item: CostItem) => {
    setEditingCostId(item.id);
    setCostForm({
      category: item.category,
      name: item.name,
      description: item.description ?? '',
      unit: item.unit,
      unit_cost: item.unit_cost,
      tax_rate: item.tax_rate ?? '',
    });
    setActiveView('costs');
  };

  const deleteClient = async (client: Client) => {
    const result = await Swal.fire({
      title: `Eliminar ${client.name}`,
      text: 'El cliente dejará de estar disponible para nuevos presupuestos.',
      icon: 'warning',
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      showCancelButton: true,
    });

    if (!result.isConfirmed) {
      return;
    }

    await apiClient.deleteClient(client.id);
    await loadWorkspace();
  };

  const deleteCost = async (item: CostItem) => {
    const result = await Swal.fire({
      title: `Desactivar ${item.name}`,
      text: 'El costo no se usará para nuevos presupuestos, pero mantiene el historial.',
      icon: 'warning',
      confirmButtonText: 'Desactivar',
      cancelButtonText: 'Cancelar',
      showCancelButton: true,
    });

    if (!result.isConfirmed) {
      return;
    }

    await apiClient.deleteCostItem(item.id);
    await loadWorkspace();
  };

  const handleQuoteSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    const payload: QuotePayload = {
      client_id: quoteForm.client_id,
      title: nullable(quoteForm.title),
      notes: nullable(quoteForm.notes),
      valid_until: quoteForm.valid_until ? `${quoteForm.valid_until}T00:00:00` : null,
    };

    try {
      const quote = await apiClient.createQuote(payload);
      setQuoteForm(emptyQuoteForm);
      setSelectedQuoteId(quote.id);
      await loadWorkspace();
    } catch {
      await Swal.fire({
        title: 'No se pudo crear el presupuesto',
        text: 'Selecciona un cliente valido e intenta nuevamente.',
        icon: 'error',
        confirmButtonText: 'Cerrar',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuoteItemSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedQuoteId) {
      return;
    }

    setIsSaving(true);

    const payload: QuoteItemPayload = {
      source_cost_item_id: quoteItemForm.source_cost_item_id,
      quantity: quoteItemForm.quantity,
      discount_amount: quoteItemForm.discount_amount || '0',
    };

    try {
      await apiClient.addQuoteItem(selectedQuoteId, payload);
      setQuoteItemForm(emptyQuoteItemForm);
      await loadWorkspace();
    } catch {
      await Swal.fire({
        title: 'No se pudo agregar el item',
        text: 'El presupuesto debe estar en borrador y el costo debe estar activo.',
        icon: 'error',
        confirmButtonText: 'Cerrar',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const transitionQuote = async (quote: Quote, action: 'issue' | 'accept' | 'reject') => {
    try {
      if (action === 'issue') {
        await apiClient.issueQuote(quote.id);
      } else if (action === 'accept') {
        await apiClient.acceptQuote(quote.id);
      } else {
        await apiClient.rejectQuote(quote.id);
      }

      await loadWorkspace();
    } catch {
      await Swal.fire({
        title: 'No se pudo cambiar el estado',
        text: 'Recorda que solo se emiten borradores, y solo lo emitido puede aceptarse o rechazarse.',
        icon: 'error',
        confirmButtonText: 'Cerrar',
      });
    }
  };

  const deleteQuoteItem = async (quote: Quote, itemId: string) => {
    await apiClient.deleteQuoteItem(quote.id, itemId);
    await loadWorkspace();
  };

  const downloadQuotePdf = async (quote: Quote) => {
    try {
      const blob = await apiClient.downloadQuotePdf(quote.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `presupuesto-${quote.number}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      await Swal.fire({
        title: 'No se pudo descargar el PDF',
        text: 'Verifica que el backend este activo y tu sesion siga vigente.',
        icon: 'error',
        confirmButtonText: 'Cerrar',
      });
    }
  };

  return (
    <main style={styles.page}>
      <aside style={styles.sidebar} aria-label="Navegacion principal">
        <div style={styles.logoRow}>
          <div style={styles.logoMark}>P</div>
          <strong>Presupuestos</strong>
        </div>
        <nav style={styles.nav}>
          <button onClick={() => setActiveView('summary')} style={navStyle(activeView === 'summary')} type="button">
            Resumen
          </button>
          <button onClick={() => setActiveView('clients')} style={navStyle(activeView === 'clients')} type="button">
            Clientes
          </button>
          <button onClick={() => setActiveView('costs')} style={navStyle(activeView === 'costs')} type="button">
            Costos
          </button>
          <button onClick={() => setActiveView('quotes')} style={navStyle(activeView === 'quotes')} type="button">
            Presupuestos
          </button>
        </nav>
      </aside>

      <section style={styles.content}>
        <header style={styles.topbar}>
          <div>
            <h1 style={styles.title}>Panel operativo</h1>
            <p style={styles.subtitle}>Clientes y costos aislados por empresa para armar presupuestos.</p>
          </div>
          <button onClick={onLogout} style={styles.secondaryButton} type="button">
            Salir
          </button>
        </header>

        {loadError ? <p style={styles.errorBanner}>{loadError}</p> : null}

        {activeView === 'summary' ? (
          <SummaryView
            costTotalsByCategory={costTotalsByCategory}
            clients={clients}
            isLoading={isLoading}
            metrics={metrics}
            onNewQuote={() => setActiveView('quotes')}
            quotes={quotes}
          />
        ) : null}

        {activeView === 'clients' ? (
          <ClientsView
            clients={clients}
            form={clientForm}
            isSaving={isSaving}
            editingClientId={editingClientId}
            onCancel={() => {
              setClientForm(emptyClientForm);
              setEditingClientId(null);
            }}
            onDelete={deleteClient}
            onEdit={editClient}
            onFormChange={setClientForm}
            onSubmit={handleClientSubmit}
          />
        ) : null}

        {activeView === 'costs' ? (
          <CostsView
            costItems={costItems}
            editingCostId={editingCostId}
            form={costForm}
            isSaving={isSaving}
            onCancel={() => {
              setCostForm(emptyCostForm);
              setEditingCostId(null);
            }}
            onDelete={deleteCost}
            onEdit={editCost}
            onFormChange={setCostForm}
            onSubmit={handleCostSubmit}
          />
        ) : null}

        {activeView === 'quotes' ? (
          <QuotesView
            clients={clients}
            costItems={costItems}
            form={quoteForm}
            isSaving={isSaving}
            itemForm={quoteItemForm}
            onDeleteItem={deleteQuoteItem}
            onDownloadPdf={downloadQuotePdf}
            onFormChange={setQuoteForm}
            onItemFormChange={setQuoteItemForm}
            onItemSubmit={handleQuoteItemSubmit}
            onSelectQuote={setSelectedQuoteId}
            onSubmit={handleQuoteSubmit}
            onTransition={transitionQuote}
            quotes={quotes}
            selectedQuoteId={selectedQuoteId}
          />
        ) : null}
      </section>
    </main>
  );
}

function SummaryView({
  clients,
  costTotalsByCategory,
  isLoading,
  metrics,
  onNewQuote,
  quotes,
}: {
  clients: Client[];
  costTotalsByCategory: Record<CostCategory, number>;
  isLoading: boolean;
  metrics: { label: string; value: string }[];
  onNewQuote: () => void;
  quotes: Quote[];
}) {
  const recentQuotes = quotes.slice(0, 5);

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
        <section style={styles.tablePanel} aria-labelledby="costs-by-category-title">
          <div style={styles.panelHeader}>
            <h2 id="costs-by-category-title" style={styles.panelTitle}>
              Costos por categoria
            </h2>
          </div>
          <div style={styles.categoryGrid}>
            {Object.entries(categoryLabels).map(([category, label]) => (
              <div key={category} style={styles.categoryRow}>
                <span>{label}</span>
                <strong>{costTotalsByCategory[category as CostCategory]}</strong>
              </div>
            ))}
          </div>
        </section>

        <section style={styles.tablePanel} aria-labelledby="recent-quotes-title">
          <div style={styles.panelHeader}>
            <h2 id="recent-quotes-title" style={styles.panelTitle}>
              Presupuestos recientes
            </h2>
            <button onClick={onNewQuote} style={styles.primaryButton} type="button">
              Nuevo
            </button>
          </div>
          {recentQuotes.length === 0 ? (
            <p style={styles.emptyState}>Todavia no hay presupuestos cargados.</p>
          ) : (
            <DataTable
              headers={['Cliente', 'Presupuesto', 'Estado', 'Total']}
              rows={recentQuotes.map((quote) => [
                clientName(clients, quote.client_id),
                quote.number,
                statusLabels[quote.status],
                formatMoney(quote.total),
              ])}
            />
          )}
        </section>
      </section>
    </>
  );
}

function ClientsView({
  clients,
  editingClientId,
  form,
  isSaving,
  onCancel,
  onDelete,
  onEdit,
  onFormChange,
  onSubmit,
}: {
  clients: Client[];
  editingClientId: string | null;
  form: ClientForm;
  isSaving: boolean;
  onCancel: () => void;
  onDelete: (client: Client) => void;
  onEdit: (client: Client) => void;
  onFormChange: (form: ClientForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [search, setSearch] = useState('');
  const filteredClients = clients.filter((client) =>
    matchesSearch(
      [client.name, client.document, client.email, client.phone, client.address],
      search,
    ),
  );

  return (
    <section style={styles.workspaceGrid}>
      <form onSubmit={onSubmit} style={styles.formPanel}>
        <h2 style={styles.panelTitle}>{editingClientId ? 'Editar cliente' : 'Nuevo cliente'}</h2>
        <Field label="Nombre" required value={form.name} onChange={(name) => onFormChange({ ...form, name })} />
        <Field label="CUIT/DNI" value={form.document} onChange={(document) => onFormChange({ ...form, document })} />
        <Field label="Email" type="email" value={form.email} onChange={(email) => onFormChange({ ...form, email })} />
        <Field label="Telefono" value={form.phone} onChange={(phone) => onFormChange({ ...form, phone })} />
        <Field label="Direccion" value={form.address} onChange={(address) => onFormChange({ ...form, address })} />
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
            {editingClientId ? 'Guardar cambios' : 'Crear cliente'}
          </button>
          {editingClientId ? (
            <button onClick={onCancel} style={styles.secondaryButton} type="button">
              Cancelar
            </button>
          ) : null}
        </div>
      </form>

      <section style={styles.tablePanel} aria-labelledby="clients-title">
        <div style={styles.panelHeader}>
          <h2 id="clients-title" style={styles.panelTitle}>
            Clientes
          </h2>
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
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Nombre</th>
                <th style={styles.th}>Contacto</th>
                <th style={styles.th}>Documento</th>
                <th style={styles.thRight}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => (
                <tr key={client.id}>
                  <td style={styles.td}>{client.name}</td>
                  <td style={styles.td}>{client.email || client.phone || '-'}</td>
                  <td style={styles.td}>{client.document || '-'}</td>
                  <td style={styles.tdRight}>
                    <button onClick={() => onEdit(client)} style={styles.linkButton} type="button">
                      Editar
                    </button>
                    <button onClick={() => onDelete(client)} style={styles.dangerButton} type="button">
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </section>
  );
}

function CostsView({
  costItems,
  editingCostId,
  form,
  isSaving,
  onCancel,
  onDelete,
  onEdit,
  onFormChange,
  onSubmit,
}: {
  costItems: CostItem[];
  editingCostId: string | null;
  form: CostForm;
  isSaving: boolean;
  onCancel: () => void;
  onDelete: (item: CostItem) => void;
  onEdit: (item: CostItem) => void;
  onFormChange: (form: CostForm) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CostCategory | 'all'>('all');
  const filteredCostItems = costItems.filter((item) => {
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;

    return (
      matchesCategory &&
      matchesSearch(
        [item.name, item.description, item.unit, categoryLabels[item.category]],
        search,
      )
    );
  });

  return (
    <section style={styles.workspaceGrid}>
      <form onSubmit={onSubmit} style={styles.formPanel}>
        <h2 style={styles.panelTitle}>{editingCostId ? 'Editar costo' : 'Nuevo costo'}</h2>
        <label style={styles.label}>
          Categoria
          <select
            onChange={(event) => onFormChange({ ...form, category: event.target.value as CostCategory })}
            style={styles.input}
            value={form.category}
          >
            {Object.entries(categoryLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <Field label="Nombre" required value={form.name} onChange={(name) => onFormChange({ ...form, name })} />
        <Field label="Unidad" required value={form.unit} onChange={(unit) => onFormChange({ ...form, unit })} />
        <Field
          label="Costo unitario"
          min="0"
          required
          step="0.01"
          type="number"
          value={form.unit_cost}
          onChange={(unitCost) => onFormChange({ ...form, unit_cost: unitCost })}
        />
        <Field
          label="IVA item"
          max="100"
          min="0"
          placeholder="Vacio usa IVA general"
          step="0.01"
          type="number"
          value={form.tax_rate}
          onChange={(taxRate) => onFormChange({ ...form, tax_rate: taxRate })}
        />
        <label style={styles.label}>
          Descripcion
          <textarea
            onChange={(event) => onFormChange({ ...form, description: event.target.value })}
            rows={3}
            style={styles.textarea}
            value={form.description}
          />
        </label>
        <div style={styles.actions}>
          <button disabled={isSaving} style={styles.primaryButton} type="submit">
            {editingCostId ? 'Guardar cambios' : 'Crear costo'}
          </button>
          {editingCostId ? (
            <button onClick={onCancel} style={styles.secondaryButton} type="button">
              Cancelar
            </button>
          ) : null}
        </div>
      </form>

      <section style={styles.tablePanel} aria-labelledby="costs-title">
        <div style={styles.panelHeader}>
          <h2 id="costs-title" style={styles.panelTitle}>
            Catalogo de costos
          </h2>
        </div>
        <div style={styles.filterBar}>
          <label style={styles.compactLabel}>
            Buscar
            <input
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nombre, unidad o categoria"
              style={styles.searchInput}
              value={search}
            />
          </label>
          <label style={styles.compactLabel}>
            Categoria
            <select
              onChange={(event) => setCategoryFilter(event.target.value as CostCategory | 'all')}
              style={styles.filterSelect}
              value={categoryFilter}
            >
              <option value="all">Todas</option>
              {Object.entries(categoryLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {costItems.length === 0 ? (
          <p style={styles.emptyState}>Todavia no hay costos cargados.</p>
        ) : filteredCostItems.length === 0 ? (
          <p style={styles.emptyState}>No hay costos para esos filtros.</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Categoria</th>
                <th style={styles.th}>Nombre</th>
                <th style={styles.th}>Unidad</th>
                <th style={styles.thRight}>Costo</th>
                <th style={styles.thRight}>IVA</th>
                <th style={styles.thRight}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredCostItems.map((item) => (
                <tr key={item.id}>
                  <td style={styles.td}>
                    <CategoryBadge category={item.category} />
                  </td>
                  <td style={styles.td}>{item.name}</td>
                  <td style={styles.td}>{item.unit}</td>
                  <td style={styles.tdRight}>{formatMoney(item.unit_cost)}</td>
                  <td style={styles.tdRight}>
                    {item.tax_rate ? `${item.tax_rate}%` : `${item.effective_tax_rate}% general`}
                  </td>
                  <td style={styles.tdRight}>
                    <button onClick={() => onEdit(item)} style={styles.linkButton} type="button">
                      Editar
                    </button>
                    <button onClick={() => onDelete(item)} style={styles.dangerButton} type="button">
                      Desactivar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </section>
  );
}

function QuotesView({
  clients,
  costItems,
  form,
  isSaving,
  itemForm,
  onDeleteItem,
  onDownloadPdf,
  onFormChange,
  onItemFormChange,
  onItemSubmit,
  onSelectQuote,
  onSubmit,
  onTransition,
  quotes,
  selectedQuoteId,
}: {
  clients: Client[];
  costItems: CostItem[];
  form: QuoteForm;
  isSaving: boolean;
  itemForm: QuoteItemForm;
  onDeleteItem: (quote: Quote, itemId: string) => void;
  onDownloadPdf: (quote: Quote) => void;
  onFormChange: (form: QuoteForm) => void;
  onItemFormChange: (form: QuoteItemForm) => void;
  onItemSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSelectQuote: (quoteId: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTransition: (quote: Quote, action: 'issue' | 'accept' | 'reject') => void;
  quotes: Quote[];
  selectedQuoteId: string | null;
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'all'>('all');
  const filteredQuotes = quotes.filter((quote) => {
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
  const canEditSelected = selectedQuote?.status === 'draft';

  return (
    <section style={styles.workspaceGrid}>
      <div style={styles.sideStack}>
        <form onSubmit={onSubmit} style={styles.formPanel}>
          <h2 style={styles.panelTitle}>Nuevo presupuesto</h2>
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
          <button disabled={isSaving || clients.length === 0} style={styles.primaryButton} type="submit">
            Crear borrador
          </button>
        </form>

        <section style={styles.tablePanel} aria-labelledby="quotes-title">
          <div style={styles.panelHeader}>
            <h2 id="quotes-title" style={styles.panelTitle}>
              Presupuestos
            </h2>
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
          </div>
          {quotes.length === 0 ? (
            <p style={styles.emptyState}>Todavia no hay presupuestos.</p>
          ) : filteredQuotes.length === 0 ? (
            <p style={styles.emptyState}>No hay presupuestos para esos filtros.</p>
          ) : (
            <div style={styles.quoteList}>
              {filteredQuotes.map((quote) => (
                <button
                  key={quote.id}
                  onClick={() => onSelectQuote(quote.id)}
                  style={quote.id === selectedQuoteId ? styles.quoteListActive : styles.quoteListButton}
                  type="button"
                >
                  <span style={styles.quoteRowMain}>
                    <span style={styles.quoteNumber}>{quote.number}</span>
                    <strong>{formatMoney(quote.total)}</strong>
                  </span>
                  <StatusBadge status={quote.status} />
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <section style={styles.tablePanel} aria-labelledby="quote-detail-title">
        <div style={styles.panelHeader}>
          <div>
            <h2 id="quote-detail-title" style={styles.panelTitle}>
              {selectedQuote ? selectedQuote.number : 'Detalle'}
            </h2>
            {selectedQuote ? (
              <div style={styles.detailMeta}>
                <span>{clientName(clients, selectedQuote.client_id)}</span>
                <StatusBadge status={selectedQuote.status} />
              </div>
            ) : null}
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
              <button onClick={() => onDownloadPdf(selectedQuote)} style={styles.secondaryButton} type="button">
                PDF
              </button>
            </div>
          ) : null}
        </div>

        {selectedQuote ? (
          <>
            <QuoteProgress quote={selectedQuote} />

            {canEditSelected ? (
              <form onSubmit={onItemSubmit} style={styles.inlineForm}>
                <label style={styles.label}>
                  Costo
                  <select
                    onChange={(event) =>
                      onItemFormChange({ ...itemForm, source_cost_item_id: event.target.value })
                    }
                    required
                    style={styles.input}
                    value={itemForm.source_cost_item_id}
                  >
                    <option value="">Seleccionar costo</option>
                    {costItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {categoryLabels[item.category]} · {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <Field
                  label="Cantidad"
                  min="0.01"
                  required
                  step="0.01"
                  type="number"
                  value={itemForm.quantity}
                  onChange={(quantity) => onItemFormChange({ ...itemForm, quantity })}
                />
                <Field
                  label="Descuento"
                  min="0"
                  step="0.01"
                  type="number"
                  value={itemForm.discount_amount}
                  onChange={(discount) => onItemFormChange({ ...itemForm, discount_amount: discount })}
                />
                <button disabled={isSaving || costItems.length === 0} style={styles.primaryButton} type="submit">
                  Agregar item
                </button>
              </form>
            ) : null}

            {selectedQuote.items.length === 0 ? (
              <p style={styles.emptyState}>Agrega items desde el catalogo de costos.</p>
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
                        <br />
                        <span style={styles.mutedText}>{categoryLabels[item.category]}</span>
                      </td>
                      <td style={styles.tdRight}>{item.quantity}</td>
                      <td style={styles.tdRight}>{formatMoney(item.unit_price)}</td>
                      <td style={styles.tdRight}>{item.tax_rate}%</td>
                      <td style={styles.tdRight}>{formatMoney(item.line_total)}</td>
                      {canEditSelected ? (
                        <td style={styles.tdRight}>
                          <button onClick={() => onDeleteItem(selectedQuote, item.id)} style={styles.dangerButton} type="button">
                            Quitar
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
          </>
        ) : (
          <p style={styles.emptyState}>Selecciona o crea un presupuesto para ver el detalle.</p>
        )}
      </section>
    </section>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <table style={styles.table}>
      <thead>
        <tr>
          {headers.map((header, index) => (
            <th key={header} style={index === headers.length - 1 ? styles.thRight : styles.th}>
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.join('-')}>
            {row.map((cell, index) => (
              <td key={cell} style={index === row.length - 1 ? styles.tdRight : styles.td}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StatusBadge({ status }: { status: QuoteStatus }) {
  return <span style={{ ...styles.statusBadge, ...statusBadgeStyle(status) }}>{statusLabels[status]}</span>;
}

function CategoryBadge({ category }: { category: CostCategory }) {
  return <span style={styles.categoryBadge}>{categoryLabels[category]}</span>;
}

function QuoteProgress({ quote }: { quote: Quote }) {
  const steps = [
    { key: 'client', label: 'Cliente', isDone: true },
    { key: 'items', label: 'Items', isDone: quote.items.length > 0 },
    {
      key: 'issued',
      label: quote.status === 'rejected' ? 'Rechazado' : 'Emitido',
      isDone: quote.status !== 'draft',
    },
    {
      key: 'decision',
      label: quote.status === 'accepted' ? 'Aceptado' : 'Decision',
      isDone: quote.status === 'accepted' || quote.status === 'rejected',
    },
  ];

  return (
    <div style={styles.progressBar} aria-label="Progreso del presupuesto">
      {steps.map((step) => (
        <div key={step.key} style={styles.progressStep}>
          <span style={step.isDone ? styles.progressDotDone : styles.progressDot} />
          <span style={step.isDone ? styles.progressLabelDone : styles.progressLabel}>{step.label}</span>
        </div>
      ))}
    </div>
  );
}

function Field({
  label,
  onChange,
  value,
  ...inputProps
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'>) {
  return (
    <label style={styles.label}>
      {label}
      <input
        {...inputProps}
        onChange={(event) => onChange(event.target.value)}
        style={styles.input}
        value={value}
      />
    </label>
  );
}

function compactPayload(form: ClientForm): ClientPayload {
  return {
    name: form.name.trim(),
    document: nullable(form.document),
    email: nullable(form.email),
    phone: nullable(form.phone),
    address: nullable(form.address),
    notes: nullable(form.notes),
  };
}

function clientName(clients: Client[], clientId: string): string {
  return clients.find((client) => client.id === clientId)?.name ?? 'Cliente';
}

function matchesSearch(values: Array<string | null>, search: string): boolean {
  const term = search.trim().toLowerCase();

  if (!term) {
    return true;
  }

  return values.some((value) => value?.toLowerCase().includes(term));
}

function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function formatMoney(value: string): string {
  return new Intl.NumberFormat('es-AR', {
    currency: 'ARS',
    style: 'currency',
  }).format(Number(value));
}

function navStyle(isActive: boolean): React.CSSProperties {
  return isActive ? styles.navActive : styles.navItem;
}

function statusBadgeStyle(status: QuoteStatus): React.CSSProperties {
  if (status === 'accepted') {
    return styles.statusAccepted;
  }

  if (status === 'issued') {
    return styles.statusIssued;
  }

  if (status === 'rejected') {
    return styles.statusRejected;
  }

  return styles.statusDraft;
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
    background: 'transparent',
    border: 0,
    borderRadius: '6px',
    color: '#526071',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '10px 12px',
    textAlign: 'left',
  },
  navActive: {
    background: '#eaf1ff',
    border: 0,
    borderRadius: '6px',
    color: '#1d4ed8',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 700,
    padding: '10px 12px',
    textAlign: 'left',
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
  errorBanner: {
    background: '#fff1f2',
    border: '1px solid #fecdd3',
    borderRadius: '8px',
    color: '#9f1239',
    margin: '0 0 20px',
    padding: '12px 14px',
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
  gridTwo: {
    display: 'grid',
    gap: '20px',
    gridTemplateColumns: 'minmax(280px, 0.8fr) minmax(420px, 1.2fr)',
  },
  workspaceGrid: {
    display: 'grid',
    gap: '20px',
    gridTemplateColumns: '360px minmax(0, 1fr)',
  },
  formPanel: {
    alignSelf: 'start',
    background: '#ffffff',
    border: '1px solid #d9e0e7',
    borderRadius: '8px',
    display: 'grid',
    gap: '14px',
    padding: '20px',
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
    verticalAlign: 'top',
  },
  tdRight: {
    borderTop: '1px solid #edf1f5',
    fontSize: '14px',
    fontWeight: 700,
    padding: '14px 20px',
    textAlign: 'right',
    verticalAlign: 'top',
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
    padding: '10px 11px',
  },
  textarea: {
    border: '1px solid #c9d3df',
    borderRadius: '6px',
    font: 'inherit',
    padding: '10px 11px',
    resize: 'vertical',
  },
  actions: {
    display: 'flex',
    gap: '10px',
    marginTop: '4px',
  },
  linkButton: {
    background: 'transparent',
    border: 0,
    color: '#1d4ed8',
    cursor: 'pointer',
    font: 'inherit',
    fontWeight: 700,
    marginRight: '10px',
    padding: 0,
  },
  dangerButton: {
    background: 'transparent',
    border: 0,
    color: '#be123c',
    cursor: 'pointer',
    font: 'inherit',
    fontWeight: 700,
    padding: 0,
  },
  emptyState: {
    color: '#526071',
    margin: 0,
    padding: '24px 20px',
  },
  categoryGrid: {
    display: 'grid',
    gap: '12px',
    padding: '20px',
  },
  categoryRow: {
    alignItems: 'center',
    background: '#f8fafc',
    border: '1px solid #e5eaf0',
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 14px',
  },
  panelSubtitle: {
    color: '#526071',
    fontSize: '13px',
    margin: '4px 0 0',
  },
  sideStack: {
    display: 'grid',
    gap: '20px',
  },
  quoteList: {
    display: 'grid',
    gap: '6px',
    padding: '10px',
  },
  quoteListButton: {
    background: '#ffffff',
    border: '1px solid transparent',
    borderRadius: '6px',
    color: '#17202a',
    cursor: 'pointer',
    display: 'flex',
    gap: '10px',
    justifyContent: 'space-between',
    padding: '10px 12px',
    textAlign: 'left',
  },
  quoteListActive: {
    background: '#eaf1ff',
    border: '1px solid #9bbcff',
    borderRadius: '6px',
    color: '#17202a',
    cursor: 'pointer',
    display: 'flex',
    gap: '10px',
    justifyContent: 'space-between',
    padding: '10px 12px',
    textAlign: 'left',
  },
  quoteRowMain: {
    display: 'grid',
    gap: '3px',
    minWidth: 0,
  },
  quoteNumber: {
    color: '#526071',
    fontSize: '13px',
    fontWeight: 700,
  },
  inlineForm: {
    alignItems: 'end',
    borderBottom: '1px solid #d9e0e7',
    display: 'grid',
    gap: '12px',
    gridTemplateColumns: 'minmax(220px, 1fr) 110px 130px auto',
    padding: '16px 20px',
  },
  mutedText: {
    color: '#667085',
    fontSize: '13px',
  },
  totals: {
    alignItems: 'center',
    borderTop: '1px solid #d9e0e7',
    display: 'flex',
    gap: '18px',
    justifyContent: 'flex-end',
    padding: '16px 20px',
  },
  filterBar: {
    alignItems: 'end',
    borderBottom: '1px solid #edf1f5',
    display: 'flex',
    gap: '12px',
    padding: '14px 20px',
  },
  quoteFilterBar: {
    borderBottom: '1px solid #edf1f5',
    display: 'grid',
    gap: '10px',
    padding: '14px 20px',
  },
  compactLabel: {
    color: '#526071',
    display: 'grid',
    flex: 1,
    fontSize: '12px',
    fontWeight: 700,
    gap: '6px',
    textTransform: 'uppercase',
  },
  searchInput: {
    border: '1px solid #c9d3df',
    borderRadius: '6px',
    color: '#17202a',
    font: 'inherit',
    fontSize: '14px',
    padding: '9px 10px',
    textTransform: 'none',
  },
  filterSelect: {
    border: '1px solid #c9d3df',
    borderRadius: '6px',
    color: '#17202a',
    font: 'inherit',
    fontSize: '14px',
    minWidth: '130px',
    padding: '9px 10px',
    textTransform: 'none',
  },
  statusFilterRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  filterChip: {
    background: '#ffffff',
    border: '1px solid #c9d3df',
    borderRadius: '999px',
    color: '#344054',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 700,
    padding: '6px 9px',
  },
  filterChipActive: {
    background: '#17202a',
    border: '1px solid #17202a',
    borderRadius: '999px',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 700,
    padding: '6px 9px',
  },
  statusBadge: {
    borderRadius: '999px',
    display: 'inline-flex',
    fontSize: '12px',
    fontWeight: 700,
    justifySelf: 'start',
    lineHeight: 1,
    padding: '6px 8px',
  },
  statusDraft: {
    background: '#eef2f7',
    color: '#475467',
  },
  statusIssued: {
    background: '#eaf1ff',
    color: '#1d4ed8',
  },
  statusAccepted: {
    background: '#ecfdf3',
    color: '#027a48',
  },
  statusRejected: {
    background: '#fff1f2',
    color: '#be123c',
  },
  categoryBadge: {
    background: '#f8fafc',
    border: '1px solid #d9e0e7',
    borderRadius: '999px',
    color: '#344054',
    display: 'inline-flex',
    fontSize: '12px',
    fontWeight: 700,
    lineHeight: 1,
    padding: '6px 8px',
  },
  detailMeta: {
    alignItems: 'center',
    color: '#526071',
    display: 'flex',
    fontSize: '13px',
    gap: '8px',
    marginTop: '6px',
  },
  progressBar: {
    alignItems: 'center',
    borderBottom: '1px solid #edf1f5',
    display: 'grid',
    gap: '10px',
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    padding: '16px 20px',
  },
  progressStep: {
    alignItems: 'center',
    display: 'flex',
    gap: '8px',
  },
  progressDot: {
    background: '#d0d5dd',
    borderRadius: '999px',
    display: 'inline-block',
    height: '10px',
    width: '10px',
  },
  progressDotDone: {
    background: '#027a48',
    borderRadius: '999px',
    display: 'inline-block',
    height: '10px',
    width: '10px',
  },
  progressLabel: {
    color: '#667085',
    fontSize: '13px',
    fontWeight: 700,
  },
  progressLabelDone: {
    color: '#17202a',
    fontSize: '13px',
    fontWeight: 700,
  },
} satisfies Record<string, React.CSSProperties>;
