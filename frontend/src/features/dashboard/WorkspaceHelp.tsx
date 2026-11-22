import { useEffect, useRef, useState } from 'react';
import { driver } from 'driver.js';
import type { Driver, DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';
import './workspaceExperience.css';
import { styles } from './styles';
import type { View } from './types';

export const userGuide = [
  { title: '1. Preparar empresa y servicios', steps: [
    'En Empresa, completá los datos de contacto y revisá el IVA predeterminado. Guardá los cambios.',
    'En Servicios, cargá el nombre, precio e IVA de cada servicio que ofrecés.',
    'Revisá los importes antes de usarlos en un presupuesto. Los cambios del catálogo no actualizan los ítems ya cargados.',
  ] },
  { title: '2. Cargar y consultar clientes', steps: [
    'Entrá en Clientes y elegí Nuevo cliente. Completá nombre, teléfono y dirección.',
    'Buscá al cliente y abrí su ficha para consultar datos, servicios realizados y presupuestos.',
    'Usá la acción de editar para modificar sus datos y guardá antes de cambiar de cliente.',
  ] },
  { title: '3. Crear y enviar un presupuesto', steps: [
    'En Presupuestos, elegí Nuevo presupuesto. Seleccioná el cliente, completá los datos y creá el borrador.',
    'Agregá los servicios desde el catálogo. Cada selección agrega un ítem y guarda el cambio; revisá cantidades, IVA y total.',
    'Mientras esté en borrador podés quitar ítems. Al emitirlo deja de ser editable.',
    'Elegí Emitir y enviar por WhatsApp o Emitir sin enviar. Verificá el destinatario y completá el envío en WhatsApp; abrir WhatsApp no confirma la entrega. También podés descargar el PDF.',
    'Cuando tengas la respuesta del cliente, marcá el presupuesto emitido como aceptado o rechazado.',
  ] },
  { title: '4. Consultar tesorería y registrar gastos', steps: [
    'Entrá en Tesorería para consultar los indicadores y movimientos disponibles.',
    'Registrá cada gasto con su importe, detalle, categoría y estado; vinculá un cliente cuando corresponda.',
    'Actualizá el estado del gasto cuando se pague. Un presupuesto aceptado no es por sí solo un comprobante de cobro.',
  ] },
  { title: '5. Retomar el trabajo y resolver dudas', steps: [
    'Usá Listado para volver desde un presupuesto. Las búsquedas y filtros se conservan al moverte entre Clientes y Presupuestos durante esta sesión.',
    'Guardá los formularios antes de cerrar o recargar la página. Los datos pendientes no se recuperan después de cerrar sesión.',
    'Si aparece un error al guardar, conservá la pantalla, revisá tu conexión y verificá el listado antes de repetir la operación.',
    'Abrí Ayuda y elegí Ver recorrido de esta pantalla para conocer los controles visibles. Podés cerrarlo en cualquier momento con Escape.',
  ] },
];

const steps: DriveStep[] = [
  { element: '[data-guide="workspace"]', popover: { title: 'Tu espacio de trabajo', description: 'Elegí una sección desde el menú. En el celular tenés accesos rápidos al pie de la pantalla.' } },
  { element: '[data-guide="service-form"]', popover: { title: 'Catálogo de servicios', description: 'Completá nombre, precio e IVA y guardá el servicio. Después estará disponible para agregarlo a un presupuesto.' } },
  { element: '[data-guide="expense-form"]', popover: { title: 'Registrar un gasto', description: 'Indicá importe, detalle, categoría y estado. Guardá el gasto y actualizá su estado cuando lo pagues.' } },
  { element: '[data-guide="company-form"]', popover: { title: 'Datos de tu empresa', description: 'Revisá los datos de contacto e IVA y guardá los cambios. Los cambios fiscales se solicitan en su sección correspondiente.' } },
  { element: '[aria-label="Metricas de tesoreria"]', popover: { title: 'Resumen de tesorería', description: 'Revisá los indicadores y usá las secciones para consultar movimientos o gastos. La aceptación de un presupuesto no acredita un cobro.' } },
  { element: '[data-guide="new-client"]', popover: { title: 'Nuevo cliente', description: 'Empezá con nombre, teléfono y dirección. Después podés completar los demás datos desde la ficha.' } },
  { element: '[data-guide="client-search"]', popover: { title: 'Encontrar un cliente', description: 'Buscá por nombre o contacto y abrí su ficha. Tu búsqueda se conserva durante esta sesión.' } },
  { element: '[data-guide="new-quote"]', popover: { title: 'Crear un presupuesto', description: 'Primero elegí el cliente y creá un borrador. Después agregá servicios y revisá el total.' } },
  { element: '[data-guide="quote-navigation"]', popover: { title: 'Listado y presupuesto', description: 'Alterná entre el listado y el presupuesto abierto. Al volver conservás los filtros.' } },
  { element: '[data-guide="quote-filters"]', popover: { title: 'Buscar y filtrar', description: 'Combiná el nombre del cliente, número o título con el estado que necesitás consultar.' } },
  { element: '[data-guide="quote-form"]', popover: { title: 'Datos del borrador', description: 'Seleccioná un cliente y completá título, vigencia y notas. Crear borrador guarda estos datos; todavía no lo emite ni lo envía.' } },
  { element: '[data-guide="quote-catalog"]', popover: { title: 'Agregar servicios', description: 'Cada clic agrega y guarda un ítem. Revisá el detalle antes de emitir: después ya no se puede editar.' } },
  { element: '[data-guide="quote-total"]', popover: { title: 'Revisar el total', description: 'Comprobá los servicios, impuestos y total. Descargar el PDF o abrir WhatsApp no confirma que el cliente lo recibió.' } },
];

export function WorkspaceHelp({ view, platformAdmin }: { view: View; platformAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const tour = useRef<Driver | null>(null);
  const frame = useRef(0);
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else if (dialog.current?.open) dialog.current.close();
  }, [open]);
  useEffect(() => () => { cancelAnimationFrame(frame.current); tour.current?.destroy(); }, [view]);
  const close = () => { setOpen(false); trigger.current?.focus(); };
  const startTour = () => {
    close();
    frame.current = requestAnimationFrame(() => {
      const visibleSteps = steps.filter((step) => {
        const element = document.querySelector(step.element as string);
        return element && element.getClientRects().length > 0;
      });
      if (visibleSteps.length === 0) { setNotice('Abrí Clientes o Presupuestos para ver su recorrido. El manual está disponible en Ayuda.'); return; }
      tour.current?.destroy();
      tour.current = driver({
        steps: visibleSteps.length > 1 ? visibleSteps.filter((step) => step.element !== '[data-guide="workspace"]') : visibleSteps, animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        showProgress: true, progressText: '{{current}} de {{total}}',
        nextBtnText: 'Siguiente', prevBtnText: 'Anterior', doneBtnText: 'Terminar',
        allowClose: true, overlayClickBehavior: 'close', disableActiveInteraction: true,
        popoverClass: 'factureasy-tour',
        onPopoverRender: (popover) => { popover.closeButton.setAttribute('aria-label', 'Cerrar recorrido'); popover.closeButton.title = 'Cerrar recorrido'; },
        onDestroyed: () => trigger.current?.focus(),
      });
      tour.current.drive();
    });
  };
  return <>
    <div className="workspace-help-toolbar">
      <span style={styles.mutedText}>¿Necesitás una mano?</span>
      <button ref={trigger} type="button" style={styles.secondaryButton} onClick={() => setOpen(true)}>Ayuda</button>
    </div>
    {notice ? <p role="status">{notice}</p> : null}
    <dialog ref={dialog} className="workspace-help-dialog" aria-labelledby="help-title" onCancel={close} onClose={() => setOpen(false)}>
      <div className="workspace-help-heading">
        <h2 id="help-title">Guía de FacturEasy</h2>
        <button type="button" style={styles.secondaryButton} onClick={close} autoFocus>Cerrar ayuda</button>
      </div>
      <p>Elegí una tarea o conocé los controles de la pantalla actual. El recorrido solo explica: no carga datos ni realiza operaciones.</p>
      <button type="button" style={styles.primaryButton} onClick={startTour}>Ver recorrido de esta pantalla</button>
      {platformAdmin && view === 'platform' ? <details open>
        <summary>Administración de plataforma</summary>
        <ol><li>Revisá las solicitudes pendientes y verificá los datos antes de aprobar o rechazar.</li><li>En Membresías, registrá el período y monto del pago. Desde el historial podés corregirlo o anularlo con un motivo.</li><li>Consultá la auditoría para revisar las acciones registradas.</li></ol>
      </details> : null}
      {userGuide.map((topic) => <details key={topic.title}><summary>{topic.title}</summary><ol>{topic.steps.map((step) => <li key={step}>{step}</li>)}</ol></details>)}
      <p>La guía no reemplaza la revisión de importes y destinatarios antes de emitir o enviar.</p>
    </dialog>
  </>;
}
