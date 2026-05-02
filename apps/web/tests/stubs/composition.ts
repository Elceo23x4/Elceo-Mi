type CompositionOverrides = {
  applicationStateRuntime?: unknown;
  analyticsRuntime?: unknown;
  notificationRuntime?: unknown;
  reasoningRuntime?: unknown;
};

let overrides: CompositionOverrides | null = null;

export function setCompositionTestOverrides(next: CompositionOverrides | null): void {
  overrides = next;
}

export function getApplicationStateRuntime() {
  if (!overrides?.applicationStateRuntime) throw new Error('missing_application_state_runtime_override');
  return overrides.applicationStateRuntime as {
    workspace: unknown;
    refresh: unknown;
  };
}

export function getAnalyticsRuntime() {
  if (!overrides?.analyticsRuntime) throw new Error('missing_analytics_runtime_override');
  return overrides.analyticsRuntime;
}

export function getNotificationRuntimes() {
  if (!overrides?.notificationRuntime) throw new Error('missing_notification_runtime_override');
  return overrides.notificationRuntime;
}

export function getReasoningRuntime() {
  if (!overrides?.reasoningRuntime) throw new Error('missing_reasoning_runtime_override');
  return overrides.reasoningRuntime;
}

export function getWorkspaceRuntime() {
  return (getApplicationStateRuntime() as { workspace: unknown }).workspace;
}

export function getRefreshRuntime() {
  return (getApplicationStateRuntime() as { refresh: unknown }).refresh;
}

export function getEntitlementsRuntime() {
  return ((getApplicationStateRuntime() as unknown) as { entitlements: unknown }).entitlements;
}

export function getBillingRuntime() {
  return ((getApplicationStateRuntime() as unknown) as { billing: unknown }).billing;
}

export function getPaymentProviderRuntime() {
  return ((getApplicationStateRuntime() as unknown) as { paymentProviders: unknown }).paymentProviders;
}

export function getBillingLifecycleRuntime() {
  return ((getApplicationStateRuntime() as unknown) as { billingLifecycle: unknown }).billingLifecycle;
}

export function getBillingPolicyRuntime() {
  return ((getApplicationStateRuntime() as unknown) as { billingPolicy: unknown }).billingPolicy;
}

export function getBillingAdminRuntime() {
  return ((getApplicationStateRuntime() as unknown) as { billingAdmin: unknown }).billingAdmin;
}

export function getBillingOrchestrationRuntime() {
  return ((getApplicationStateRuntime() as unknown) as { billingOrchestration: unknown }).billingOrchestration;
}

export function getSecurityRuntime() { return ((getApplicationStateRuntime() as unknown) as { security: unknown }).security; }
