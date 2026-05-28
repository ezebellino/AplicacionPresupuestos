import type {
  PlatformTenantMembership,
  TenantChangeRequest,
  TenantSignupRequest,
} from '../../shared/api/client';
import { daysUntilDate } from './helpers';
import type { PlatformNotification } from './types';

export function buildPlatformNotifications(
  signupRequests: TenantSignupRequest[],
  changeRequests: TenantChangeRequest[],
  memberships: PlatformTenantMembership[],
  now = new Date(),
): PlatformNotification[] {
  const signupItems = signupRequests
    .filter((request) => request.status === 'pending')
    .map((request) => ({
      id: `signup-${request.id}`,
      kind: 'signup' as const,
      title: request.company_name,
      description: `${request.contact_name} - ${request.phone}`,
      actionLabel: 'Revisar solicitud' as const,
    }));

  const changeItems = changeRequests
    .filter((request) => request.status === 'pending')
    .map((request) => ({
      id: `change-${request.id}`,
      kind: 'change_request' as const,
      title: request.current_name ?? 'Cambio fiscal pendiente',
      description: request.reason ?? 'Pendiente de revision',
      actionLabel: 'Ver cambio' as const,
    }));

  const membershipItems = memberships
    .filter((membership) => {
      if (!membership.membership_due_date) {
        return false;
      }

      return daysUntilDate(membership.membership_due_date, now) <= 3;
    })
    .map((membership) => {
      const days = membership.membership_due_date ? daysUntilDate(membership.membership_due_date, now) : null;

      return {
        id: `membership-${membership.id}`,
        kind: 'membership' as const,
        title: membership.name,
        description:
          days !== null && days < 0
            ? 'Membresia vencida'
            : `Vence en ${days} dia${days === 1 ? '' : 's'}`,
        actionLabel: 'Registrar pago' as const,
      };
    });

  return [...signupItems, ...changeItems, ...membershipItems];
}
