import type { CSSProperties } from 'react';

import Swal from 'sweetalert2';

import type { Client, ClientPayload, Quote, TenantProfile } from '../../shared/api/client';
import { categoryLabels } from './constants';
import { clientName, formatDate, formatMoney, nullable } from './helpers';
import { styles } from './styles';
import type { ClientForm, CompanyProfileForm, View } from './types';

export function companyProfileToForm(profile: TenantProfile): CompanyProfileForm {
  return {
    name: profile.name,
    legal_name: profile.legal_name ?? '',
    tax_id: profile.tax_id ?? '',
    address: profile.address ?? '',
    phone: profile.phone ?? '',
    email: profile.email ?? '',
    website: profile.website ?? '',
    logo_url: profile.logo_url ?? '',
    invoice_notes: profile.invoice_notes ?? '',
    default_tax_rate: profile.default_tax_rate,
  };
}

export function buildWhatsAppInvoiceMessage({
  clientName: invoiceClientName,
  companyName,
  quote,
}: {
  clientName?: string;
  companyName: string;
  quote: Quote;
}): string {
  const greeting = buenosAiresGreeting();

  return [
    `Hola ${invoiceClientName ?? ''}, ${greeting}.`,
    `Te enviamos adjunta la factura electronica correspondiente al presupuesto ${quote.number} de ${companyName}.`,
    `Total: ${formatMoney(quote.total)}.`,
    'Muchas gracias. Quedamos a disposicion por cualquier consulta.',
  ]
    .filter(Boolean)
    .join(' ');
}

export function buildGreetingByBuenosAiresTime(date = new Date()): string {
  return buenosAiresGreeting(date);
}

