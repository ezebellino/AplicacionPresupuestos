import type { Client, CostItem, CurrentUser, Quote } from '../../shared/api/client';
import { formatMoney, sumQuotes } from './helpers';
import type { DashboardNavItem, View } from './types';

export function buildDashboardMetrics(clients: Client[], costItems: CostItem[], quotes: Quote[]) {
  return [
    { label: 'Clientes', value: String(clients.length) },
    { label: 'Servicios activos', value: String(costItems.length) },
    { label: 'Presupuestos', value: String(quotes.length) },
    { label: 'Facturado', value: formatMoney(sumQuotes(quotes, 'accepted')) },
  ];
}

export function buildDashboardNavigation(currentUser: CurrentUser | null, activeView: View) {
  const navigationItems: DashboardNavItem[] = [
    { label: 'Resumen', view: 'summary' },
    { label: 'Clientes', view: 'clients' },
    { label: 'Servicios', view: 'costs' },
    { label: 'Presupuestos', view: 'quotes' },
    { label: 'Tesoreria', view: 'treasury' },
  ];

  if (currentUser?.role === 'platform_admin') {
    navigationItems.push({ label: 'Plataforma', view: 'platform' });
  } else {
    navigationItems.push({ label: 'Empresa', view: 'company' });
  }

  const platformAccountActions =
    currentUser?.role === 'platform_admin' ? [{ label: 'Perfil', view: 'company' as View }] : [];

  return {
    bottomNavigationItems: navigationItems.filter((item) =>
      ['summary', 'clients', 'quotes', 'treasury'].includes(item.view),
    ),
    currentViewLabel: navigationItems.find((item) => item.view === activeView)?.label ?? 'Resumen',
    mobileDrawerAccountItems:
      currentUser?.role === 'platform_admin' ? [{ label: 'Perfil', view: 'company' as View }] : [],
    mobileDrawerNavigationItems: navigationItems.filter((item) =>
      ['costs', 'company', 'platform'].includes(item.view),
    ),
    navigationItems,
    platformAccountActions,
  };
}
