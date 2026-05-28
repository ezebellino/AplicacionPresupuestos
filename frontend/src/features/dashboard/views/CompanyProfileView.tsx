import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import Swal from 'sweetalert2';
import type { TenantChangeRequest } from '../../../shared/api/client';
import type {
  CompanyProfileForm,
  CompanyProfileViewProps,
  CompanySection,
  TenantLegalChangeForm,
} from '../types';
import { formatDate, formatMoney } from '../helpers';
import { styles } from '../styles';
import { Field } from '../ui';

export function CompanyProfileView({
  form,
  isCompactLayout,
  isSaving,
  legalChangeForm,
  mode,
  onFormChange,
  onLegalChangeFormChange,
  onLegalChangeSubmit,
  onSubmit,
  requests,
}: CompanyProfileViewProps) {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [activeSection, setActiveSection] = useState<CompanySection>('data');
  const hasLocalLogo = form.logo_url.startsWith('data:image/');
  const isPlatformProfile = mode === 'platform';
  const profileTitle = isPlatformProfile ? 'Perfil de plataforma' : 'Perfil de empresa';
  const profileSubtitle = isPlatformProfile
    ? 'Datos institucionales de FacturEasy para facturacion, branding y vista previa.'
    : 'Estos datos son opcionales y se usan para presupuestos, facturas e impresiones.';
  const lockedPanelTitle = isPlatformProfile ? 'Datos institucionales' : 'Datos fiscales bloqueados';
  const lockedPanelSubtitle = isPlatformProfile
    ? 'Configura la identidad visible de la plataforma para PDF, facturas y comunicaciones.'
    : 'Nombre, razon social y CUIT solo cambian con solicitud para evitar uso indebido de empresas.';
  const companySections: Array<{ id: CompanySection; label: string }> = [
    { id: 'data', label: 'Datos' },
    { id: 'billing', label: 'Facturacion' },
    { id: 'preview', label: 'Vista previa' },
  ];

  return (
    <section style={styles.companyWorkspace}>
      <div style={styles.companyWorkspaceHeader}>
        <div>
          <h2 style={styles.panelTitle}>{profileTitle}</h2>
          <p style={styles.panelSubtitle}>{profileSubtitle}</p>
        </div>
        {isCompactLayout ? (
          <label style={styles.platformSelectField}>
            <span style={styles.labelCaption}>Seccion de empresa</span>
            <select
              aria-label="Seccion de empresa"
              onChange={(event) => setActiveSection(event.target.value as CompanySection)}
              style={styles.select}
              value={activeSection}
            >
              {companySections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div style={styles.platformSectionNav} role="tablist" aria-label="Navegacion de empresa">
            {companySections.map((section) => (
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

      {activeSection === 'data' ? (
        <section style={styles.profileGrid}>
          <form onSubmit={onSubmit} style={styles.formPanel}>
            <div style={styles.companyLogoCard}>
              <div style={styles.companyLogoPreviewFrame}>
                {form.logo_url ? (
                  <img alt="" src={form.logo_url} style={styles.companyLogoPreviewImage} />
                ) : (
                  <div style={styles.logoPlaceholder}>Logo</div>
                )}
              </div>
              <div style={styles.companyLogoInfo}>
                <strong>Identidad visual</strong>
                <p style={styles.panelSubtitle}>
                  Carga el logo una sola vez y valida al instante como se integra con el perfil y el PDF.
                </p>
                <div style={styles.actions}>
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    style={styles.secondaryButton}
                    type="button"
                  >
                    Subir logo local
                  </button>
                  {form.logo_url ? (
                    <button
                      onClick={() => onFormChange({ ...form, logo_url: '' })}
                      style={styles.linkButton}
                      type="button"
                    >
                      Quitar logo
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
            <label style={styles.label}>
              URL de logo
              <input
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];

                  if (!file) {
                    return;
                  }

                  if (!file.type.startsWith('image/')) {
                    void Swal.fire({
                      title: 'Archivo no valido',
                      text: 'Selecciona un archivo de imagen para usarlo como logo.',
                      icon: 'warning',
                      confirmButtonText: 'Cerrar',
                    });
                    event.target.value = '';
                    return;
                  }

                  const reader = new FileReader();
                  reader.onload = () => {
                    const result = reader.result;
                    if (typeof result === 'string') {
                      onFormChange({ ...form, logo_url: result });
                    }
                  };
                  reader.onerror = () => {
                    void Swal.fire({
                      title: 'No se pudo leer el archivo',
                      text: 'Intenta nuevamente con otra imagen.',
                      icon: 'error',
                      confirmButtonText: 'Cerrar',
                    });
                  };
                  reader.readAsDataURL(file);
                  event.target.value = '';
                }}
                ref={logoInputRef}
                style={{ display: 'none' }}
                type="file"
              />
              <input
                onChange={(event) => onFormChange({ ...form, logo_url: event.target.value })}
                placeholder="https://..."
                style={styles.input}
                value={hasLocalLogo ? '' : form.logo_url}
              />
              <small style={styles.panelSubtitle}>
                {hasLocalLogo
                  ? 'Logo local cargado. Se guardara como imagen embebida.'
                  : 'Tambien puedes pegar una URL publica de imagen.'}
              </small>
            </label>
            <section style={styles.lockedFiscalPanel}>
              <div>
                <strong>{lockedPanelTitle}</strong>
                <p style={styles.panelSubtitle}>{lockedPanelSubtitle}</p>
              </div>
              <div style={styles.lockedFiscalGrid}>
                <span>Empresa: {form.name || 'Sin cargar'}</span>
                <span>Razon social: {form.legal_name || 'Sin cargar'}</span>
                <span>CUIT: {form.tax_id || 'Sin cargar'}</span>
              </div>
            </section>
            <Field
              label="Direccion"
              value={form.address}
              onChange={(address) => onFormChange({ ...form, address })}
            />
            <section style={styles.formGridTwo}>
              <Field label="Telefono" value={form.phone} onChange={(phone) => onFormChange({ ...form, phone })} />
              <Field label="Email" type="email" value={form.email} onChange={(email) => onFormChange({ ...form, email })} />
            </section>
            <Field label="Sitio web" value={form.website} onChange={(website) => onFormChange({ ...form, website })} />
            <button disabled={isSaving} style={styles.primaryButton} type="submit">
              Guardar datos
            </button>
          </form>

          {isPlatformProfile ? null : (
            <form onSubmit={onLegalChangeSubmit} style={styles.formPanel}>
              <div>
                <h2 style={styles.panelTitle}>Solicitar cambio fiscal</h2>
                <p style={styles.panelSubtitle}>
                  La solicitud queda pendiente hasta que un administrador de plataforma la revise.
                </p>
              </div>
              <Field
                label="Nuevo nombre de empresa"
                value={legalChangeForm.proposed_name}
                onChange={(proposedName) => onLegalChangeFormChange({ ...legalChangeForm, proposed_name: proposedName })}
              />
              <Field
                label="Nueva razon social"
                value={legalChangeForm.proposed_legal_name}
                onChange={(proposedLegalName) =>
                  onLegalChangeFormChange({ ...legalChangeForm, proposed_legal_name: proposedLegalName })
                }
              />
              <Field
                label="Nuevo CUIT"
                value={legalChangeForm.proposed_tax_id}
                onChange={(proposedTaxId) => onLegalChangeFormChange({ ...legalChangeForm, proposed_tax_id: proposedTaxId })}
              />
              <label style={styles.label}>
                Motivo
                <textarea
                  onChange={(event) => onLegalChangeFormChange({ ...legalChangeForm, reason: event.target.value })}
                  rows={3}
                  style={styles.textarea}
                  value={legalChangeForm.reason}
                />
              </label>
              <button disabled={isSaving} style={styles.secondaryButton} type="submit">
                Enviar solicitud
              </button>
              {requests.length > 0 ? (
                <div style={styles.serviceList}>
                  <strong>Solicitudes recientes</strong>
                  {requests.slice(0, 3).map((request) => (
                    <article key={request.id} style={styles.serviceRecord}>
                      <span style={styles.categoryBadge}>{request.status}</span>
                      <span style={styles.mutedText}>
                        {[
                          request.proposed_name ? `Empresa: ${request.proposed_name}` : null,
                          request.proposed_legal_name ? `Razon social: ${request.proposed_legal_name}` : null,
                          request.proposed_tax_id ? `CUIT: ${request.proposed_tax_id}` : null,
                        ]
                          .filter(Boolean)
                          .join(' | ')}
                      </span>
                    </article>
                  ))}
                </div>
              ) : null}
            </form>
          )}
        </section>
      ) : null}

      {activeSection === 'billing' ? (
        <section style={styles.profileGrid}>
          <form onSubmit={onSubmit} style={styles.formPanel}>
            <div>
              <h3 style={styles.panelTitle}>Facturacion</h3>
              <p style={styles.panelSubtitle}>
                Ajusta los datos que afectan la salida del comprobante sin mezclar identidad institucional.
              </p>
            </div>
            <Field
              label="IVA general"
              min="0"
              max="100"
              step="0.01"
              type="number"
              value={form.default_tax_rate}
              onChange={(defaultTaxRate) => onFormChange({ ...form, default_tax_rate: defaultTaxRate })}
            />
            <label style={styles.label}>
              Leyenda para facturas
              <textarea
                onChange={(event) => onFormChange({ ...form, invoice_notes: event.target.value })}
                rows={5}
                style={styles.textarea}
                value={form.invoice_notes}
              />
            </label>
            <button disabled={isSaving} style={styles.primaryButton} type="submit">
              Guardar facturacion
            </button>
          </form>
        </section>
      ) : null}

      {activeSection === 'preview' ? (
        <section style={styles.tablePanel} aria-labelledby="profile-preview-title">
          <div style={styles.panelHeader}>
            <h2 id="profile-preview-title" style={styles.panelTitle}>
              Vista PDF
            </h2>
          </div>
          <div style={styles.pdfPreviewShell}>
            <article style={styles.pdfPreviewPage} aria-label="Vista previa PDF de factura">
              <header style={styles.pdfPreviewHeader}>
                <div>
                  <h3 style={styles.invoiceCompanyName}>{form.legal_name || form.name || 'FacturEasy'}</h3>
                  <p style={styles.pdfPreviewMuted}>{form.tax_id ? `CUIT ${form.tax_id}` : 'CUIT pendiente'}</p>
                  <p style={styles.pdfPreviewMuted}>{form.address || 'Direccion pendiente'}</p>
                  <p style={styles.pdfPreviewMuted}>
                    {[form.phone, form.email].filter(Boolean).join(' - ') || 'Contacto pendiente'}
                  </p>
                </div>
                {form.logo_url ? <img alt="" src={form.logo_url} style={styles.logoPreview} /> : <div style={styles.logoPlaceholder}>Logo</div>}
              </header>
              <section style={styles.pdfPreviewMeta}>
                <div>
                  <strong>Factura electronica</strong>
                  <p style={styles.pdfPreviewMuted}>Presupuesto Q-000001 - {formatDate(new Date().toISOString())}</p>
                </div>
                <div style={styles.pdfPreviewClient}>
                  <span>Cliente</span>
                  <strong>Cliente demo</strong>
                </div>
              </section>
              <table style={styles.pdfPreviewTable}>
                <thead>
                  <tr>
                    <th style={styles.pdfPreviewTh}>Servicio</th>
                    <th style={styles.pdfPreviewThRight}>Cantidad</th>
                    <th style={styles.pdfPreviewThRight}>Unitario</th>
                    <th style={styles.pdfPreviewThRight}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={styles.pdfPreviewTd}>Instalacion</td>
                    <td style={styles.pdfPreviewTdRight}>1</td>
                    <td style={styles.pdfPreviewTdRight}>{formatMoney(85000)}</td>
                    <td style={styles.pdfPreviewTdRight}>{formatMoney(85000)}</td>
                  </tr>
                  <tr>
                    <td style={styles.pdfPreviewTd}>Carga de gas</td>
                    <td style={styles.pdfPreviewTdRight}>1</td>
                    <td style={styles.pdfPreviewTdRight}>{formatMoney(60000)}</td>
                    <td style={styles.pdfPreviewTdRight}>{formatMoney(60000)}</td>
                  </tr>
                </tbody>
              </table>
              <footer style={styles.pdfPreviewTotals}>
                <span>Subtotal {formatMoney(145000)}</span>
                <span>IVA {formatMoney(30450)}</span>
                <strong>Total {formatMoney(175450)}</strong>
              </footer>
              {form.invoice_notes ? <p style={styles.pdfPreviewNotes}>{form.invoice_notes}</p> : null}
            </article>
          </div>
        </section>
      ) : null}
    </section>
  );
}


