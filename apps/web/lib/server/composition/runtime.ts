import 'server-only';

import {
  CanonicalJournalBoundaryService,
  CanonicalJournalInfluenceBoundaryService,
  CanonicalPortfolioBoundaryService,
  CanonicalRefreshBoundaryService,
  CanonicalWorkspaceBoundaryService,
  CanonicalAdminBoundaryService,
  CanonicalEntitlementsBoundaryService,
  CanonicalBillingBoundaryService,
  CanonicalBillingLifecycleBoundaryService,
  CanonicalBillingPolicyBoundaryService,
  CanonicalPaymentProviderBoundaryService,
  CanonicalBillingAdminBoundaryService,
  CanonicalBillingOrchestrationBoundaryService,
  BillingOrchestrationExecutionService,
  BillingOrchestrationQueryService,
  BillingAdminQueryService,
  BillingLifecycleQueryService,
  BillingLifecycleReconciliationService,
  BillingLifecycleReplayService,
  BillingPolicyTransitionService,
  BillingPolicyQueryService,
  BillingProviderPlanMapper,
  createDefaultSnapshotRefreshLoaders,
  createWorkspaceDefaultLoaders,
  getPortfolioRepository,
  getSnapshotFreshnessRepository,
  getSnapshotRefreshRunRepository,
  getWorkspaceSnapshotRepository,
  SQLAccountEntitlementRepository,
  SQLFeatureAccessDecisionRepository,
  SQLUsageCounterRepository,
  SQLBillingSubscriptionRepository,
  SQLBillingEventRepository,
  SQLExternalBillingCustomerRepository,
  SQLExternalBillingSubscriptionRepository,
  SQLExternalBillingEventRepository,
  SQLBillingCustomerRepository,
  SQLBillingLifecycleSubscriptionRepository,
  SQLBillingReconciliationRunRepository,
  SQLBillingPolicyTransitionRepository,
  SQLProviderPlanMappingRepository,
  SQLBillingOrchestrationRunRepository,
  PaymentProviderTranslator
} from '@elceo/application-state';
import { CanonicalAnalyticsBoundaryService, CanonicalCoachingBoundaryService } from '@elceo/analytics';
import { createReasoningPersistenceRepository } from '@elceo/reasoning';
import {
  CanonicalNotificationDeliveryBoundaryService,
  CanonicalNotificationFeedbackBoundaryService,
  CanonicalNotificationManagementBoundaryService,
  CanonicalNotificationVerificationBoundaryService,
  createNotificationDecisionRepository,
  createNotificationDeliveryReceiptRepository,
  createNotificationInboxRepository,
  createNotificationOrchestrationRunRepository,
  createNotificationOutboxAttemptRepository,
  createNotificationOutboxRepository,
  createNotificationProviderEventRepository,
  createNotificationSubscriptionRepository,
  createNotificationTargetHealthRepository,
  createNotificationTargetRepository,
  createNotificationVerificationRepository,
  createNotificationDeliveryTransport,
  type NotificationDeliveryRuntimeRepositories
} from '@elceo/notifications';

const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};

type ApplicationStateRuntime = {
  journal: CanonicalJournalBoundaryService;
  journalInfluence: CanonicalJournalInfluenceBoundaryService;
  portfolio: CanonicalPortfolioBoundaryService;
  workspace: CanonicalWorkspaceBoundaryService;
  refresh: CanonicalRefreshBoundaryService;
  admin: CanonicalAdminBoundaryService;
  entitlements: CanonicalEntitlementsBoundaryService;
  billing: CanonicalBillingBoundaryService;
  billingLifecycle: CanonicalBillingLifecycleBoundaryService;
  billingPolicy: CanonicalBillingPolicyBoundaryService;
  billingAdmin: CanonicalBillingAdminBoundaryService;
  billingOrchestration: CanonicalBillingOrchestrationBoundaryService;
  paymentProviders: CanonicalPaymentProviderBoundaryService;
};

type AnalyticsRuntime = {
  analytics: CanonicalAnalyticsBoundaryService;
  coaching: CanonicalCoachingBoundaryService;
};

type ReasoningRuntime = ReturnType<typeof createReasoningPersistenceRepository>;

type NotificationRuntime = {
  repositories: NotificationDeliveryRuntimeRepositories;
  management: CanonicalNotificationManagementBoundaryService;
  verification: CanonicalNotificationVerificationBoundaryService;
  delivery: CanonicalNotificationDeliveryBoundaryService;
  feedback: CanonicalNotificationFeedbackBoundaryService;
};

