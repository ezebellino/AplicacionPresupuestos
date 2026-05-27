import type { CSSProperties, InputHTMLAttributes } from 'react';

import type { CostCategory, Quote, QuoteStatus } from '../../shared/api/client';

import { categoryLabels, statusLabels } from './constants';
import { styles } from './styles';

function statusBadgeStyle(status: QuoteStatus): CSSProperties {
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
export function ChartPanel({
  emptyText,
  rows,
  title,
  valueFormatter,
}: {
  emptyText: string;
  rows: Array<{ label: string; value: number; secondary?: string }>;
  title: string;
  valueFormatter: (value: number) => string;
}) {
  const maxValue = Math.max(...rows.map((row) => row.value), 0);

  return (
    <section style={styles.tablePanel} aria-label={title}>
      <div style={styles.panelHeader}>
        <h2 style={styles.panelTitle}>{title}</h2>
      </div>
      {rows.length === 0 ? (
        <p style={styles.emptyState}>{emptyText}</p>
      ) : (
        <div style={styles.chartList}>
          {rows.map((row) => {
            const width = maxValue ? Math.max((row.value / maxValue) * 100, 4) : 0;

            return (
              <div key={row.label} style={styles.chartRow}>
                <div style={styles.chartLabelRow}>
                  <strong>{row.label}</strong>
                  <span>{valueFormatter(row.value)}</span>
                </div>
                {row.secondary ? <p style={styles.chartSecondary}>{row.secondary}</p> : null}
                <div style={styles.chartTrack}>
                  <span style={{ ...styles.chartBar, width: `${width}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
export function DataTable({
  headers,
  isCompactLayout = false,
  rows,
}: {
  headers: string[];
  isCompactLayout?: boolean;
  rows: string[][];
}) {
  if (isCompactLayout) {
    return (
      <div style={styles.mobileDataList}>
        {rows.map((row) => (
          <article key={row.join('-')} style={styles.mobileDataCard}>
            <strong>{row[0]}</strong>
            {row.slice(1).map((cell, index) => (
              <div key={`${headers[index + 1]}-${cell}`} style={styles.mobileDataRow}>
                <span>{headers[index + 1]}</span>
                <b>{cell}</b>
              </div>
            ))}
          </article>
        ))}
      </div>
    );
  }

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

export function StatusBadge({ label, status }: { label?: string; status: QuoteStatus }) {
  return <span style={{ ...styles.statusBadge, ...statusBadgeStyle(status) }}>{label ?? statusLabels[status]}</span>;
}

export function CategoryBadge({ category }: { category: CostCategory }) {
  return <span style={styles.categoryBadge}>{categoryLabels[category]}</span>;
}

export function QuoteProgress({ quote }: { quote: Quote }) {
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

export function Field({
  label,
  onChange,
  value,
  ...inputProps
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'>) {
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
