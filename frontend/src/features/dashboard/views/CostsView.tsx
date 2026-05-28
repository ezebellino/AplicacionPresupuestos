import { useState } from 'react';

import type { CostsViewProps } from '../types';

import { serviceOperationPresets } from '../constants';
import { formatMoney, matchesSearch } from '../helpers';
import { styles } from '../styles';
import { Field } from '../ui';

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
  const filteredCostItems = costItems.filter((item) => matchesSearch([item.name, item.description], search));

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
                <th style={styles.th}>Operacion</th>
                <th style={styles.thRight}>Costo</th>
                <th style={styles.thRight}>IVA</th>
                <th style={styles.thRight}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredCostItems.map((item) => (
                <tr key={item.id}>
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