let applicationStateRuntime: ApplicationStateRuntime | null = null;
let analyticsRuntime: AnalyticsRuntime | null = null;
let reasoningRuntime: ReasoningRuntime | null = null;
let notificationRuntime: NotificationRuntime | null = null;
let compositionTestOverrides: {
  applicationStateRuntime?: ApplicationStateRuntime;
  analyticsRuntime?: AnalyticsRuntime;
  notificationRuntime?: NotificationRuntime;
  reasoningRuntime?: ReasoningRuntime;
} | null = null;

export function setCompositionTestOverrides(overrides: {
  applicationStateRuntime?: ApplicationStateRuntime;
  analyticsRuntime?: AnalyticsRuntime;
  notificationRuntime?: NotificationRuntime;
  reasoningRuntime?: ReasoningRuntime;
} | null): void {
  compositionTestOverrides = overrides;
}

function getNotificationRepositories(): NotificationDeliveryRuntimeRepositories {
  const targetRepository = createNotificationTargetRepository(env);
  const reasoning = getReasoningRuntime();
  return {
    runRepository: reasoning.runRepository,
    snapshotRepository: reasoning.snapshotRepository,
    driftRepository: reasoning.driftRepository,
    decisionRepository: createNotificationDecisionRepository(env),
    outboxRepository: createNotificationOutboxRepository(env),
    outboxAttemptRepository: createNotificationOutboxAttemptRepository(env),
    targetRepository,
    subscriptionRepository: createNotificationSubscriptionRepository(env),
    inboxRepository: createNotificationInboxRepository(env),
    orchestrationRunRepository: createNotificationOrchestrationRunRepository(env),
    verificationRepository: createNotificationVerificationRepository(env),
    providerEventRepository: createNotificationProviderEventRepository(env),
    receiptRepository: createNotificationDeliveryReceiptRepository(env),
    targetHealthRepository: createNotificationTargetHealthRepository(env, targetRepository)
  };
}

export function getNotificationRuntimes(): NotificationRuntime {
  if (compositionTestOverrides?.notificationRuntime) return compositionTestOverrides.notificationRuntime;
  if (notificationRuntime) return notificationRuntime;
  const repositories = getNotificationRepositories();
  const transport = createNotificationDeliveryTransport(env, { inboxRepository: repositories.inboxRepository });
  notificationRuntime = {
    repositories,
    management: new CanonicalNotificationManagementBoundaryService(repositories, env),
    verification: new CanonicalNotificationVerificationBoundaryService(repositories),
    delivery: new CanonicalNotificationDeliveryBoundaryService(repositories, transport),
    feedback: new CanonicalNotificationFeedbackBoundaryService(repositories, env)
  };
  return notificationRuntime;
}

export function getReasoningRuntime(): ReasoningRuntime {
  if (compositionTestOverrides?.reasoningRuntime) return compositionTestOverrides.reasoningRuntime;
  if (!reasoningRuntime) reasoningRuntime = createReasoningPersistenceRepository(env);
  return reasoningRuntime;
}

export function getAnalyticsRuntime(): AnalyticsRuntime {
  if (compositionTestOverrides?.analyticsRuntime) return compositionTestOverrides.analyticsRuntime;
  if (!analyticsRuntime) {
    analyticsRuntime = {
      analytics: new CanonicalAnalyticsBoundaryService(),
      coaching: new CanonicalCoachingBoundaryService()
    };
  }
  return analyticsRuntime;
}