export function buildInvoiceHtml(quote: Quote, clients: Client[], profile: TenantProfile | null): string {
  const companyName = profile?.legal_name || profile?.name || 'Empresa';
  const client = clientName(clients, quote.client_id);
  const contactLine = [profile?.phone, profile?.email, profile?.website].filter(Boolean).join(' - ');
  const rows = quote.items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.name)}</td>
          <td>${escapeHtml(categoryLabels[item.category])}</td>
          <td class="right">${escapeHtml(item.quantity)}</td>
          <td class="right">${escapeHtml(formatMoney(item.unit_price))}</td>
          <td class="right">${escapeHtml(formatMoney(item.line_total))}</td>
        </tr>
      `,
    )
    .join('');

  return `
    <!doctype html>
    <html>
      <head>
        <title>Factura ${escapeHtml(quote.number)}</title>
        <style>
          body { color: #17202a; font-family: Arial, sans-serif; margin: 32px; }
          header { align-items: flex-start; border-bottom: 1px solid #d9e0e7; display: flex; justify-content: space-between; padding-bottom: 20px; }
          h1, h2, p { margin: 0; }
          h1 { font-size: 24px; }
          h2 { font-size: 18px; margin-bottom: 8px; }
          .muted { color: #526071; margin-top: 6px; }
          .logo { max-height: 72px; max-width: 180px; object-fit: contain; }
          .section { margin-top: 24px; }
          table { border-collapse: collapse; margin-top: 14px; width: 100%; }
          th { color: #526071; font-size: 12px; text-align: left; text-transform: uppercase; }
          th, td { border-bottom: 1px solid #edf1f5; padding: 10px 8px; }
          .right { text-align: right; }
          .totals { display: grid; gap: 8px; justify-content: end; margin-top: 18px; text-align: right; }
          .notes { background: #f8fafc; border: 1px solid #e5eaf0; border-radius: 6px; padding: 12px; }
        </style>
      </head>
      <body>
        <header>
          <div>
            <h1>${escapeHtml(companyName)}</h1>
            ${profile?.tax_id ? `<p class="muted">CUIT ${escapeHtml(profile.tax_id)}</p>` : ''}
            ${profile?.address ? `<p class="muted">${escapeHtml(profile.address)}</p>` : ''}
            ${contactLine ? `<p class="muted">${escapeHtml(contactLine)}</p>` : ''}
          </div>
          ${profile?.logo_url ? `<img alt="" class="logo" src="${escapeAttribute(profile.logo_url)}" />` : ''}
        </header>
        <section class="section">
          <h2>Factura</h2>
          <p class="muted">Presupuesto ${escapeHtml(quote.number)} - ${escapeHtml(formatDate(quote.issued_at ?? quote.created_at))}</p>
          <p class="muted">Cliente: ${escapeHtml(client)}</p>
        </section>
        <section class="section">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Categoria</th>
                <th class="right">Cantidad</th>
                <th class="right">Unitario</th>
                <th class="right">Total</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="totals">
            <span>Subtotal ${escapeHtml(formatMoney(quote.subtotal))}</span>
            <span>IVA ${escapeHtml(formatMoney(quote.tax_total))}</span>
            <strong>Total ${escapeHtml(formatMoney(quote.total))}</strong>
          </div>
        </section>
        ${
          profile?.invoice_notes
            ? `<section class="section notes">${escapeHtml(profile.invoice_notes)}</section>`
            : ''
        }
      </body>
    </html>
  `;
}

export function compactPayload(form: ClientForm): ClientPayload {
  return {
    name: form.name.trim(),
    document: nullable(form.document),
    email: nullable(form.email),
    phone: nullable(form.phone),
    address: nullable(form.address),
    notes: nullable(form.notes),
  };
}

export function navStyle(isActive: boolean): CSSProperties {
  return isActive ? styles.navActive : styles.navItem;
}

export function showSuccessToast(title: string) {
  try {
    void Swal.fire({
      icon: 'success',
      position: 'top-end',
      showConfirmButton: false,
      timer: 2200,
      timerProgressBar: true,
      title,
      toast: true,
    });
  } catch {
    // SweetAlert2 can throw in headless test environments; runtime UI remains unaffected.
  }
}

export function quoteTransitionSuccessMessage(action: 'issue' | 'accept' | 'reject'): string {
  if (action === 'issue') {
    return 'Presupuesto emitido';
  }

  if (action === 'accept') {
    return 'Presupuesto aceptado';
  }

  return 'Presupuesto rechazado';
}

export function bottomTabIcon(view: View): string {
  const icons: Record<View, string> = {
    clients: 'C',
    company: 'E',
    costs: 'S',
    platform: 'A',
    quotes: 'P',
    summary: 'I',
    treasury: 'T',
  };

  return icons[view];
}

export function themeVariables(isDarkMode: boolean): CSSProperties {
  if (!isDarkMode) {
    return {
      '--accent': '#1d4ed8',
      '--accent-contrast': '#ffffff',
      '--accent-soft': '#eaf1ff',
      '--border': '#d9e0e7',
      '--danger': '#be123c',
      '--danger-bg': '#fff1f2',
      '--input-bg': '#ffffff',
      '--muted': '#526071',
      '--page-bg': '#f4f6f8',
      '--panel-bg': '#ffffff',
      '--panel-subtle': '#f8fafc',
      '--success': '#027a48',
      '--success-bg': '#ecfdf3',
      '--text': '#17202a',
      '--warning': '#b45309',
      '--warning-bg': '#fffbeb',
    } as CSSProperties;
  }

  return {
    '--accent': '#daa520',
    '--accent-contrast': '#09090b',
    '--accent-soft': 'rgba(218, 165, 32, 0.16)',
    '--border': 'rgba(218, 165, 32, 0.28)',
    '--danger': '#fb7185',
    '--danger-bg': 'rgba(244, 63, 94, 0.16)',
    '--input-bg': '#111827',
    '--muted': '#a7b0c0',
    '--page-bg': '#07070c',
    '--panel-bg': '#0e1118',
    '--panel-subtle': '#151a24',
    '--success': '#34d399',
    '--success-bg': 'rgba(52, 211, 153, 0.14)',
    '--text': '#f8fafc',
    '--warning': '#fbbf24',
    '--warning-bg': 'rgba(251, 191, 36, 0.14)',
  } as CSSProperties;
}

function buenosAiresGreeting(date = new Date()): string {
  const timeParts = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).formatToParts(date);
  const hour = Number(timeParts.find((part) => part.type === 'hour')?.value ?? '0');
  const minute = Number(timeParts.find((part) => part.type === 'minute')?.value ?? '0');
  const minutes = hour * 60 + minute;

  if (minutes >= 8 * 60 && minutes < 13 * 60) {
    return 'Buen dia';
  }

  if (minutes >= 13 * 60 && minutes < 19 * 60 + 30) {
    return 'Buenas tardes';
  }

  return 'Buenas noches';
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replaceAll('`', '&#096;');
}
