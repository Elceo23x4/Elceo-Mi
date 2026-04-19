import type { ChartAnnotation, DashboardCognitionViewModel, H4Zone } from '@elceo/types';

export type ChartIntelligenceOutput = {
  zones: H4Zone[];
  annotations: ChartAnnotation[];
  dashboardViewModel: DashboardCognitionViewModel;
};
