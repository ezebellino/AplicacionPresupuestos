import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Swal from 'sweetalert2';

import {
  apiClient,
  Client,
  ClientServiceRecord,
  CostItem,
  CurrentUser,
  ExpenseCategory,
  ExpenseEntry,
  Quote,
  PlatformTenantMembership,
  TenantProfile,
  TenantChangeRequest,
  TenantSignupRequest,
} from '../../shared/api/client';
import { buildDashboardMetrics, buildDashboardNavigation } from './dashboardDerivations';
import { companyProfileToForm, themeVariables } from './dashboardUtils';
import { buildPlatformNotifications } from './platformNotifications';
import { createPlatformAdminHandlers } from './platformAdminActions';
import { createQuoteActionHandlers } from './quoteActions';
import { createClientActionHandlers } from './clientActions';
import { createCostExpenseActionHandlers } from './costExpenseActions';
import { createCompanyProfileActionHandlers } from './companyProfileActions';
import {
  emptyClientForm,
  emptyCompanyProfileForm,
  emptyCostForm,
  emptyExpenseForm,
  emptyQuoteForm,
  emptyServiceRecordForm,
  emptyTenantLegalChangeForm,
} from './state';
import { styles } from './styles';
import {
  DashboardBootLoader,
  DashboardBottomTabs,
  DashboardSidebar,
  DashboardTopbar,
  MobileDashboardDrawer,
  MobileDashboardHeader,
  PlatformNotificationsPanel,
} from './shell';
import type {
  ClientForm,
  ClientRecordRequest,
  CompanyProfileForm,
  CostForm,
  ExpenseForm,
  PlatformSection,
  QuoteForm,
  ServiceRecordForm,
  TenantLegalChangeForm,
  View,
} from './types';
import { ClientsView } from './views/ClientsView';
import { CompanyProfileView } from './views/CompanyProfileView';
import { CostsView } from './views/CostsView';
import { QuotesView } from './views/QuotesView';
import { SummaryView } from './views/SummaryView';
import { TreasuryView } from './views/TreasuryView';
import { PlatformAdminView } from './views/PlatformAdminView';

type DashboardPageProps = {
  onLogout: () => void;
};

