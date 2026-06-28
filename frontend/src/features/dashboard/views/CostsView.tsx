import { useEffect, useMemo, useState } from 'react';

import type { CostsViewProps } from '../types';

import { serviceOperationPresets } from '../constants';
import { formatMoney, matchesSearch, openWhatsAppMessage } from '../helpers';
import { styles } from '../styles';
import { Field } from '../ui';

function formatServiceListMoney(value: number | string): string {
  const roundedValue = Math.round(Number(value));
  const formattedValue = new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    useGrouping: true,
  })
    .format(roundedValue)
    .replace(/\s/g, ' ');

  return `$ ${formattedValue}`;
}

function buildServicesWhatsAppMessage(costItems: CostsViewProps['costItems']): string {
  const updatedAt = new Intl.DateTimeFormat('es-AR').format(new Date());
  const serviceLines = costItems.map((item) => `- ${item.name}: ${formatServiceListMoney(item.unit_cost)}`);

  return [
    `Hola, te comparto la lista de servicios actualizada al ${updatedAt}:`,
    '',
    ...serviceLines,
    '',
    'Los precios pueden variar segun el alcance del trabajo.',
  ].join('\n');
}

export function CostsView({
  costItems,
  editingCostId,
  form,
  isCompactLayout,
  isSaving,
  onCancel,
  onDelete,
  onEdit,
  onFormChange,
  onSubmit,
  showOperationPresets,
}: CostsViewProps) {
  const [search, setSearch] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const filteredCostItems = costItems.filter((item) => matchesSearch([item.name, item.description], search));
  const selectedCostItems = useMemo(
    () => costItems.filter((item) => selectedServiceIds.includes(item.id)),
    [costItems, selectedServiceIds],
  );
  const canShareServices = selectedCostItems.length > 0;
  const allServicesSelected = costItems.length > 0 && selectedServiceIds.length === costItems.length;

  useEffect(() => {
    setSelectedServiceIds((currentSelection) => {
      const availableIds = costItems.map((item) => item.id);
      const keptIds = currentSelection.filter((id) => availableIds.includes(id));
      const newIds = availableIds.filter((id) => !currentSelection.includes(id));
      return [...keptIds, ...newIds];
    });
  }, [costItems]);

  const toggleServiceSelection = (serviceId: string) => {
    setSelectedServiceIds((currentSelection) =>
      currentSelection.includes(serviceId)
        ? currentSelection.filter((id) => id !== serviceId)
        : [...currentSelection, serviceId],
    );
  };

  const toggleAllServices = () => {
    setSelectedServiceIds(allServicesSelected ? [] : costItems.map((item) => item.id));
  };

  return (
    <section style={styles.workspaceGrid}>
      <form onSubmit={onSubmit} style={styles.formPanel}>
        <div>
          <h2 style={styles.panelTitle}>{editingCostId ? 'Editar servicio' : 'Nuevo servicio'}</h2>
          <p style={styles.panelSubtitle}>Catalogo de operaciones que se cobran en cada presupuesto.</p>
        </div>
        {showOperationPresets ? (
          <div style={styles.presetGrid} aria-label="Operaciones frecuentes">
            {serviceOperationPresets.map((operation) => (
              <button
                key={operation}
                onClick={() => onFormChange({ ...form, category: 'services', name: operation })}
                style={form.name === operation ? styles.filterChipActive : styles.filterChip}
                type="button"
              >
                {operation}
              </button>
            ))}
          </div>
        ) : null}
        <Field label="Operacion" required value={form.name} onChange={(name) => onFormChange({ ...form, category: 'services', name })} />
        <Field
          label="Importe"
          min="0"
          required
          step="0.01"
          type="number"
          value={form.unit_cost}
          onChange={(unit_cost) => onFormChange({ ...form, unit_cost })}
        />
        <Field
          label="IVA item"
          max="100"
          min="0"
          placeholder="Vacio usa IVA general"
          step="0.01"
          type="number"
          value={form.tax_rate}
          onChange={(tax_rate) => onFormChange({ ...form, tax_rate })}
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
            {editingCostId ? 'Guardar cambios' : 'Crear servicio'}
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
            Catalogo de servicios
          </h2>
          <button
            disabled={!canShareServices}
            onClick={() => openWhatsAppMessage('', buildServicesWhatsAppMessage(selectedCostItems))}
            style={canShareServices ? styles.primaryButton : styles.secondaryButton}
            type="button"
          >
            Enviar seleccionados por WhatsApp
          </button>
        </div>
        <div style={styles.filterBar}>
          <label style={styles.compactLabel}>
            Buscar
            <input
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Instalación, mantenimiento o desinstalación"
              style={styles.searchInput}
              value={search}
            />
          </label>
          <button onClick={toggleAllServices} style={styles.secondaryButton} type="button">
            {allServicesSelected ? 'Desmarcar todos' : 'Marcar todos'}
          </button>
        </div>
        {costItems.length === 0 ? (
          <p style={styles.emptyState}>Todavia no hay servicios cargados.</p>
        ) : filteredCostItems.length === 0 ? (
          <p style={styles.emptyState}>No hay servicios para esa busqueda.</p>
        ) : isCompactLayout ? (
          <div style={styles.costCatalogList}>
            {filteredCostItems.map((item) => (
              <article key={item.id} style={styles.costCatalogCard}>
                <div style={styles.costCatalogCardHeader}>
                  <div style={styles.costCatalogCardTitle}>
                    <strong>{item.name}</strong>
                    {item.description ? <span style={styles.mutedText}>{item.description}</span> : null}
                  </div>
                  <label style={styles.costCatalogCardActions}>
                    <input
                      aria-label={`Incluir ${item.name} en WhatsApp`}
                      checked={selectedServiceIds.includes(item.id)}
                      onChange={() => toggleServiceSelection(item.id)}
                      style={styles.checkbox}
                      type="checkbox"
                    />
                    <span style={styles.mutedText}>WhatsApp</span>
                  </label>
                </div>
                <div style={styles.costCatalogCardFacts}>
                  <div style={styles.costCatalogFact}>
                    <span style={styles.costCatalogFactLabel}>Importe</span>
                    <strong>{formatMoney(item.unit_cost)}</strong>
                  </div>
                  <div style={styles.costCatalogFact}>
                    <span style={styles.costCatalogFactLabel}>IVA</span>
                    <strong>{item.tax_rate ? `${item.tax_rate}%` : `${item.effective_tax_rate}% general`}</strong>
                  </div>
                </div>
                <div style={styles.costCatalogCardActions}>
                  <button onClick={() => onEdit(item)} style={styles.linkButton} type="button">
                    Editar
                  </button>
                  <button onClick={() => onDelete(item)} style={styles.dangerButton} type="button">
                    Desactivar
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Enviar</th>
                <th style={styles.th}>Operacion</th>
                <th style={styles.thRight}>Costo</th>
                <th style={styles.thRight}>IVA</th>
                <th style={styles.thRight}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredCostItems.map((item) => (
                <tr key={item.id}>
                  <td style={styles.td}>
                    <input
                      aria-label={`Incluir ${item.name} en WhatsApp`}
                      checked={selectedServiceIds.includes(item.id)}
                      onChange={() => toggleServiceSelection(item.id)}
                      style={styles.checkbox}
                      type="checkbox"
                    />
                  </td>
                  <td style={styles.td}>{item.name}</td>
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