export function getApplicationStateRuntime(): ApplicationStateRuntime {
  if (compositionTestOverrides?.applicationStateRuntime) return compositionTestOverrides.applicationStateRuntime;
  if (applicationStateRuntime) return applicationStateRuntime;

  const journal = new CanonicalJournalBoundaryService();
  const journalInfluence = new CanonicalJournalInfluenceBoundaryService();
  const portfolio = new CanonicalPortfolioBoundaryService(getPortfolioRepository());
  const { analytics, coaching } = getAnalyticsRuntime();
  const reasoning = getReasoningRuntime();
  const notifications = getNotificationRuntimes();

  const workspace = new CanonicalWorkspaceBoundaryService(
    getWorkspaceSnapshotRepository(),
    createWorkspaceDefaultLoaders({
      portfolioBoundary: portfolio,
      coachingBoundary: coaching,
      analyticsBoundary: analytics,
      reasoningRunsRepository: reasoning.runRepository,
      reasoningSnapshotRepository: reasoning.snapshotRepository,
      notificationRepositories: notifications.repositories
    })
  );

  const refresh = new CanonicalRefreshBoundaryService(
    createDefaultSnapshotRefreshLoaders({
      journalInfluenceBoundary: journalInfluence,
      analyticsBoundary: analytics,
      coachingBoundary: coaching,
      portfolioBoundary: portfolio,
      workspaceBoundary: workspace
    }),
    getSnapshotRefreshRunRepository(),
    getSnapshotFreshnessRepository()
  );

  const admin = new CanonicalAdminBoundaryService();
  const entitlements = new CanonicalEntitlementsBoundaryService(
    new SQLAccountEntitlementRepository(),
    new SQLUsageCounterRepository(),
    new SQLFeatureAccessDecisionRepository()
  );
  const billingSubscriptions = new SQLBillingSubscriptionRepository();
  const billingEvents = new SQLBillingEventRepository();
  const billing = new CanonicalBillingBoundaryService(
    billingSubscriptions,
    billingEvents,
    new SQLAccountEntitlementRepository()
  );
  const externalSubscriptions = new SQLExternalBillingSubscriptionRepository();
  const billingLifecycle = new CanonicalBillingLifecycleBoundaryService(
    new BillingLifecycleReconciliationService(new SQLBillingCustomerRepository(), new SQLBillingLifecycleSubscriptionRepository(), new SQLBillingReconciliationRunRepository(), new SQLExternalBillingEventRepository(), externalSubscriptions, new SQLAccountEntitlementRepository(), new BillingProviderPlanMapper(new SQLProviderPlanMappingRepository())),
    new BillingLifecycleQueryService(new SQLBillingCustomerRepository(), new SQLBillingLifecycleSubscriptionRepository(), new SQLBillingReconciliationRunRepository(), new SQLAccountEntitlementRepository()),
    new BillingLifecycleReplayService(new SQLBillingReconciliationRunRepository())
  );
  const paymentProviders = new CanonicalPaymentProviderBoundaryService(
    new SQLExternalBillingEventRepository(),
    new SQLExternalBillingCustomerRepository(),
    externalSubscriptions,
    new SQLProviderPlanMappingRepository(),
    new PaymentProviderTranslator(billing, externalSubscriptions)
  );
  const billingPolicyTransitions = new SQLBillingPolicyTransitionRepository();
  const billingLifecycleQuery = new BillingLifecycleQueryService(new SQLBillingCustomerRepository(), new SQLBillingLifecycleSubscriptionRepository(), new SQLBillingReconciliationRunRepository(), new SQLAccountEntitlementRepository());
  const billingPolicyQuery = new BillingPolicyQueryService(new SQLBillingCustomerRepository(), new SQLBillingLifecycleSubscriptionRepository(), billingPolicyTransitions, new SQLAccountEntitlementRepository());
  const billingAdmin = new CanonicalBillingAdminBoundaryService();
  const billingAdminQuery = new BillingAdminQueryService(billingLifecycleQuery, billingPolicyQuery);
  const billingPolicy = new CanonicalBillingPolicyBoundaryService(
      new BillingPolicyTransitionService(
        new SQLBillingCustomerRepository(),
        new SQLBillingLifecycleSubscriptionRepository(),
        billingPolicyTransitions,
        new SQLAccountEntitlementRepository()
      ),
      new BillingPolicyQueryService(
        new SQLBillingCustomerRepository(),
        new SQLBillingLifecycleSubscriptionRepository(),
        billingPolicyTransitions,
        new SQLAccountEntitlementRepository()
      )
  );
  const orchestrationRepo = new SQLBillingOrchestrationRunRepository();
  applicationStateRuntime = {
    journal, journalInfluence, portfolio, workspace, refresh, admin, entitlements, billing, billingLifecycle,
    billingPolicy,
    billingAdmin,
    billingOrchestration: new CanonicalBillingOrchestrationBoundaryService(
      new BillingOrchestrationExecutionService(orchestrationRepo, billingAdminQuery, billingLifecycle, billingPolicy),
      new BillingOrchestrationQueryService(orchestrationRepo),
      billingAdminQuery,
      billingLifecycleQuery,
      billingPolicyQuery
    ),
    paymentProviders
  };
  return applicationStateRuntime;
}

export function getWorkspaceRuntime() { return getApplicationStateRuntime().workspace; }
export function getRefreshRuntime() { return getApplicationStateRuntime().refresh; }

export function getEntitlementsRuntime() { return getApplicationStateRuntime().entitlements; }
export function getBillingRuntime() { return getApplicationStateRuntime().billing; }
export function getPaymentProviderRuntime() { return getApplicationStateRuntime().paymentProviders; }

export function getBillingLifecycleRuntime() { return getApplicationStateRuntime().billingLifecycle; }
export function getBillingPolicyRuntime() { return getApplicationStateRuntime().billingPolicy; }

export function getBillingAdminRuntime() { return getApplicationStateRuntime().billingAdmin; }

export function getBillingOrchestrationRuntime() {
  return getApplicationStateRuntime().billingOrchestration;
}
