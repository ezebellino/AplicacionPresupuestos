import {
  Bell,
  Building2,
  FileText,
  Home,
  LayoutDashboard,
  Shield,
  UserRound,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react';

import type { CurrentUser } from '../../shared/api/client';
import { navStyle } from './dashboardUtils';
import { styles } from './styles';
import type { DashboardNavItem, PlatformNotification, PlatformSection, View } from './types';

type MobileHeaderProps = {
  currentUser: CurrentUser | null;
  currentViewLabel: string;
  pendingNotificationCount: number;
  onOpenMenu: () => void;
  onToggleNotifications: () => void;
};

export function MobileDashboardHeader({
  currentUser,
  currentViewLabel,
  pendingNotificationCount,
  onOpenMenu,
  onToggleNotifications,
}: MobileHeaderProps) {
  return (
    <header style={styles.mobileHeader}>
      <div style={styles.mobileBrand}>
        <img alt="" src="/FacturEasy-icon.png" style={styles.mobileLogo} />
        <div style={styles.mobileBrandText}>
          <strong>FacturEasy</strong>
          <span style={styles.mobileCurrentView}>{currentViewLabel}</span>
        </div>
      </div>
      <div style={styles.mobileHeaderActions}>
        {currentUser?.role === 'platform_admin' ? (
          <button
            aria-label="Notificaciones"
            onClick={onToggleNotifications}
            style={styles.notificationButton}
            title="Notificaciones"
            type="button"
          >
            <Bell aria-hidden="true" size={16} strokeWidth={2.2} />
            {pendingNotificationCount > 0 ? <span style={styles.notificationBadge}>{pendingNotificationCount}</span> : null}
          </button>
        ) : null}
        <button aria-label="Abrir menu" onClick={onOpenMenu} style={styles.hamburgerButton} type="button">
          <span style={styles.hamburgerGlyph}>Menu</span>
        </button>
      </div>
    </header>
  );
}

type MobileDrawerProps = {
  accountItems: DashboardNavItem[];
  activeView: View;
  isDarkMode: boolean;
  navigationItems: DashboardNavItem[];
  onClose: () => void;
  onLogout: () => void;
  onToggleTheme: () => void;
  onViewChange: (view: View) => void;
};

export function MobileDashboardDrawer({
  accountItems,
  activeView,
  isDarkMode,
  navigationItems,
  onClose,
  onLogout,
  onToggleTheme,
  onViewChange,
}: MobileDrawerProps) {
  return (
    <div onClick={onClose} style={styles.mobileDrawerOverlay}>
      <aside onClick={(event) => event.stopPropagation()} style={styles.mobileDrawer} aria-label="Menu movil">
        <div style={styles.mobileDrawerHeader}>
          <strong>Mas opciones</strong>
          <button aria-label="Cerrar menu" onClick={onClose} style={styles.sidebarToggle} type="button">
            X
          </button>
        </div>
        <nav style={styles.mobileDrawerNav}>
          {navigationItems.map((item) => (
            <button
              key={item.view}
              onClick={() => onViewChange(item.view)}
              style={{ ...navStyle(activeView === item.view), ...styles.mobileDrawerNavButton }}
              type="button"
            >
              {item.label}
            </button>
          ))}
          {accountItems.map((item) => (
            <button
              key={item.view}
              onClick={() => onViewChange(item.view)}
              style={{ ...navStyle(activeView === item.view), ...styles.mobileDrawerNavButton }}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div style={styles.mobileDrawerActions}>
          <button onClick={onToggleTheme} style={styles.secondaryButton} type="button">
            {isDarkMode ? 'Modo claro' : 'Dark mode'}
          </button>
          <button onClick={onLogout} style={styles.secondaryButton} type="button">
            Salir
          </button>
        </div>
      </aside>
    </div>
  );
}

type SidebarProps = {
  activeView: View;
  isCollapsed: boolean;
  isCompactLayout: boolean;
  items: DashboardNavItem[];
  onToggleCollapsed: () => void;
  onViewChange: (view: View) => void;
};

function navIcon(view: View) {
  const iconProps = { 'aria-hidden': true as const, size: 16, strokeWidth: 2.2 };

  switch (view) {
    case 'summary':
      return <LayoutDashboard {...iconProps} />;
    case 'clients':
      return <Users {...iconProps} />;
    case 'costs':
      return <Wrench {...iconProps} />;
    case 'quotes':
      return <FileText {...iconProps} />;
    case 'treasury':
      return <Wallet {...iconProps} />;
    case 'company':
      return <Building2 {...iconProps} />;
    case 'platform':
      return <Shield {...iconProps} />;
    default:
      return <Home {...iconProps} />;
  }
}

export function DashboardSidebar({
  activeView,
  isCollapsed,
  isCompactLayout,
  items,
  onToggleCollapsed,
  onViewChange,
}: SidebarProps) {
  const shouldHideSidebarText = isCollapsed && !isCompactLayout;

  return (
    <aside
      style={{
        ...styles.sidebar,
        ...(isCollapsed ? styles.sidebarCollapsed : null),
      }}
      aria-label="Navegacion principal"
    >
      <div style={{ ...styles.logoRow, ...(shouldHideSidebarText ? styles.logoRowCollapsed : null) }}>
        <img
          alt=""
          src="/FacturEasy-icon.png"
          style={{ ...styles.logoMark, ...(shouldHideSidebarText ? styles.logoMarkCollapsed : null) }}
        />
        {shouldHideSidebarText ? null : <strong style={styles.logoText}>FacturEasy</strong>}
        <button
          aria-label={isCollapsed ? 'Expandir menu' : 'Minimizar menu'}
          onClick={onToggleCollapsed}
          style={{ ...styles.sidebarToggle, ...(shouldHideSidebarText ? styles.sidebarToggleCollapsed : null) }}
          type="button"
        >
          {isCollapsed ? '>' : '<'}
        </button>
      </div>
      <nav style={styles.nav}>
        {items.map((item) => (
          <button
            key={item.view}
            onClick={() => onViewChange(item.view)}
            style={{
              ...navStyle(activeView === item.view),
              ...(shouldHideSidebarText ? styles.navItemCollapsed : null),
            }}
            aria-label={item.label}
            title={item.label}
            type="button"
          >
            <span
              aria-hidden="true"
              style={{
                ...styles.navMonogram,
                ...(activeView === item.view ? styles.navMonogramActive : null),
                ...(shouldHideSidebarText ? styles.navMonogramCollapsed : null),
              }}
            >
              {navIcon(item.view)}
            </span>
            {shouldHideSidebarText ? null : <span style={styles.navLabel}>{item.label}</span>}
          </button>
        ))}
      </nav>
    </aside>
  );
}

type TopbarProps = {
  accountItems: DashboardNavItem[];
  activeView: View;
  currentUser: CurrentUser | null;
  isDarkMode: boolean;
  onLogout: () => void;
  onToggleNotifications: () => void;
  onToggleTheme: () => void;
  onViewChange: (view: View) => void;
  pendingNotificationCount: number;
};

export function DashboardTopbar({
  accountItems,
  activeView,
  currentUser,
  isDarkMode,
  onLogout,
  onToggleNotifications,
  onToggleTheme,
  onViewChange,
  pendingNotificationCount,
}: TopbarProps) {
  return (
    <header style={styles.topbar}>
      <div style={styles.topbarIntro}>
        <h1 style={styles.title}>Panel operativo</h1>
        <p style={styles.subtitle}>Clientes, catalogo de servicios y facturacion aislados por empresa.</p>
      </div>
      <div style={styles.topbarActions}>
        {currentUser?.role === 'platform_admin' ? (
          <button
            aria-label="Notificaciones"
            onClick={onToggleNotifications}
            style={styles.notificationButton}
            title="Notificaciones"
            type="button"
          >
            <Bell aria-hidden="true" size={16} strokeWidth={2.2} />
            {pendingNotificationCount > 0 ? <span style={styles.notificationBadge}>{pendingNotificationCount}</span> : null}
          </button>
        ) : null}
        {accountItems.map((item) => (
          <button
            key={item.view}
            onClick={() => onViewChange(item.view)}
            style={activeView === item.view ? styles.secondaryButtonActive : styles.secondaryButton}
            title={item.label}
            type="button"
          >
            <span style={styles.buttonWithIcon}>
              <UserRound aria-hidden="true" size={15} strokeWidth={2.2} />
              <span>{item.label}</span>
            </span>
          </button>
        ))}
        <button onClick={onToggleTheme} style={styles.secondaryButton} type="button">
          {isDarkMode ? 'Modo claro' : 'Dark mode'}
        </button>
        <button onClick={onLogout} style={styles.secondaryButton} type="button">
          Salir
        </button>
      </div>
    </header>
  );
}

type BootLoaderProps = {
  progress: number;
};

export function DashboardBootLoader({ progress }: BootLoaderProps) {
  return (
    <main style={styles.bootLoaderPage}>
      <section style={styles.bootLoaderCard} aria-label="Cargando panel">
        <div style={styles.bootLoaderLogoFrame}>
          <img alt="" src="/FacturEasy-icon.png" style={styles.bootLoaderLogo} />
        </div>
        <div style={styles.topbarIntro}>
          <h1 style={styles.bootLoaderTitle}>Iniciando FacturEasy</h1>
          <p style={styles.bootLoaderSubtitle}>Cargando tu espacio de trabajo y actualizando la sesión activa.</p>
        </div>
        <div style={styles.bootLoaderProgressTrack}>
          <div style={{ ...styles.bootLoaderProgressFill, width: `${progress}%` }} />
        </div>
        <span style={styles.bootLoaderProgressText}>{progress}% listo</span>
      </section>
    </main>
  );
}

type NotificationsPanelProps = {
  changeNotifications: PlatformNotification[];
  membershipNotifications: PlatformNotification[];
  onClose: () => void;
  onOpenSection: (section: PlatformSection) => void;
  pendingNotificationCount: number;
  signupNotifications: PlatformNotification[];
};

export function PlatformNotificationsPanel({
  changeNotifications,
  membershipNotifications,
  onClose,
  onOpenSection,
  pendingNotificationCount,
  signupNotifications,
}: NotificationsPanelProps) {
  return (
    <aside style={styles.notificationPanel} aria-label="Panel de notificaciones">
      <div style={styles.panelHeaderCompact}>
        <h2 style={styles.panelTitle}>Pendientes de plataforma</h2>
        <button aria-label="Cerrar notificaciones" onClick={onClose} style={styles.sidebarToggle} type="button">
          X
        </button>
      </div>
      {signupNotifications.length > 0 ? (
        <section style={styles.notificationSection}>
          <strong>Altas pendientes</strong>
          {signupNotifications.map((item) => (
            <article key={item.id} style={styles.notificationItem}>
              <strong>{item.title}</strong>
              <span style={styles.mutedText}>{item.description}</span>
              <button onClick={() => onOpenSection('signups')} style={styles.linkButton} type="button">
                {item.actionLabel}
              </button>
            </article>
          ))}
        </section>
      ) : null}
      {changeNotifications.length > 0 ? (
        <section style={styles.notificationSection}>
          <strong>Cambios fiscales</strong>
          {changeNotifications.map((item) => (
            <article key={item.id} style={styles.notificationItem}>
              <strong>{item.title}</strong>
              <span style={styles.mutedText}>{item.description}</span>
              <button onClick={() => onOpenSection('changes')} style={styles.linkButton} type="button">
                {item.actionLabel}
              </button>
            </article>
          ))}
        </section>
      ) : null}
      {membershipNotifications.length > 0 ? (
        <section style={styles.notificationSection}>
          <strong>Membresias por vencer o vencidas</strong>
          {membershipNotifications.map((item) => (
            <article key={item.id} style={styles.notificationItem}>
              <strong>{item.title}</strong>
              <span style={styles.mutedText}>{item.description}</span>
              <button onClick={() => onOpenSection('memberships')} style={styles.linkButton} type="button">
                {item.actionLabel}
              </button>
            </article>
          ))}
        </section>
      ) : null}
      {pendingNotificationCount === 0 ? <p style={styles.compactEmpty}>No hay pendientes operativos.</p> : null}
    </aside>
  );
}

type BottomTabsProps = {
  activeView: View;
  items: DashboardNavItem[];
  onViewChange: (view: View) => void;
};

export function DashboardBottomTabs({ activeView, items, onViewChange }: BottomTabsProps) {
  return (
    <nav style={styles.bottomTabBar} aria-label="Accesos rapidos">
      {items.map((item) => (
        <button
          key={item.view}
          onClick={() => onViewChange(item.view)}
          style={activeView === item.view ? styles.bottomTabActive : styles.bottomTab}
          title={item.label}
          type="button"
        >
          <span>{navIcon(item.view)}</span>
          {item.label === 'Presupuestos' ? 'Presup.' : item.label}
        </button>
      ))}
    </nav>
  );
}
