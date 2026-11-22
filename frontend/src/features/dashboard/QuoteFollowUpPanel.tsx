import { useRef, useState } from 'react';
import Swal from 'sweetalert2';
import { apiClient, type Client, type Quote } from '../../shared/api/client';
import { clientName, formatMoney, openWhatsAppMessage } from './helpers';
import { buildFollowUpMessage, daysSinceIssued, followUpDueAt, followUpPhone, pendingFollowUps } from './quoteFollowUp';
import { styles } from './styles';

type Props = {
  clients: Client[];
  quotes: Quote[];
  now: number;
  isSaving: boolean;
  onSavingChange: (saving: boolean) => void;
  onQuoteUpdated: (quote: Quote) => void;
  onOpenQuote: (id: string) => void;
};

export function QuoteFollowUpPanel({ clients, quotes, now, isSaving, onSavingChange, onQuoteUpdated, onOpenQuote }: Props) {
  const [showAll, setShowAll] = useState(false);
  const [limit, setLimit] = useState(5);
  const [notice, setNotice] = useState('');
  const active = useRef(false);
  const pending = pendingFollowUps(quotes, now);
  const issued = quotes.filter((quote) => quote.status === 'issued')
    .sort((a, b) => followUpDueAt(a) - followUpDueAt(b));
  const visible = showAll ? issued : pending;

  // Lock during confirmation too: repeated taps must not open concurrent operations.
  const run = async (task: () => Promise<void>) => {
    if (active.current || isSaving) return;
    active.current = true;
    onSavingChange(true);
    setNotice('');
    try { await task(); }
    catch {
      setNotice('No se pudo actualizar el seguimiento. Revisá tu conexión y el estado del presupuesto antes de volver a intentarlo.');
    } finally { active.current = false; onSavingChange(false); }
  };

  const confirmResponse = (quote: Quote, response: 'accept' | 'reject') => void run(async () => {
    const accepted = response === 'accept';
    const result = await Swal.fire({
      titleText: accepted ? '¿El cliente aceptó este presupuesto?' : '¿El cliente rechazó este presupuesto?',
      text: `${quote.number} · ${clientName(clients, quote.client_id)} · ${formatMoney(quote.total)}. ${accepted ? 'La aceptación no registra un cobro.' : 'Se registrará como rechazado.'}`,
      icon: 'question', showCancelButton: true, focusCancel: true,
      confirmButtonText: accepted ? 'Sí, marcar aceptado' : 'Sí, marcar rechazado', cancelButtonText: 'Volver',
    });
    if (!result.isConfirmed) return;
    const updated = accepted ? await apiClient.acceptQuote(quote.id) : await apiClient.rejectQuote(quote.id);
    onQuoteUpdated(updated);
    setNotice(`${quote.number}: respuesta registrada.`);
  });

  const snooze = (quote: Quote) => void run(async () => {
    const result = await Swal.fire({
      titleText: '¿Cuándo querés volver a revisarlo?',
      text: `${quote.number} · ${clientName(clients, quote.client_id)}. Se mantiene como emitido.`,
      input: 'select', inputOptions: { '1': 'En 1 día', '3': 'En 3 días', '7': 'En 7 días' }, inputValue: '3',
      showCancelButton: true, confirmButtonText: 'Guardar recordatorio', cancelButtonText: 'Volver',
    });
    const days = Number(result.value);
    if (!result.isConfirmed || (days !== 1 && days !== 3 && days !== 7)) return;
    onQuoteUpdated(await apiClient.snoozeQuoteFollowUp(quote.id, days));
    setNotice(`${quote.number}: te lo recordaremos en ${days} ${days === 1 ? 'día' : 'días'}.`);
  });

  const whatsapp = (quote: Quote) => void run(async () => {
    const client = clients.find((item) => item.id === quote.client_id);
    if (!client) {
      setNotice('No se encontró el cliente. Revisá su ficha antes de contactarlo.');
      return;
    }
    const message = buildFollowUpMessage(client.name, quote);
    const result = await Swal.fire({
      titleText: `Seguimiento de ${quote.number}`,
      text: `Destinatario: ${client.name}\n\n${message}\n\nRevisá el número y completá el envío en WhatsApp. Esto no cambia el estado ni confirma entrega.`,
      input: 'tel', inputLabel: 'Teléfono internacional con + y código de país', inputValue: client.phone ?? '',
      inputPlaceholder: '+54…',
      inputValidator: (value) => followUpPhone(value) ? undefined : 'Ingresá el número completo con + y código de país. No se modificará la ficha del cliente.',
      showCancelButton: true, confirmButtonText: 'Abrir WhatsApp', cancelButtonText: 'Volver',
      // Open in the user gesture to avoid popup blocking after an async API request.
      preConfirm: (value: string) => {
        const phone = followUpPhone(value);
        if (!phone) return false;
        openWhatsAppMessage(phone, message);
        return true;
      },
    });
    if (result.isConfirmed) setNotice('Completá el envío en WhatsApp. Si todavía no respondió, podés posponer el recordatorio.');
  });

  return <section id="quote-follow-ups" data-guide="quote-follow-ups" style={styles.tablePanel} aria-labelledby="follow-up-title">
    <div style={styles.panelHeader}>
      <div>
        <h2 id="follow-up-title" style={styles.panelTitle}>Para dar seguimiento</h2>
        <p style={styles.panelSubtitle}>{pending.length ? `${pending.length} ${pending.length === 1 ? 'presupuesto para revisar' : 'presupuestos para revisar'}.` : 'No tenés recordatorios pendientes.'} El primer aviso aparece 3 días después de emitir.</p>
      </div>
      <button type="button" aria-pressed={showAll} style={styles.secondaryButton} onClick={() => { setShowAll(!showAll); setLimit(5); }}>
        {showAll ? 'Solo pendientes' : `Todos los emitidos (${issued.length})`}
      </button>
    </div>
    {notice ? <p role="status" style={styles.helperText}>{notice}</p> : null}
    {visible.length === 0 ? <p style={styles.emptyState}>{issued.length ? 'Los próximos seguimientos están programados. Podés consultar todos los emitidos para registrar una respuesta antes.' : 'Cuando emitas un presupuesto, aparecerá aquí para registrar la respuesta del cliente.'}</p> : (
      <div style={styles.clientList}>
        {visible.slice(0, limit).map((quote) => {
          const age = daysSinceIssued(quote, now);
          const due = followUpDueAt(quote);
          return <article key={quote.id} style={styles.historyQuoteRecord} aria-label={`Seguimiento ${quote.number}`}>
            <div style={styles.historyRecordHeader}>
              <div><strong>{clientName(clients, quote.client_id)}</strong><p style={styles.panelSubtitle}>{quote.number} · {quote.title || 'Sin título'}</p></div>
              <strong>{formatMoney(quote.total)}</strong>
            </div>
            <p style={styles.mutedText}>{age === null ? 'Fecha de emisión no disponible' : `Emitido hace ${age} ${age === 1 ? 'día' : 'días'}`} · {due <= now ? 'Revisar respuesta' : Number.isFinite(due) ? `Próximo aviso: ${new Date(due).toLocaleDateString('es-AR')}` : 'Fecha de seguimiento no disponible'}</p>
            <p style={styles.compactTitle}>¿El cliente ya respondió este presupuesto?</p>
            <div style={styles.actions}>
              <button type="button" disabled={isSaving} style={styles.primaryButton} onClick={() => confirmResponse(quote, 'accept')}>Aceptó</button>
              <button type="button" disabled={isSaving} style={styles.secondaryButton} onClick={() => confirmResponse(quote, 'reject')}>Rechazó</button>
              <button type="button" disabled={isSaving} style={styles.secondaryButton} onClick={() => snooze(quote)}>Todavía no respondió</button>
            </div>
            <div style={{ ...styles.actions, marginTop: 12 }}>
              <button type="button" disabled={isSaving} style={styles.secondaryButton} onClick={() => snooze(quote)}>Recordármelo después</button>
              <button type="button" disabled={isSaving} style={styles.whatsAppButton} onClick={() => whatsapp(quote)}>Consultar por WhatsApp</button>
              <button type="button" disabled={isSaving} style={styles.secondaryButton} onClick={() => onOpenQuote(quote.id)}>Ver presupuesto</button>
            </div>
          </article>;
        })}
        {visible.length > limit ? <button type="button" style={styles.secondaryButton} onClick={() => setLimit(limit + 5)}>Ver más presupuestos ({visible.length - limit})</button> : null}
      </div>
    )}
  </section>;
}