export function DashboardPage({ onLogout }: DashboardPageProps) {
  const [activeView, setActiveView] = useState<View>('summary');
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') !== 'light');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [activePlatformSection, setActivePlatformSection] = useState<PlatformSection>('overview');
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientServiceRecords, setClientServiceRecords] = useState<ClientServiceRecord[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [companyProfile, setCompanyProfile] = useState<TenantProfile | null>(null);
  const [tenantChangeRequests, setTenantChangeRequests] = useState<TenantChangeRequest[]>([]);
  const [platformChangeRequests, setPlatformChangeRequests] = useState<TenantChangeRequest[]>([]);
  const [platformSignupRequests, setPlatformSignupRequests] = useState<TenantSignupRequest[]>([]);
  const [platformMemberships, setPlatformMemberships] = useState<PlatformTenantMembership[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [expenseEntries, setExpenseEntries] = useState<ExpenseEntry[]>([]);
  const [costItems, setCostItems] = useState<CostItem[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clientForm, setClientForm] = useState<ClientForm>(emptyClientForm);
  const [companyProfileForm, setCompanyProfileForm] = useState<CompanyProfileForm>(emptyCompanyProfileForm);
  const [tenantLegalChangeForm, setTenantLegalChangeForm] = useState<TenantLegalChangeForm>(
    emptyTenantLegalChangeForm,
  );
  const [serviceRecordForm, setServiceRecordForm] = useState<ServiceRecordForm>(emptyServiceRecordForm);
  const [costForm, setCostForm] = useState<CostForm>(emptyCostForm);
  const [quoteForm, setQuoteForm] = useState<QuoteForm>(emptyQuoteForm);
  const [expenseForm, setExpenseForm] = useState<ExpenseForm>(emptyExpenseForm);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [editingCostId, setEditingCostId] = useState<string | null>(null);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [quoteEditorRequestId, setQuoteEditorRequestId] = useState<string | null>(null);
  const [quoteCreateClientRequestId, setQuoteCreateClientRequestId] = useState<string | null>(null);
  const [clientRecordRequest, setClientRecordRequest] = useState<ClientRecordRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasBootstrapped, setHasBootstrapped] = useState(false);
  const isCompactLayout = viewportWidth < 860;

  const metrics = buildDashboardMetrics(clients, costItems, quotes);

  const loadWorkspace = async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const [
        userResponse,
        profileResponse,
        changeRequestsResponse,
        clientsResponse,
        costsResponse,
        quotesResponse,
        expenseCategoriesResponse,
        expenseEntriesResponse,
      ] = await Promise.all([
        apiClient.getCurrentUser(),
        apiClient.getTenantProfile(),
        apiClient.listTenantChangeRequests(),
        apiClient.listClients(),
        apiClient.listCostItems(),
        apiClient.listQuotes(),
        apiClient.listExpenseCategories(),
        apiClient.listExpenseEntries(),
      ]);
      setCurrentUser(userResponse);
      setCompanyProfile(profileResponse);
      setCompanyProfileForm(companyProfileToForm(profileResponse));
      setTenantChangeRequests(changeRequestsResponse.items);
      setClients(clientsResponse.items);
      setCostItems(costsResponse.items);
      setQuotes(quotesResponse.items);
      setExpenseCategories(expenseCategoriesResponse.items);
      setExpenseEntries(expenseEntriesResponse.items);
      setSelectedQuoteId((current) => {
        if (current && quotesResponse.items.some((quote) => quote.id === current)) {
          return current;
        }

        return quotesResponse.items[0]?.id ?? null;
      });
      if (userResponse.role === 'platform_admin') {
        const [signupRequests, changeRequests, memberships] = await Promise.all([
          apiClient.listPlatformSignupRequests(),
          apiClient.listPlatformChangeRequests(),
          apiClient.listPlatformMemberships(),
        ]);
        setPlatformSignupRequests(signupRequests.items);
        setPlatformChangeRequests(changeRequests.items);
        setPlatformMemberships(memberships.items);
        setActiveView((current) => (current === 'summary' || current === 'company' ? 'platform' : current));
      }
    } catch {
      setLoadError('No pude cargar los datos. Revisá que el backend esté activo y que tu sesión siga vigente.');
    } finally {
      setHasBootstrapped(true);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkspace();
  }, []);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleTheme = () => {
    setIsDarkMode((current) => {
      const next = !current;
      localStorage.setItem('theme', next ? 'dark' : 'light');
      return next;
    });
  };









  const {
    bottomNavigationItems,
    currentViewLabel,
    mobileDrawerAccountItems,
    mobileDrawerNavigationItems,
    navigationItems,
    platformAccountActions,
  } = buildDashboardNavigation(currentUser, activeView);
  const platformNotifications =
    currentUser?.role === 'platform_admin'
      ? buildPlatformNotifications(platformSignupRequests, platformChangeRequests, platformMemberships)
      : [];
  const pendingNotificationCount = platformNotifications.length;
  const signupNotifications = platformNotifications.filter((item) => item.kind === 'signup');
  const changeNotifications = platformNotifications.filter((item) => item.kind === 'change_request');
  const membershipNotifications = platformNotifications.filter((item) => item.kind === 'membership');
  const goToView = (view: View) => {
    setActiveView(view);
    if (view === 'platform') {
      setActivePlatformSection('overview');
    }
    setIsMobileMenuOpen(false);
  };
  const openPlatformNotifications = (section: PlatformSection) => {
    setActiveView('platform');
    setActivePlatformSection(section);
    setIsNotificationsOpen(false);
    setIsMobileMenuOpen(false);
  };
  const clientActionHandlers = createClientActionHandlers({
    clientForm,
    clients,
    editingClientId,
    loadWorkspace,
    selectedClientId,
    serviceRecordForm,
    setActiveView,
    setClientForm,
    setClientRecordRequest,
    setClientServiceRecords,
    setEditingClientId,
    setIsSaving,
    setQuoteCreateClientRequestId,
    setQuoteForm,
    setSelectedClientId,
    setSelectedQuoteId,
    setServiceRecordForm,
  });
  const costExpenseActionHandlers = createCostExpenseActionHandlers({
    costForm,
    editingCostId,
    expenseCategories,
    expenseForm,
    loadWorkspace,
    setActiveView,
    setCostForm,
    setEditingCostId,
    setExpenseForm,
    setIsSaving,
  });
  const quoteActionHandlers = createQuoteActionHandlers({
    clients,
    companyProfile,
    loadWorkspace,
    quoteForm,
    setActiveView,
    setIsSaving,
    setQuoteCreateClientRequestId,
    setQuoteEditorRequestId,
    setQuoteForm,
    setSelectedQuoteId,
  });
  const companyProfileActionHandlers = createCompanyProfileActionHandlers({
    companyProfileForm,
    setCompanyProfile,
    setCompanyProfileForm,
    setIsSaving,
    setTenantChangeRequests,
    setTenantLegalChangeForm,
    tenantLegalChangeForm,
  });
  const platformAdminHandlers = createPlatformAdminHandlers({
    quotes,
    sendInvoiceByWhatsApp: quoteActionHandlers.sendInvoiceByWhatsApp,
    sendQuoteByEmail: quoteActionHandlers.sendQuoteByEmail,
    setClients,
    setIsSaving,
    setPlatformChangeRequests,
    setPlatformMemberships,
    setPlatformSignupRequests,
    setQuotes,
    setSelectedQuoteId,
  });

  const showBootLoader = import.meta.env.MODE !== 'test' && isLoading && !hasBootstrapped;
  const bootProgress = hasBootstrapped ? 100 : 76;

  if (showBootLoader) {
    return (
      <main
        style={{
          ...styles.page,
          ...themeVariables(isDarkMode),
        }}
      >
        <DashboardBootLoader progress={bootProgress} />
      </main>
    );
  }

  return (
    <main
      style={{
        ...styles.page,
        ...themeVariables(isDarkMode),
        ...(isCompactLayout ? styles.pageCompact : null),
      }}
    >
      {isCompactLayout ? (
        <>
          <MobileDashboardHeader
            currentUser={currentUser}
            currentViewLabel={currentViewLabel}
            onOpenMenu={() => setIsMobileMenuOpen(true)}
            onToggleNotifications={() => setIsNotificationsOpen((current) => !current)}
            pendingNotificationCount={pendingNotificationCount}
          />
          {isMobileMenuOpen ? (
            <MobileDashboardDrawer
              accountItems={mobileDrawerAccountItems}
              activeView={activeView}
              isDarkMode={isDarkMode}
              navigationItems={mobileDrawerNavigationItems}
              onClose={() => setIsMobileMenuOpen(false)}
              onLogout={onLogout}
              onToggleTheme={toggleTheme}
              onViewChange={goToView}
            />
          ) : null}
        </>
      ) : (
        <DashboardSidebar
          activeView={activeView}
          isCollapsed={isSidebarCollapsed}
          isCompactLayout={isCompactLayout}
          items={navigationItems}
          onToggleCollapsed={() => setIsSidebarCollapsed((current) => !current)}
          onViewChange={goToView}
        />
      )}

      <section style={{ ...styles.content, ...(isCompactLayout ? styles.contentCompact : null) }}>
        <div style={isCompactLayout ? styles.topbarMobileHidden : undefined}>
          <DashboardTopbar
            accountItems={platformAccountActions}
            activeView={activeView}
            currentUser={currentUser}
            isDarkMode={isDarkMode}
            onLogout={onLogout}
            onToggleNotifications={() => setIsNotificationsOpen((current) => !current)}
            onToggleTheme={toggleTheme}
            onViewChange={goToView}
            pendingNotificationCount={pendingNotificationCount}
          />
        </div>

        {loadError ? <p style={styles.errorBanner}>{loadError}</p> : null}

        {isNotificationsOpen && currentUser?.role === 'platform_admin' ? (
          <PlatformNotificationsPanel
            changeNotifications={changeNotifications}
            membershipNotifications={membershipNotifications}
            onClose={() => setIsNotificationsOpen(false)}
            onOpenSection={openPlatformNotifications}
            pendingNotificationCount={pendingNotificationCount}
            signupNotifications={signupNotifications}
          />
        ) : null}

        {activeView === 'summary' ? (
          <SummaryView
            clients={clients}
            costItems={costItems}
            isLoading={isLoading}
            metrics={metrics}
            onNewQuote={() => setActiveView('quotes')}
            onOpenQuote={quoteActionHandlers.openQuoteEditorFromAnotherView}
            quotes={quotes}
          />
        ) : null}

        {activeView === 'clients' ? (
          <ClientsView
            clients={clients}
            form={clientForm}
            isCompactLayout={isCompactLayout}
            isSaving={isSaving}
            editingClientId={editingClientId}
            recordRequest={clientRecordRequest}
            selectedClientId={selectedClientId}
            quotes={quotes}
            serviceRecordForm={serviceRecordForm}
            serviceRecords={clientServiceRecords}
            onCancel={() => {
              setClientForm(emptyClientForm);
              setEditingClientId(null);
            }}
            onCreateQuoteForClient={clientActionHandlers.openQuoteDraftForClient}
            onDelete={clientActionHandlers.deleteClient}
            onEdit={clientActionHandlers.editClient}
            onFormChange={setClientForm}
            onHistory={clientActionHandlers.openClientHistory}
            onOpenQuote={quoteActionHandlers.openQuoteEditorFromAnotherView}
            onQuickCreate={clientActionHandlers.handleQuickClientCreate}
            onRecordRequestHandled={() => setClientRecordRequest(null)}
            onServiceFormChange={setServiceRecordForm}
            onServiceSubmit={clientActionHandlers.handleServiceRecordSubmit}
            onSubmit={clientActionHandlers.handleClientSubmit}
          />
        ) : null}

        {activeView === 'costs' ? (
          <CostsView
            costItems={costItems}
            editingCostId={editingCostId}
            form={costForm}
            isCompactLayout={isCompactLayout}
            isSaving={isSaving}
            onCancel={() => {
              setCostForm(emptyCostForm);
              setEditingCostId(null);
            }}
            onDelete={costExpenseActionHandlers.deleteCost}
            onEdit={costExpenseActionHandlers.editCost}
            onFormChange={setCostForm}
            onSubmit={costExpenseActionHandlers.handleCostSubmit}
            showOperationPresets={currentUser?.role !== 'platform_admin'}
          />
        ) : null}

        {activeView === 'quotes' ? (
          <QuotesView
            clients={clients}
            costItems={costItems}
            editorRequestId={quoteEditorRequestId}
            form={quoteForm}
            isCompactLayout={isCompactLayout}
            isSaving={isSaving}
            newQuoteClientIdRequest={quoteCreateClientRequestId}
            onAddCostItem={quoteActionHandlers.addQuoteItemFromCatalog}
            onDeleteItem={quoteActionHandlers.deleteQuoteItem}
            onDeleteQuotes={quoteActionHandlers.deleteQuotes}
            onDownloadPdf={quoteActionHandlers.downloadQuotePdf}
            onEditClient={clientActionHandlers.openClientRecordFromAnotherView}
            onEditorRequestHandled={() => setQuoteEditorRequestId(null)}
            onFormChange={setQuoteForm}
            onNewQuoteClientRequestHandled={() => setQuoteCreateClientRequestId(null)}
            onSelectQuote={setSelectedQuoteId}
            onSubmit={quoteActionHandlers.handleQuoteSubmit}
            onTransition={quoteActionHandlers.transitionQuote}
            quotes={quotes}
            selectedQuoteId={selectedQuoteId}
          />
        ) : null}

        {activeView === 'treasury' ? (
          <TreasuryView
            clients={clients}
            expenseCategories={expenseCategories}
            expenseEntries={expenseEntries}
            expenseForm={expenseForm}
            isCompactLayout={isCompactLayout}
            isSaving={isSaving}
            onExpenseFormChange={setExpenseForm}
            onExpenseStatusChange={costExpenseActionHandlers.handleExpenseStatusChange}
            onExpenseSubmit={costExpenseActionHandlers.handleExpenseSubmit}
            onManageExpenseCategories={costExpenseActionHandlers.handleManageExpenseCategories}
            onDownloadPdf={quoteActionHandlers.downloadQuotePdf}
            onOpenQuote={quoteActionHandlers.openQuoteEditorFromAnotherView}
            onSendInvoiceByWhatsApp={quoteActionHandlers.sendInvoiceByWhatsApp}
            quotes={quotes}
          />
        ) : null}

        {activeView === 'company' ? (
          <CompanyProfileView
            form={companyProfileForm}
            isCompactLayout={isCompactLayout}
            isSaving={isSaving}
            legalChangeForm={tenantLegalChangeForm}
            mode={currentUser?.role === 'platform_admin' ? 'platform' : 'tenant'}
            onFormChange={setCompanyProfileForm}
            onLegalChangeFormChange={setTenantLegalChangeForm}
            onLegalChangeSubmit={companyProfileActionHandlers.handleTenantLegalChangeSubmit}
            onSubmit={companyProfileActionHandlers.handleCompanyProfileSubmit}
            requests={tenantChangeRequests}
          />
        ) : null}

        {activeView === 'platform' && currentUser?.role === 'platform_admin' ? (
          <PlatformAdminView
            activeSection={activePlatformSection}
            changeRequests={platformChangeRequests}
            isCompactLayout={isCompactLayout}
            isSaving={isSaving}
            memberships={platformMemberships}
            onChangeSection={setActivePlatformSection}
            onApproveFiscalChange={platformAdminHandlers.onApproveFiscalChange}
            onApproveSignup={platformAdminHandlers.onApproveSignup}
            onCancelMembershipPayment={platformAdminHandlers.onCancelMembershipPayment}
            onMarkMembershipPaid={platformAdminHandlers.onMarkMembershipPaid}
            onMarkSignupContacted={platformAdminHandlers.onMarkSignupContacted}
            onRejectFiscalChange={platformAdminHandlers.onRejectFiscalChange}
            onRejectSignup={platformAdminHandlers.onRejectSignup}
            onSendMembershipQuoteByEmail={platformAdminHandlers.onSendMembershipQuoteByEmail}
            onSendMembershipQuoteByWhatsApp={platformAdminHandlers.onSendMembershipQuoteByWhatsApp}
            onUpdateMembershipPayment={platformAdminHandlers.onUpdateMembershipPayment}
            signupRequests={platformSignupRequests}
          />
        ) : null}
      </section>
      {isCompactLayout ? (
        <DashboardBottomTabs activeView={activeView} items={bottomNavigationItems} onViewChange={goToView} />
      ) : null}
    </main>
  );
}

