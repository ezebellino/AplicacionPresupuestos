import { useEffect, useState } from 'react';
import { Clock3, History, Mail, MessageCircle, Pencil, Search, Trash2, UserRound } from 'lucide-react';
import Swal from 'sweetalert2';

import { formatDate, formatMoney, formatMonthsCovered, daysUntilDate } from '../helpers';
import { styles } from '../styles';
import type { MembershipFilter, PlatformAdminViewProps, PlatformSection } from '../types';

function formatAuditLabel(key: string) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatAuditValue(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return 'Sin dato';
  }

  if (typeof value === 'boolean') {
    return value ? 'Si' : 'No';
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'string') {
    return value;
  }

  return JSON.stringify(value);
}

export function PlatformAdminView({
  activeSection,
  auditEvents,
  changeRequests,
  isCompactLayout,
  isSaving,
  memberships,
  onChangeSection,
  onApproveFiscalChange,
  onApproveSignup,
  onMarkMembershipPaid,
  onUpdateMembershipPayment,
  onCancelMembershipPayment,
  onMarkSignupContacted,
  onRejectFiscalChange,
  onRejectSignup,
  onSendMembershipQuoteByEmail,
  onSendMembershipQuoteByWhatsApp,
  signupRequests,
}: PlatformAdminViewProps) {
  const pendingSignupRequests = signupRequests.filter((request) => request.status === 'pending');
  const historicalSignupRequests = signupRequests.filter((request) => request.status !== 'pending');
  const pendingChangeRequests = changeRequests.filter((request) => request.status === 'pending');
  const historicalChangeRequests = changeRequests.filter((request) => request.status !== 'pending');
  const dueSoonMemberships = memberships.filter((membership) => {
    if (!membership.membership_due_date) {
      return false;
    }

    const days = daysUntilDate(membership.membership_due_date);
    return days >= 0 && days <= 3;
  });
  const expiredMemberships = memberships.filter((membership) => {
    if (!membership.membership_due_date) {
      return membership.membership_status === 'expired';
    }

    return daysUntilDate(membership.membership_due_date) < 0;
  });
  const activeMemberships = memberships.filter((membership) => membership.membership_status === 'active');
  const amountDueThisMonth = [...expiredMemberships, ...dueSoonMemberships].reduce(
    (total, membership) => total + Number(membership.membership_monthly_fee ?? 0),
    0,
  );
  const [signupViewMode, setSignupViewMode] = useState<'pending' | 'history'>('pending');
  const [changeViewMode, setChangeViewMode] = useState<'pending' | 'history'>('pending');
  const [membershipFilter, setMembershipFilter] = useState<MembershipFilter>('all');
  const [membershipViewMode, setMembershipViewMode] = useState<'pending' | 'history'>('pending');
  const [auditEntityFilter, setAuditEntityFilter] = useState('all');
  const [auditActionFilter, setAuditActionFilter] = useState('all');
  const [auditActorFilter, setAuditActorFilter] = useState('');
  const membershipCounts = {
    active: activeMemberships.filter((membership) => {
      if (!membership.membership_due_date) {
        return membership.membership_status === 'active';
      }

      return membership.membership_status === 'active' && daysUntilDate(membership.membership_due_date) > 3;
    }).length,
    dueSoon: dueSoonMemberships.length,
    expired: expiredMemberships.length,
  };
  const filteredMemberships = memberships.filter((membership) => {
    const days = membership.membership_due_date ? daysUntilDate(membership.membership_due_date) : null;

    if (membershipFilter === 'expired') {
      return days !== null ? days < 0 : membership.membership_status === 'expired';
    }

    if (membershipFilter === 'due_soon') {
      return days !== null && days >= 0 && days <= 3;
    }

    if (membershipFilter === 'active') {
      return membership.membership_status === 'active' && (days === null || days > 3);
    }

    return true;
  });
  const membershipPaymentHistory = memberships
    .flatMap((membership) =>
      membership.payments.map((payment) => ({
        membership,
        payment,
      })),
    )
    .sort((left, right) => right.payment.paid_at.localeCompare(left.payment.paid_at));
  const platformSections: Array<{ id: PlatformSection; label: string }> = [
    { id: 'overview', label: 'Resumen' },
    { id: 'signups', label: `Solicitudes (${pendingSignupRequests.length})` },
    { id: 'changes', label: `Cambios fiscales (${pendingChangeRequests.length})` },
    { id: 'memberships', label: `Membresias (${expiredMemberships.length + dueSoonMemberships.length})` },
    { id: 'audit', label: 'Auditoria' },
  ];
  const auditEntityOptions = Array.from(new Set(auditEvents.map((event) => event.entity_type))).sort();
  const auditActionOptions = Array.from(new Set(auditEvents.map((event) => event.action))).sort();
  const filteredAuditEvents = auditEvents.filter((event) => {
    const matchesEntity = auditEntityFilter === 'all' || event.entity_type === auditEntityFilter;
    const matchesAction = auditActionFilter === 'all' || event.action === auditActionFilter;
    const matchesActor =
      auditActorFilter.trim() === '' ||
      (event.actor_email ?? '').toLowerCase().includes(auditActorFilter.trim().toLowerCase());

    return matchesEntity && matchesAction && matchesActor;
  });
  const auditEntityCounts = auditEvents.reduce<Record<string, number>>((counts, event) => {
    counts[event.entity_type] = (counts[event.entity_type] ?? 0) + 1;
    return counts;
  }, {});
  const auditActorCounts = auditEvents.reduce<Record<string, number>>((counts, event) => {
    const actorKey = event.actor_email ?? 'sistema';
    counts[actorKey] = (counts[actorKey] ?? 0) + 1;
    return counts;
  }, {});
  const topAuditActor =
    Object.entries(auditActorCounts).sort((left, right) => right[1] - left[1])[0]?.[0] ?? 'Sin actor';
  const latestAuditEvent = auditEvents[0] ?? null;

  useEffect(() => {
    if (activeSection === 'signups') {
      setSignupViewMode('pending');
    }

    if (activeSection === 'changes') {
      setChangeViewMode('pending');
    }

    if (activeSection === 'memberships') {
      setMembershipViewMode('pending');
    }
  }, [activeSection]);

  return (
    <>
      <section style={styles.platformWorkspace}>
        <header style={styles.platformWorkspaceHeader}>
          <div>
            <h2 style={styles.panelTitle}>Centro de plataforma</h2>
            <p style={styles.panelSubtitle}>Operacion primero, historico como acceso secundario.</p>
          </div>
          {isCompactLayout ? (
            <label style={{ ...styles.label, ...styles.platformSelectField }}>
              <span>Seccion de plataforma</span>
              <select
                aria-label="Seccion de plataforma"
                onChange={(event) => onChangeSection(event.target.value as PlatformSection)}
                style={styles.input}
                value={activeSection}
              >
                {platformSections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div style={styles.platformSectionNav} role="tablist" aria-label="Navegacion de plataforma">
              {platformSections.map((section) => (
                <button
                  key={section.id}
                  aria-pressed={activeSection === section.id}
                  onClick={() => onChangeSection(section.id)}
                  style={activeSection === section.id ? styles.platformSectionButtonActive : styles.platformSectionButton}
                  type="button"
                >
                  {section.label}
                </button>
              ))}
            </div>
          )}
        </header>

        {activeSection === 'overview' ? (
          <>
            <section style={styles.metrics} aria-label="Estado de plataforma">
              <article style={styles.metricCard}>
                <p style={styles.metricLabel}>Solicitudes pendientes</p>
                <strong style={styles.metricValue}>{pendingSignupRequests.length}</strong>
              </article>
              <article style={styles.metricCard}>
                <p style={styles.metricLabel}>Cambios fiscales pendientes</p>
                <strong style={styles.metricValue}>{pendingChangeRequests.length}</strong>
              </article>
              <article style={styles.metricCard}>
                <p style={styles.metricLabel}>Membresias activas</p>
                <strong style={styles.metricValue}>{activeMemberships.length}</strong>
              </article>
              <article style={styles.metricCard}>
                <p style={styles.metricLabel}>Membresias vencidas</p>
                <strong style={styles.metricValue}>{expiredMemberships.length}</strong>
              </article>
              <article style={styles.metricCard}>
                <p style={styles.metricLabel}>Vencen en 3 dias</p>
                <strong style={styles.metricValue}>{dueSoonMemberships.length}</strong>
              </article>
              <article style={styles.metricCard}>
                <p style={styles.metricLabel}>A cobrar este mes</p>
                <strong style={styles.metricValue}>{formatMoney(amountDueThisMonth)}</strong>
              </article>
            </section>

            <section style={styles.tablePanel}>
              <div style={styles.panelHeader}>
                <div>
                  <h2 style={styles.panelTitle}>Resumen de plataforma</h2>
                  <p style={styles.panelSubtitle}>Pendientes reales, proximos vencimientos y caja operativa.</p>
                </div>
              </div>
              <div style={styles.treasuryOverviewStrip}>
                <span style={styles.clientMetaPill}>{pendingSignupRequests.length} solicitudes</span>
                <span style={styles.clientMetaPill}>{pendingChangeRequests.length} cambios fiscales</span>
                <span style={styles.clientMetaPill}>{expiredMemberships.length} membresias vencidas</span>
              </div>
              <div style={styles.platformImmediateList}>
                <div style={styles.platformImmediatePanel}>
                  <h3 style={styles.platformImmediateTitle}>Cola operativa</h3>
                  {pendingSignupRequests.length > 0 ? (
                    <button onClick={() => onChangeSection('signups')} style={styles.platformImmediateItem} type="button">
                      <strong>{pendingSignupRequests[0].company_name}</strong>
                      <span style={styles.mutedText}>Nueva solicitud pendiente de revision.</span>
                    </button>
                  ) : null}
                  {pendingChangeRequests.length > 0 ? (
                    <button onClick={() => onChangeSection('changes')} style={styles.platformImmediateItem} type="button">
                      <strong>{pendingChangeRequests[0].current_name ?? 'Cambio fiscal pendiente'}</strong>
                      <span style={styles.mutedText}>Hay cambios fiscales esperando aprobacion.</span>
                    </button>
                  ) : null}
                  {pendingSignupRequests.length === 0 && pendingChangeRequests.length === 0 ? (
                    <p style={styles.compactEmpty}>No hay solicitudes ni cambios fiscales pendientes.</p>
                  ) : null}
                </div>
                <div style={styles.platformImmediatePanel}>
                  <h3 style={styles.platformImmediateTitle}>Membresias en riesgo</h3>
                  {expiredMemberships.slice(0, 2).map((membership) => (
                    <button
                      key={`expired-${membership.id}`}
                      onClick={() => {
                        setMembershipFilter('expired');
                        onChangeSection('memberships');
                      }}
                      style={styles.platformImmediateItem}
                      type="button"
                    >
                      <strong>{membership.name}</strong>
                      <span style={styles.mutedText}>Membresia vencida. Requiere registro de pago.</span>
                    </button>
                  ))}
                  {dueSoonMemberships.slice(0, 2).map((membership) => (
                    <button
                      key={`due-soon-${membership.id}`}
                      onClick={() => {
                        setMembershipFilter('due_soon');
                        onChangeSection('memberships');
                      }}
                      style={styles.platformImmediateItem}
                      type="button"
                    >
                      <strong>{membership.name}</strong>
                      <span style={styles.mutedText}>
                        Vence el {membership.membership_due_date ? formatDate(membership.membership_due_date) : 'sin fecha'}.
                      </span>
                    </button>
                  ))}
                  {expiredMemberships.length === 0 && dueSoonMemberships.length === 0 ? (
                    <p style={styles.emptyState}>No hay pendientes operativos inmediatos.</p>
                  ) : null}
                </div>
              </div>
            </section>
          </>
        ) : null}

        {activeSection === 'signups' ? (
          <section style={styles.tablePanel}>
            <div style={styles.panelHeader}>
              <div>
                <h2 style={styles.panelTitle}>Solicitudes de alta</h2>
                <p style={styles.panelSubtitle}>Solo pendientes en la vista principal. Las resueltas quedan fuera del flujo diario.</p>
              </div>
            </div>
            <div style={styles.platformFilterBar}>
              <button
                aria-pressed={signupViewMode === 'pending'}
                onClick={() => setSignupViewMode('pending')}
                style={signupViewMode === 'pending' ? styles.platformFilterButtonActive : styles.platformFilterButton}
                title="Pendientes"
                type="button"
              >
                <span style={styles.buttonWithIcon}>
                  <Clock3 aria-hidden="true" size={14} strokeWidth={2.2} />
                  <span>Pendientes</span>
                </span>
              </button>
              <button
                aria-pressed={signupViewMode === 'history'}
                onClick={() => setSignupViewMode('history')}
                style={signupViewMode === 'history' ? styles.platformFilterButtonActive : styles.platformFilterButton}
                title="Historial"
                type="button"
              >
                <span style={styles.buttonWithIcon}>
                  <History aria-hidden="true" size={14} strokeWidth={2.2} />
                  <span>Historial</span>
                </span>
              </button>
            </div>
            {signupViewMode === 'pending' && pendingSignupRequests.length === 0 ? (
              <p style={styles.emptyState}>No hay solicitudes de alta pendientes.</p>
            ) : null}
            {signupViewMode === 'history' && historicalSignupRequests.length === 0 ? (
              <p style={styles.emptyState}>Todavia no hay historial de solicitudes resueltas.</p>
            ) : null}
            {signupViewMode === 'pending' ? (
              <div style={styles.clientList}>
                {pendingSignupRequests.map((request) => (
                  <article key={request.id} style={styles.platformSignupCard}>
                    <div style={styles.historyRecordHeader}>
                      <div style={styles.clientIdentity}>
                        <strong>{request.company_name}</strong>
                        <div style={styles.platformSignupFacts}>
                          <span style={styles.clientMetaPill}>{request.contact_name}</span>
                          <span style={styles.clientMetaPill}>{request.email}</span>
                          <span style={styles.clientMetaPill}>{request.phone}</span>
                          {request.business_type ? <span style={styles.clientMetaPill}>{request.business_type}</span> : null}
                        </div>
                      </div>
                      <span style={styles.categoryBadge}>{request.status}</span>
                    </div>
                    {request.message ? <p style={styles.serviceDescription}>{request.message}</p> : <p style={styles.compactEmpty}>Sin mensaje adicional.</p>}
                    {request.created_admin_email ? (
                      <p style={styles.serviceDescription}>Cuenta creada: {request.created_admin_email}</p>
                    ) : null}
                    <div style={styles.platformSignupActions}>
                      <button
                        disabled={isSaving || request.status !== 'pending'}
                        onClick={async () => {
                          const result = await Swal.fire({
                            title: 'Crear cuenta',
                            text: `Defini una contrasena temporal para ${request.email}.`,
                            input: 'text',
                            inputAttributes: {
                              autocomplete: 'new-password',
                            },
                            inputPlaceholder: 'Contrasena temporal',
                            showCancelButton: true,
                            confirmButtonText: 'Crear cuenta',
                            cancelButtonText: 'Cancelar',
                            inputValidator: (value) =>
                              value && value.length >= 8 ? null : 'La contrasena debe tener al menos 8 caracteres.',
                          });

                          if (result.isConfirmed && typeof result.value === 'string') {
                            onApproveSignup(request, result.value);
                          }
                        }}
                        style={styles.primaryButton}
                        title="Crear cuenta"
                        type="button"
                      >
                        <span style={styles.buttonWithIcon}>
                          <UserRound aria-hidden="true" size={14} strokeWidth={2.2} />
                          <span>Crear cuenta</span>
                        </span>
                      </button>
                      <button
                        disabled={isSaving || request.status !== 'pending'}
                        onClick={() => onMarkSignupContacted(request)}
                        style={styles.secondaryButton}
                        title="Marcar como contactada"
                        type="button"
                      >
                        <span style={styles.buttonWithIcon}>
                          <Clock3 aria-hidden="true" size={14} strokeWidth={2.2} />
                          <span>Contactada</span>
                        </span>
                      </button>
                      <button
                        disabled={isSaving || request.status !== 'pending'}
                        onClick={() => onRejectSignup(request)}
                        style={styles.dangerOutlineButton}
                        title="Rechazar"
                        type="button"
                      >
                        <span style={styles.buttonWithIcon}>
                          <span aria-hidden="true">X</span>
                          <span>Rechazar</span>
                        </span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
            {signupViewMode === 'history' ? (
              <div style={styles.clientList}>
                {historicalSignupRequests.map((request) => (
                  <article key={request.id} style={styles.platformSignupCard}>
                    <div style={styles.historyRecordHeader}>
                      <div style={styles.clientIdentity}>
                        <strong>{request.company_name}</strong>
                        <div style={styles.platformSignupFacts}>
                          <span style={styles.clientMetaPill}>{request.contact_name}</span>
                          <span style={styles.clientMetaPill}>{request.email}</span>
                          <span style={styles.clientMetaPill}>{request.phone}</span>
                          {request.business_type ? <span style={styles.clientMetaPill}>{request.business_type}</span> : null}
                        </div>
                      </div>
                      <span style={styles.categoryBadge}>{request.status}</span>
                    </div>
                    {request.message ? <p style={styles.serviceDescription}>{request.message}</p> : <p style={styles.compactEmpty}>Sin mensaje adicional.</p>}
                    {request.created_admin_email ? (
                      <p style={styles.serviceDescription}>Cuenta creada: {request.created_admin_email}</p>
                    ) : null}
                    {request.review_notes ? <p style={styles.serviceDescription}>Nota: {request.review_notes}</p> : null}
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {activeSection === 'changes' ? (
          <section style={styles.tablePanel}>
            <div style={styles.panelHeader}>
              <div>
                <h2 style={styles.panelTitle}>Cambios fiscales</h2>
                <p style={styles.panelSubtitle}>Solo pendientes en la vista principal. El historico se deja fuera del trabajo del dia.</p>
              </div>
            </div>
            <div style={styles.platformFilterBar}>
              <button
                aria-pressed={changeViewMode === 'pending'}
                onClick={() => setChangeViewMode('pending')}
                style={changeViewMode === 'pending' ? styles.platformFilterButtonActive : styles.platformFilterButton}
                title="Pendientes"
                type="button"
              >
                <span style={styles.buttonWithIcon}>
                  <Clock3 aria-hidden="true" size={14} strokeWidth={2.2} />
                  <span>Pendientes</span>
                </span>
              </button>
              <button
                aria-pressed={changeViewMode === 'history'}
                onClick={() => setChangeViewMode('history')}
                style={changeViewMode === 'history' ? styles.platformFilterButtonActive : styles.platformFilterButton}
                title="Historial"
                type="button"
              >
                <span style={styles.buttonWithIcon}>
                  <History aria-hidden="true" size={14} strokeWidth={2.2} />
                  <span>Historial</span>
                </span>
              </button>
            </div>
            {changeViewMode === 'pending' && pendingChangeRequests.length === 0 ? (
              <p style={styles.emptyState}>No hay cambios fiscales pendientes.</p>
            ) : null}
            {changeViewMode === 'history' && historicalChangeRequests.length === 0 ? (
              <p style={styles.emptyState}>Todavia no hay historial de cambios fiscales.</p>
            ) : null}
            {changeViewMode === 'pending' ? (
              <div style={styles.clientList}>
                {pendingChangeRequests.map((request) => (
                  <article key={request.id} style={styles.platformFiscalCard}>
                    <div style={styles.historyRecordHeader}>
                      <div style={styles.clientIdentity}>
                        <strong>{request.current_name}</strong>
                        <div style={styles.platformSignupFacts}>
                          {[
                            request.proposed_name ? `Empresa: ${request.proposed_name}` : null,
                            request.proposed_legal_name ? `Razon social: ${request.proposed_legal_name}` : null,
                            request.proposed_tax_id ? `CUIT: ${request.proposed_tax_id}` : null,
                          ]
                            .filter(Boolean)
                            .map((item) => (
                              <span key={item} style={styles.clientMetaPill}>
                                {item}
                              </span>
                            ))}
                        </div>
                      </div>
                      <span style={styles.categoryBadge}>{request.status}</span>
                    </div>
                    {request.reason ? <p style={styles.serviceDescription}>{request.reason}</p> : <p style={styles.compactEmpty}>Sin motivo adicional.</p>}
                    <div style={styles.platformSignupActions}>
                      <button
                        disabled={isSaving || request.status !== 'pending'}
                        onClick={() => onApproveFiscalChange(request)}
                        style={styles.primaryButton}
                        title="Aprobar"
                        type="button"
                      >
                        <span style={styles.buttonWithIcon}>
                          <span aria-hidden="true">OK</span>
                          <span>Aprobar</span>
                        </span>
                      </button>
                      <button
                        disabled={isSaving || request.status !== 'pending'}
                        onClick={() => onRejectFiscalChange(request)}
                        style={styles.dangerOutlineButton}
                        title="Rechazar"
                        type="button"
                      >
                        <span style={styles.buttonWithIcon}>
                          <span aria-hidden="true">X</span>
                          <span>Rechazar</span>
                        </span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
            {changeViewMode === 'history' ? (
              <div style={styles.clientList}>
                {historicalChangeRequests.map((request) => (
                  <article key={request.id} style={styles.platformFiscalCard}>
                    <div style={styles.historyRecordHeader}>
                      <div style={styles.clientIdentity}>
                        <strong>{request.current_name}</strong>
                        <div style={styles.platformSignupFacts}>
                          {[
                            request.proposed_name ? `Empresa: ${request.proposed_name}` : null,
                            request.proposed_legal_name ? `Razon social: ${request.proposed_legal_name}` : null,
                            request.proposed_tax_id ? `CUIT: ${request.proposed_tax_id}` : null,
                          ]
                            .filter(Boolean)
                            .map((item) => (
                              <span key={item} style={styles.clientMetaPill}>
                                {item}
                              </span>
                            ))}
                        </div>
                      </div>
                      <span style={styles.categoryBadge}>{request.status}</span>
                    </div>
                    {request.reason ? <p style={styles.serviceDescription}>{request.reason}</p> : <p style={styles.compactEmpty}>Sin motivo adicional.</p>}
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {activeSection === 'memberships' ? (
          <section style={styles.tablePanel}>
            <div style={styles.panelHeader}>
              <div>
                <h2 style={styles.panelTitle}>Membresias SaaS</h2>
                <p style={styles.panelSubtitle}>Vencimiento mensual, filtros rapidos y seguimiento de cobro.</p>
              </div>
            </div>
            <div style={styles.platformFilterStack}>
              <div style={styles.platformFilterBar}>
                <button
                  aria-pressed={membershipViewMode === 'pending'}
                  onClick={() => setMembershipViewMode('pending')}
                  style={membershipViewMode === 'pending' ? styles.platformFilterButtonActive : styles.platformFilterButton}
                  title="Pendientes"
                  type="button"
                >
                  <span style={styles.buttonWithIcon}>
                    <Clock3 aria-hidden="true" size={14} strokeWidth={2.2} />
                    <span>Pendientes</span>
                  </span>
                </button>
                <button
                  aria-pressed={membershipViewMode === 'history'}
                  onClick={() => setMembershipViewMode('history')}
                  style={membershipViewMode === 'history' ? styles.platformFilterButtonActive : styles.platformFilterButton}
                  title="Historial"
                  type="button"
                >
                  <span style={styles.buttonWithIcon}>
                    <History aria-hidden="true" size={14} strokeWidth={2.2} />
                    <span>Historial</span>
                  </span>
                </button>
              </div>
              {membershipViewMode === 'pending' ? (
                <div style={styles.platformFilterBar}>
                  {[
                    { id: 'all' as const, label: 'Todas' },
                    { id: 'expired' as const, label: 'Vencidas' },
                    { id: 'due_soon' as const, label: 'Por vencer' },
                    { id: 'active' as const, label: 'Activas' },
                  ].map((filterOption) => (
                    <button
                      key={filterOption.id}
                      onClick={() => setMembershipFilter(filterOption.id)}
                      style={membershipFilter === filterOption.id ? styles.platformFilterButtonActive : styles.platformFilterButton}
                      type="button"
                    >
                      {filterOption.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            {membershipViewMode === 'pending' && filteredMemberships.length === 0 ? (
              <p style={styles.emptyState}>No hay empresas con ese filtro operativo.</p>
            ) : null}
            {membershipViewMode === 'history' && membershipPaymentHistory.length === 0 ? (
              <p style={styles.emptyState}>Todavia no hay pagos registrados en el historial.</p>
            ) : null}
            {membershipViewMode === 'pending' ? (
              <div style={styles.clientList}>
                {filteredMemberships.map((membership) => (
                  <article key={membership.id} style={styles.platformMembershipCard}>
                    <div style={styles.platformMembershipHeader}>
                      <div style={styles.clientIdentity}>
                        <strong>{membership.name}</strong>
                        <div style={styles.platformMembershipFacts}>
                          <span style={styles.clientMetaPill}>
                            Vence {membership.membership_due_date ? formatDate(membership.membership_due_date) : 'sin fecha'}
                          </span>
                          <span style={styles.clientMetaPill}>
                            Ultimo pago {membership.membership_last_payment_at ? formatDate(membership.membership_last_payment_at) : 'sin registro'}
                          </span>
                          <span style={styles.clientMetaPill}>
                            Cuota actual {membership.membership_monthly_fee ? formatMoney(membership.membership_monthly_fee) : 'Sin monto'}
                          </span>
                        </div>
                      </div>
                      <span
                        style={{
                          ...styles.statusBadge,
                          ...(membership.membership_status === 'active' ? styles.activeMembershipBadge : styles.expiredMembershipBadge),
                        }}
                      >
                        {membership.membership_status === 'active' ? 'Activa' : 'Vencida'}
                      </span>
                    </div>

                    {membership.payments.some((payment) => payment.status === 'active') ? (
                      <section style={styles.platformMembershipPaymentPanel} aria-label={`Pagos activos de ${membership.name}`}>
                        <div style={styles.panelHeaderCompact}>
                          <strong style={styles.compactTitle}>Pagos activos</strong>
                        </div>
                        <div style={styles.membershipPaymentList}>
                          {membership.payments.filter((payment) => payment.status === 'active').slice(0, 4).map((payment) => (
                            <div key={payment.id} style={styles.membershipPaymentCard}>
                              <div style={styles.membershipPaymentSummary}>
                                <span style={styles.membershipPaymentChip}>{formatMonthsCovered(payment.months_covered)}</span>
                                <span style={styles.membershipPaymentChip}>{formatDate(payment.paid_at)}</span>
                                {payment.amount ? <span style={styles.membershipPaymentChip}>{formatMoney(payment.amount)}</span> : null}
                                {payment.quote_number ? <span style={styles.membershipPaymentChip}>{payment.quote_number}</span> : null}
                              </div>
                              {payment.quote_id ? (
                                <div style={styles.membershipPaymentActions}>
                                  <button
                                    aria-label="Enviar por WhatsApp"
                                    onClick={() => onSendMembershipQuoteByWhatsApp(payment)}
                                    style={styles.whatsAppIconButton}
                                    title="Enviar por WhatsApp"
                                    type="button"
                                  >
                                    <MessageCircle aria-hidden="true" size={16} strokeWidth={2.2} />
                                  </button>
                                  <button
                                    onClick={() => onSendMembershipQuoteByEmail(payment)}
                                    style={styles.secondaryButton}
                                    title="Enviar por Email"
                                    type="button"
                                  >
                                    <span style={styles.buttonWithIcon}>
                                      <Mail aria-hidden="true" size={14} strokeWidth={2.2} />
                                      <span>Email</span>
                                    </span>
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </section>
                    ) : (
                      <p style={styles.compactEmpty}>Todavia no hay pagos activos registrados para esta empresa.</p>
                    )}

                    <div style={styles.platformMembershipActions}>
                      <button
                        disabled={isSaving}
                        onClick={async () => {
                      const result = await Swal.fire({
                        title: `Registrar pago de ${membership.name}`,
                        html: `
                        <label style="display:grid;gap:6px;text-align:left;margin-bottom:12px;">
                          <span>Periodo</span>
                          <select id="membership-months" class="swal2-input" style="margin:0;">
                            <option value="1">Mensual</option>
                            <option value="3">Trimestral</option>
                            <option value="6">Semestral</option>
                            <option value="12">Anual</option>
                          </select>
                        </label>
                        <label style="display:grid;gap:6px;text-align:left;margin-bottom:12px;">
                          <span>Monto total</span>
                          <input id="membership-amount" class="swal2-input" style="margin:0;" placeholder="Opcional" />
                        </label>
                        <label style="display:grid;gap:6px;text-align:left;">
                          <span>Nota</span>
                          <input id="membership-notes" class="swal2-input" style="margin:0;" placeholder="Pago trimestral, transferencia, etc." />
                        </label>
                      `,
                      focusConfirm: false,
                      preConfirm: () => {
                        const monthsValue =
                          (document.getElementById('membership-months') as HTMLSelectElement | null)?.value ?? '1';
                        const amountValue =
                          (document.getElementById('membership-amount') as HTMLInputElement | null)?.value.trim() ?? '';
                        const notesValue =
                          (document.getElementById('membership-notes') as HTMLInputElement | null)?.value.trim() ?? '';
                        const monthsCovered = Number(monthsValue);

                        if (![1, 3, 6, 12].includes(monthsCovered)) {
                          Swal.showValidationMessage('Elegi un periodo valido.');
                          return undefined;
                        }

                        if (amountValue && Number.isNaN(Number(amountValue))) {
                          Swal.showValidationMessage('El monto debe ser numerico.');
                          return undefined;
                        }

                        return {
                          amount: amountValue || null,
                          months_covered: monthsCovered,
                          notes: notesValue || null,
                        };
                        },
                        showCancelButton: true,
                        confirmButtonText: 'Registrar pago',
                        cancelButtonText: 'Cancelar',
                      });

                      if (result.isConfirmed && result.value) {
                        onMarkMembershipPaid(membership, result.value);
                      }
                        }}
                        style={styles.primaryButton}
                        title="Registrar pago"
                        type="button"
                      >
                        <span style={styles.buttonWithIcon}>
                          <Clock3 aria-hidden="true" size={14} strokeWidth={2.2} />
                          <span>Registrar pago</span>
                        </span>
                      </button>
                      <span style={styles.platformMembershipMeta}>
                        {membershipFilter === 'all'
                          ? `Activas ${membershipCounts.active} | Por vencer ${membershipCounts.dueSoon} | Vencidas ${membershipCounts.expired}`
                          : membership.membership_due_date
                            ? `Vence ${formatDate(membership.membership_due_date)}`
                            : 'Sin fecha'}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
            {membershipViewMode === 'history' ? (
              <div style={styles.clientList}>
                {membershipPaymentHistory.map(({ membership, payment }) => (
                  <article key={payment.id} style={styles.platformMembershipHistoryCard}>
                    <div style={styles.historyRecordHeader}>
                      <div style={styles.clientIdentity}>
                        <strong>{membership.name}</strong>
                        <div style={styles.platformMembershipFacts}>
                          <span style={styles.clientMetaPill}>{formatDate(payment.paid_at)}</span>
                          <span style={styles.clientMetaPill}>{formatMonthsCovered(payment.months_covered)}</span>
                          <span style={styles.clientMetaPill}>{payment.amount ? formatMoney(payment.amount) : 'Sin monto'}</span>
                        </div>
                      </div>
                      <span
                        style={{
                          ...styles.categoryBadge,
                          ...(payment.status === 'cancelled' ? styles.historyRejectedBadge : styles.historyAcceptedBadge),
                        }}
                      >
                        {payment.status === 'cancelled' ? 'Anulado' : payment.quote_number ?? 'Sin presupuesto'}
                      </span>
                    </div>
                    <div style={styles.platformMembershipHistoryBody}>
                      {payment.notes ? <p style={styles.serviceDescription}>{payment.notes}</p> : null}
                      {payment.cancel_reason ? (
                        <p style={styles.serviceDescription}>Motivo de anulacion: {payment.cancel_reason}</p>
                      ) : null}
                    </div>
                    <div style={styles.membershipPaymentActions}>
                      {payment.status === 'active' ? (
                        <>
                          <button
                            aria-label="Editar pago"
                            disabled={isSaving}
                            onClick={async () => {
                              const result = await Swal.fire({
                                title: `Editar pago de ${membership.name}`,
                                html: `
                                <label style="display:grid;gap:6px;text-align:left;margin-bottom:12px;">
                                  <span>Fecha efectiva</span>
                                  <input id="membership-paid-at" type="date" class="swal2-input" style="margin:0;" value="${payment.paid_at.slice(0, 10)}" />
                                </label>
                                <label style="display:grid;gap:6px;text-align:left;margin-bottom:12px;">
                                  <span>Periodo</span>
                                  <select id="membership-months-edit" class="swal2-input" style="margin:0;">
                                    <option value="1" ${payment.months_covered === 1 ? 'selected' : ''}>Mensual</option>
                                    <option value="3" ${payment.months_covered === 3 ? 'selected' : ''}>Trimestral</option>
                                    <option value="6" ${payment.months_covered === 6 ? 'selected' : ''}>Semestral</option>
                                    <option value="12" ${payment.months_covered === 12 ? 'selected' : ''}>Anual</option>
                                  </select>
                                </label>
                                <label style="display:grid;gap:6px;text-align:left;margin-bottom:12px;">
                                  <span>Monto total</span>
                                  <input id="membership-amount-edit" class="swal2-input" style="margin:0;" value="${payment.amount ?? ''}" />
                                </label>
                                <label style="display:grid;gap:6px;text-align:left;">
                                  <span>Nota</span>
                                  <input id="membership-notes-edit" class="swal2-input" style="margin:0;" value="${payment.notes ?? ''}" />
                                </label>
                              `,
                                focusConfirm: false,
                                showCancelButton: true,
                                confirmButtonText: 'Guardar cambios',
                                cancelButtonText: 'Cancelar',
                                preConfirm: () => {
                                  const paidAtValue =
                                    (document.getElementById('membership-paid-at') as HTMLInputElement | null)?.value ?? '';
                                  const monthsValue =
                                    (document.getElementById('membership-months-edit') as HTMLSelectElement | null)?.value ?? '1';
                                  const amountValue =
                                    (document.getElementById('membership-amount-edit') as HTMLInputElement | null)?.value.trim() ?? '';
                                  const notesValue =
                                    (document.getElementById('membership-notes-edit') as HTMLInputElement | null)?.value.trim() ?? '';
                                  const monthsCovered = Number(monthsValue);

                                  if (!paidAtValue) {
                                    Swal.showValidationMessage('Indica la fecha efectiva del pago.');
                                    return undefined;
                                  }

                                  if (![1, 3, 6, 12].includes(monthsCovered)) {
                                    Swal.showValidationMessage('Elegi un periodo valido.');
                                    return undefined;
                                  }

                                  if (amountValue && Number.isNaN(Number(amountValue))) {
                                    Swal.showValidationMessage('El monto debe ser numerico.');
                                    return undefined;
                                  }

                                  return {
                                    paid_at: paidAtValue,
                                    amount: amountValue || null,
                                    months_covered: monthsCovered,
                                    notes: notesValue || null,
                                  };
                                },
                              });

                              if (result.isConfirmed && result.value) {
                                onUpdateMembershipPayment(membership, payment, result.value);
                              }
                            }}
                            style={styles.iconActionButton}
                            title="Editar pago"
                            type="button"
                          >
                            <Pencil aria-hidden="true" size={15} strokeWidth={2.2} />
                          </button>
                          <button
                            aria-label="Anular pago"
                            disabled={isSaving}
                            onClick={async () => {
                              const result = await Swal.fire({
                                title: `Anular pago de ${membership.name}`,
                                html: `
                                <label style="display:grid;gap:6px;text-align:left;">
                                  <span>Motivo de anulacion</span>
                                  <input id="membership-cancel-reason" class="swal2-input" style="margin:0;" placeholder="Error de carga, pago duplicado, etc." />
                                </label>
                              `,
                                focusConfirm: false,
                                showCancelButton: true,
                                confirmButtonText: 'Anular pago',
                                cancelButtonText: 'Cancelar',
                                confirmButtonColor: '#ef4444',
                                preConfirm: () => {
                                  const reasonValue =
                                    (document.getElementById('membership-cancel-reason') as HTMLInputElement | null)?.value.trim() ?? '';
                                  if (reasonValue.length < 3) {
                                    Swal.showValidationMessage('Indica un motivo valido.');
                                    return undefined;
                                  }

                                  return { reason: reasonValue };
                                },
                              });

                              if (result.isConfirmed && result.value) {
                                onCancelMembershipPayment(membership, payment, result.value);
                              }
                            }}
                            style={styles.iconDangerButton}
                            title="Anular pago"
                            type="button"
                          >
                            <Trash2 aria-hidden="true" size={15} strokeWidth={2.2} />
                          </button>
                        </>
                      ) : null}
                      {payment.status === 'active' && payment.quote_id ? (
                        <>
                          <button
                            aria-label="Enviar por WhatsApp"
                            onClick={() => onSendMembershipQuoteByWhatsApp(payment)}
                            style={styles.whatsAppIconButton}
                            title="Enviar por WhatsApp"
                            type="button"
                          >
                            <MessageCircle aria-hidden="true" size={16} strokeWidth={2.2} />
                          </button>
                          <button
                            onClick={() => onSendMembershipQuoteByEmail(payment)}
                            style={styles.secondaryButton}
                            title="Enviar por Email"
                            type="button"
                          >
                            <span style={styles.buttonWithIcon}>
                              <Mail aria-hidden="true" size={14} strokeWidth={2.2} />
                              <span>Email</span>
                            </span>
                          </button>
                        </>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {activeSection === 'audit' ? (
          <section style={styles.tablePanel}>
            <div style={styles.panelHeader}>
              <div>
                <h2 style={styles.panelTitle}>Auditoria</h2>
                <p style={styles.panelSubtitle}>Registro cronologico de acciones criticas del sistema.</p>
              </div>
            </div>
            <div style={styles.metrics}>
              <article style={styles.metricCard}>
                <p style={styles.metricLabel}>Eventos cargados</p>
                <strong style={styles.metricValue}>{auditEvents.length}</strong>
              </article>
              <article style={styles.metricCard}>
                <p style={styles.metricLabel}>Entidades activas</p>
                <strong style={styles.metricValue}>{Object.keys(auditEntityCounts).length}</strong>
              </article>
              <article style={styles.metricCard}>
                <p style={styles.metricLabel}>Actor mas frecuente</p>
                <strong style={{ ...styles.metricValue, fontSize: '1rem' }}>{topAuditActor}</strong>
              </article>
              <article style={styles.metricCard}>
                <p style={styles.metricLabel}>Ultimo evento</p>
                <strong style={{ ...styles.metricValue, fontSize: '1rem' }}>
                  {latestAuditEvent ? formatDate(latestAuditEvent.created_at) : 'Sin eventos'}
                </strong>
              </article>
            </div>
            <div style={styles.platformFilterBar}>
              <label style={{ ...styles.label, minWidth: isCompactLayout ? '100%' : 180 }}>
                <span>Entidad</span>
                <select
                  value={auditEntityFilter}
                  onChange={(event) => setAuditEntityFilter(event.target.value)}
                  style={styles.input}
                >
                  <option value="all">Todas</option>
                  {auditEntityOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ ...styles.label, minWidth: isCompactLayout ? '100%' : 180 }}>
                <span>Accion</span>
                <select
                  value={auditActionFilter}
                  onChange={(event) => setAuditActionFilter(event.target.value)}
                  style={styles.input}
                >
                  <option value="all">Todas</option>
                  {auditActionOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ ...styles.label, minWidth: isCompactLayout ? '100%' : 260 }}>
                <span>Actor</span>
                <div style={{ ...styles.searchWrap, width: '100%' }}>
                  <Search aria-hidden="true" size={14} strokeWidth={2.2} />
                  <input
                    value={auditActorFilter}
                    onChange={(event) => setAuditActorFilter(event.target.value)}
                    placeholder="Email del actor"
                    style={styles.searchInput}
                  />
                </div>
              </label>
            </div>
            {filteredAuditEvents.length === 0 ? (
              <p style={styles.emptyState}>No hay eventos para los filtros seleccionados.</p>
            ) : (
              <div style={styles.clientList}>
              {filteredAuditEvents.map((event) => (
                  <article key={event.id} style={styles.historyQuoteRecord}>
                    <div style={styles.historyRecordHeader}>
                      <div style={styles.clientIdentity}>
                        <strong>{event.summary}</strong>
                        <div style={styles.platformSignupFacts}>
                          <span style={styles.clientMetaPill}>{event.entity_type}</span>
                          <span style={styles.clientMetaPill}>{event.action}</span>
                          <span style={styles.clientMetaPill}>{event.actor_email ?? 'sistema'}</span>
                          <span style={styles.clientMetaPill}>{formatDate(event.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    {event.metadata_json ? (
                      <div style={styles.auditMetadataGrid}>
                        {Object.entries(event.metadata_json).map(([key, value]) => (
                          <div key={key} style={styles.auditMetadataItem}>
                            <span style={styles.auditMetadataLabel}>{formatAuditLabel(key)}</span>
                            <strong style={styles.auditMetadataValue}>{formatAuditValue(value)}</strong>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={styles.compactEmpty}>Sin metadata adicional.</p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : null}
      </section>
    </>
  );
}


