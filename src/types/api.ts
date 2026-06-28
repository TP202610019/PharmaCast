// ─── Enums (mirror backend Domain/Enums) ────────────────────────────────────

export enum ExecutionStatus {
  Pending = 1,
  Processing = 2,
  Completed = 3,
  Failed = 4,
}

export enum ReportType {
  PurchasePlan = 1,
  ForecastSummary = 2,
  MetricsReport = 3,
  FullAnalysis = 4,
}

export enum DatasetStage {
  Temporary = 1,
  Raw = 2,
  Processed = 3,
}

export enum UploadStatus {
  Pending = 1,
  Uploading = 2,
  Completed = 3,
  Failed = 4,
}

export enum FileType {
  CSV = 1,
  XLS = 2,
  XLSX = 3,
}

// ─── API Response Wrapper ────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  code: string | null;
  message: string | null;
  data: T | null;
  errors: Record<string, string[]> | null;
  timestamp: string;
}

// ─── Auth DTOs ───────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  accessToken: string;
  refreshToken: string;
}

export interface UserProfileResponse {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: UserProfileResponse;
}

// ─── Dashboard DTOs ──────────────────────────────────────────────────────────

export interface RecentExecutionSummary {
  id: string;
  datasetName: string;
  status: ExecutionStatus;
  createdAt: string;
}

export interface DashboardMetricsResponse {
  totalDatasets: number;
  totalPredictions: number;
  completedPredictions: number;
  pendingPredictions: number;
  totalReports: number;
  recentExecutions: RecentExecutionSummary[];
}

export interface DashboardSummaryResponse {
  latestPredictionId: string | null;
  latestPredictionDate: string | null;
  forecastPeriod: number | null;
  latestStatus: ExecutionStatus | null;
  accuracy: number;
  totalProducts: number;
  criticalCount: number;
  totalForecastedUnits: number;
  productNames: string[];
}

export interface DashboardProductRow {
  productName: string;
  totalPredictedQuantity: number;
  avgPredictedQuantity: number;
  priority: "critical" | "high" | "medium" | "low";
}

export interface PagedResult<T> {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  items: T[];
}

export interface DashboardChartPoint {
  date: string;
  predicted: number;
  upper: number | null;
  lower: number | null;
}

export interface DashboardChartResponse {
  productName: string;
  points: DashboardChartPoint[];
}

// ─── Dataset DTOs ────────────────────────────────────────────────────────────

export interface DatasetResponse {
  id: string;
  originalFileName: string;
  storedFileName: string;
  blobPath: string | null;
  fileType: FileType;
  datasetStage: DatasetStage;
  uploadStatus: UploadStatus;
  rowsCount: number | null;
  mappingConfigurationId: string | null;
  createdAt: string;
  updatedAt: string | null;
}

// ─── Mapping DTOs ────────────────────────────────────────────────────────────

export interface MappingFieldEntry {
  fieldKey: string;
  datasetColumnName: string;
}

export interface MappingFieldEntryResponse {
  fieldKey: string;
  datasetColumnName: string;
  displayName: string;
  fieldType: "sales" | "inventory";
  isRequired: boolean;
}

export interface MappingFieldResponse {
  id: string;
  fieldKey: string;
  displayName: string;
  fieldType: "sales" | "inventory";
  isRequired: boolean;
  isActive: boolean;
}

export interface CreateMappingRequest {
  configurationName: string;
  isDefault: boolean;
  fields: MappingFieldEntry[];
}

export interface MappingConfigResponse {
  id: string;
  configurationName: string;
  isDefault: boolean;
  fields: MappingFieldEntryResponse[];
  createdAt: string;
  updatedAt: string | null;
}

// ─── Prediction DTOs ─────────────────────────────────────────────────────────

export interface CreatePredictionRequest {
  datasetId: string;
  forecastPeriod: number;
  mappingConfigurationId?: string;
}

export interface ForecastResultResponse {
  productName: string;
  forecastDate: string;
  predictedQuantity: number;
  lowerBound: number | null;
  upperBound: number | null;
}

export interface PredictionMetricResponse {
  // null = aggregate (overall); non-null = per-product row
  productName: string | null;
  wape: number | null;
  rmse: number | null;
  mae: number | null;
  mape: number | null;
  rows: number | null;
}

export interface PredictionResponse {
  id: string;
  datasetId: string;
  forecastPeriod: number;
  executionStatus: ExecutionStatus;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  forecastResults: ForecastResultResponse[];
  metrics: PredictionMetricResponse[];
  createdAt: string;
}

export interface PredictionSummaryResponse {
  id: string;
  datasetId: string;
  datasetName: string;
  forecastPeriod: number;
  executionStatus: ExecutionStatus;
  completedAt: string | null;
  createdAt: string;
}

// ─── Purchase Plan DTOs ──────────────────────────────────────────────────────

export interface GeneratePurchasePlanRequest {
  predictionExecutionId: string;
  planName?: string;
  inventoryDatasetId?: string;
  inventoryFieldMappings?: Record<string, string>;
}

export interface PurchasePlanItemResponse {
  id: string;
  productName: string;
  recommendedQuantity: number;
  demandPredicted: number | null;
  stockActual: number | null;
  toPurchase: number | null;
  category: string | null;
  supplier: string | null;
  estimatedCost: number | null;
}

export interface PurchasePlanResponse {
  id: string;
  predictionExecutionId: string;
  planName: string;
  generatedAt: string;
  items: PurchasePlanItemResponse[];
  createdAt: string;
}

export interface PlanEvaluationItem {
  productName: string;
  actualSold: number;
  pharmaCastPlan: number;
  pharmacyPlan: number | null;
  pharmaCastAccuracy: 'good' | 'ok' | 'poor';
  pharmacyAccuracy: 'good' | 'ok' | 'poor' | null;
  mape: number;
  pharmacyMape: number | null;
  sobrestockSoles: number;
  desabastoSoles: number;
  pharmacySobrestockSoles: number | null;
  pharmacyDesabastoSoles: number | null;
}

export interface PlanEvaluationSummary {
  totalProducts: number;
  pharmaCastGoodCount: number;
  pharmacyGoodCount: number;
  hasPharmacyPlan: boolean;
  hasPrice: boolean;
  pharmaCastGoodPct: number;
  pharmacyGoodPct: number;
  pharmaCastAvgMape: number;
  pharmacyAvgMape: number | null;
  pharmaCastTotalSobrestockSoles: number;
  pharmaCastTotalDesabastoSoles: number;
  pharmacyTotalSobrestockSoles: number | null;
  pharmacyTotalDesabastoSoles: number | null;
}

export interface PlanEvaluationResponse {
  planId: string;
  summary: PlanEvaluationSummary;
  items: PlanEvaluationItem[];
}

// ─── Report DTOs ─────────────────────────────────────────────────────────────

export interface GenerateReportRequest {
  predictionExecutionId: string;
  reportType: ReportType;
}

export interface ReportResponse {
  id: string;
  predictionExecutionId: string;
  reportType: ReportType;
  blobPath: string | null;
  generatedAt: string;
  createdAt: string;
}

// ─── API Error ───────────────────────────────────────────────────────────────

export interface ApiError {
  message: string;
  code: string | null;
  errors: Record<string, string[]> | null;
  status: number;
}
