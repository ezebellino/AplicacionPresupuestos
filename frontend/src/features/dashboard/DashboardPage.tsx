import { FormEvent, useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';

import {
  apiClient,
  Client,
  ClientPayload,
  CostCategory,
  CostItem,
  CostItemPayload,
} from '../../shared/api/client';

type DashboardPageProps = {
  onLogout: () => void;
};

type View = 'summary' | 'clients' | 'costs';

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

const categoryLabels: Record<CostCategory, string> = {
  equipment: 'Equipos',
  materials: 'Materiales',
  labor: 'Mano de obra',
  services: 'Servicios',
};

const quoteRows = [
  { client: 'Acme Clima', quote: 'P-1024', status: 'Borrador', total: '$18.420' },
  { client: 'Norte Obras', quote: 'P-1025', status: 'Emitido', total: '$9.870' },
  { client: 'Soluciones HVAC', quote: 'P-1026', status: 'Aceptado', total: '$31.200' },
];

export function DashboardPage({ onLogout }: DashboardPageProps) {
  const [activeView, setActiveView] = useState<View>('summary');
  const [clients, setClients] = useState<Client[]>([]);
  const [costItems, setCostItems] = useState<CostItem[]>([]);
  const [clientForm, setClientForm] = useState<ClientForm>(emptyClientForm);
  const [costForm, setCostForm] = useState<CostForm>(emptyCostForm);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [editingCostId, setEditingCostId] = useState<string | null>(null);
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
    { label: 'Presupuestos', value: String(quoteRows.length) },
  ];

  const loadWorkspace = async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const [clientsResponse, costsResponse] = await Promise.all([
        apiClient.listClients(),
        apiClient.listCostItems(),
      ]);
      setClients(clientsResponse.items);
      setCostItems(costsResponse.items);
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
            isLoading={isLoading}
            metrics={metrics}
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
      </section>
    </main>
  );
}

function SummaryView({
  costTotalsByCategory,
  isLoading,
  metrics,
}: {
  costTotalsByCategory: Record<CostCategory, number>;
  isLoading: boolean;
  metrics: { label: string; value: string }[];
}) {
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
            <button style={styles.primaryButton} type="button">
              Nuevo
            </button>
          </div>
          <DataTable
            headers={['Cliente', 'Presupuesto', 'Estado', 'Total']}
            rows={quoteRows.map((row) => [row.client, row.quote, row.status, row.total])}
          />
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
        {clients.length === 0 ? (
          <p style={styles.emptyState}>Todavia no hay clientes cargados.</p>
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
              {clients.map((client) => (
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
        {costItems.length === 0 ? (
          <p style={styles.emptyState}>Todavia no hay costos cargados.</p>
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
              {costItems.map((item) => (
                <tr key={item.id}>
                  <td style={styles.td}>{categoryLabels[item.category]}</td>
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
} satisfies Record<string, React.CSSProperties>;
