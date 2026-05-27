import type { CostCategory, QuoteStatus } from '../../shared/api/client';

export const categoryLabels: Record<CostCategory, string> = {
  equipment: 'Equipos',
  materials: 'Materiales',
  labor: 'Mano de obra',
  services: 'Servicios',
};

export const statusLabels: Record<QuoteStatus, string> = {
  draft: 'Borrador',
  issued: 'Emitido',
  accepted: 'Aceptado',
  rejected: 'Rechazado',
};
