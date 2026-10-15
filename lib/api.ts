// ============================================================
// LIVE TRACK — Centralized Backend API Client
// Base URL: process.env.NEXT_PUBLIC_API_URL (default: http://localhost:8000)
// ============================================================

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

// ─── Generic fetch wrapper ───────────────────────────────────
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ─── Snake → Camel recursive transformer ─────────────────────
function toCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function camelize<T>(obj: any): T {
  if (Array.isArray(obj)) return obj.map(camelize) as unknown as T;
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [toCamel(k), camelize(v)])
    ) as T;
  }
  return obj as T;
}

// ─── Camel → Snake recursive transformer ─────────────────────
function toSnake(s: string): string {
  return s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function snakify(obj: any): any {
  if (Array.isArray(obj)) return obj.map(snakify);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [toSnake(k), snakify(v)])
    );
  }
  return obj;
}

// ═══════════════════════════════════════════════════════════════
// Types mirroring backend schemas (camelCase frontend)
// ═══════════════════════════════════════════════════════════════

export interface ApiIncident {
  id: number | string;
  incidentId?: string;
  title: string;
  description: string;
  disasterType?: string;
  severity: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  locationName: string;
  reportedAt: string;
  updatedAt: string;
  peopleAtRisk: number;
  assignedTeam: string;
  notes: string;
}

export interface ApiDetection {
  id: number;
  className: string;
  confidence: number;
  bbox: number[];
}

export interface ApiAnalysis {
  id: string | number;
  analysisId?: string;
  incidentId?: string | number | null;
  filePath?: string | null;
  imagePath?: string | null;
  annotatedPath?: string | null;
  annotatedImagePath?: string | null;
  fileName?: string | null;
  modelName?: string | null;
  modelUsed?: string | null;
  totalDetections?: number;
  peopleCount?: number;
  vehicleCount?: number;
  obstacleCount?: number;
  notes?: string | null;
  analysisNotes?: string | null;
  location?: string | null;
  uploadedAt?: string | null;
  createdAt?: string | null;
  inferenceStatus?: string | null;
  detections: ApiDetection[];
}

export interface ApiClassification {
  primaryDisasterType: string;
  secondaryDisasterTypes: string[];
  confidence: number;
  supportingEvidence: string[];
  alternativeClassifications: string[];
  uncertainties: string[];
  recommendedWorkflowId: string;
  requiredAnalysis: string[];
  additionalInformationNeeded: string[];
  isUncertain: boolean;
}

export interface ApiDisasterWorkflow {
  workflowId: string;
  category: string;
  displayName: string;
  description: string;
  supportedClasses?: string[];
  visualIndicators?: string[];
  relevantMapLayers: string[];
  recommendedRescueResources: string[];
  potentialHazards: string[];
  recommendedNextSteps: string[];
  reportSections: string[];
  missingDataRequirements: string[];
}

export interface ApiRegisteredModel {
  modelId: string;
  displayName: string;
  filePath: string;
  supportedClasses: string[];
  modelVersion: string;
  confidenceThreshold: number;
  device: string;
  isAvailable: boolean;
  isSpecialized: boolean;
  specializationNotes: string;
  healthStatus: string;
}

export interface ApiAdaptiveAnalysisResult {
  pipelineRunId: string;
  status: string;
  classification: ApiClassification;
  workflow: ApiDisasterWorkflow;
  secondaryWorkflows: { workflowId: string; category: string; displayName: string }[];
  modelExecution: {
    primaryModel: string;
    modelDisplayName: string;
    isUsingFallback: boolean;
    missingCapabilities: { modelId: string; missingFeature: string; mitigation: string }[];
    detectionsCount: number;
    peopleDetected: number;
    vehiclesDetected: number;
    obstaclesDetected: number;
    detections: ApiDetection[];
    annotatedImageUrl: string;
  };
  weather: {
    available: boolean;
    reason?: string;
    temperatureC?: number | null;
    humidityPct?: number | null;
    precipitationMm?: number | null;
    rainMm?: number | null;
    windSpeedKmh?: number | null;
    windDirectionDeg?: number | null;
    windGustsKmh?: number | null;
    condition?: string;
    riskImpact?: string;
  };
  severityAssessment: {
    score: number;
    severityLevel: string;
    isPreliminary: boolean;
    rubricApplied: string;
    factors: { factor: string; impact: string; detail: string }[];
    disclaimer: string;
  };
  downstreamSynchronization: {
    incidentId?: string | null;
    incidentTitle?: string | null;
    analysisId?: string | null;
    dispatchedTasksCount: number;
    dispatchedTasks: { id: string; title: string; team: string; priority: string }[];
    reportPdfUrl?: string | null;
  };
  humanVerificationNeeded: boolean;
  verificationPrompts: string[];
}

export interface ApiTask {
  id: number;
  taskId: string;
  incidentId: number | null;
  title: string;
  description: string;
  taskType: string;
  priority: string;
  status: string;
  assignedTeam: string;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface ApiBlockage {
  id: number;
  blockageId: string;
  incidentId: number | null;
  title: string;
  description: string;
  blockageType: string;
  severity: string;
  status: string;
  latitude: number;
  longitude: number;
  locationName: string;
  reportedAt: string;
  verifiedAt: string | null;
  clearedAt: string | null;
  estimatedClearance: string | null;
  notes: string;
}

export interface ApiTeamLocation {
  id: number;
  teamName: string;
  deviceId: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  heading: number | null;
  status: string;
  updatedAt: string;
}

export interface ApiReport {
  id: string | number;
  reportId?: string;
  incidentId: string | number | null;
  title: string;
  reportType: string;
  status: string;
  generatedBy: string;
  pdfPath: string | null;
  createdAt: string;
  summary: string;
}

export interface ApiDashboard {
  totalIncidents: number;
  activeIncidents: number;
  resolvedIncidents: number;
  totalAnalyses: number;
  totalDetections: number;
  peopleDetected: number;
  vehiclesDetected: number;
  obstaclesDetected: number;
  openTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  activeTeams: number;
  verifiedBlockages: number;
  recentIncidents?: ApiIncident[];
  recentActivity?: ApiActivity[];
}

export interface ApiActivity {
  id: number;
  activityType: string;
  description: string;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
}

export interface ApiRouteResult {
  status: string;
  distanceMeters: number;
  durationSeconds: number;
  geometry: number[][];
  hasClosureWarning: boolean;
  warningDetails: string | null;
  intersectingClosures: ApiBlockage[];
}

export interface ApiChatMessage {
  role: string;
  content: string;
}

export interface ApiChatResponse {
  reply: string;
  suggestedActions: string[];
  groundedFacts: string[];
}

export interface ApiCriticalityFactor {
  factor: string;
  weight: number;
  impact: string;
  note: string;
}

export interface ApiCriticalityResponse {
  incidentId: string;
  score: number;
  severityLevel: string;
  factors: ApiCriticalityFactor[];
  explanation: string;
  isValidated: boolean;
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════
export async function fetchDashboard(): Promise<ApiDashboard> {
  const raw = await apiFetch<object>('/api/dashboard');
  return camelize<ApiDashboard>(raw);
}

// ═══════════════════════════════════════════════════════════════
// INCIDENTS
// ═══════════════════════════════════════════════════════════════
export async function fetchIncidents(): Promise<ApiIncident[]> {
  const raw = await apiFetch<object[]>('/api/incidents');
  return camelize<ApiIncident[]>(raw);
}

export async function fetchIncident(id: number): Promise<ApiIncident> {
  const raw = await apiFetch<object>(`/api/incidents/${id}`);
  return camelize<ApiIncident>(raw);
}

export async function createIncident(data: Partial<ApiIncident>): Promise<ApiIncident> {
  const raw = await apiFetch<object>('/api/incidents', {
    method: 'POST',
    body: JSON.stringify(snakify(data)),
  });
  return camelize<ApiIncident>(raw);
}

export async function updateIncident(id: number | string, data: Partial<ApiIncident>): Promise<ApiIncident> {
  const raw = await apiFetch<object>(`/api/incidents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(snakify(data)),
  });
  return camelize<ApiIncident>(raw);
}

export async function deleteIncident(id: number): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/api/incidents/${id}`, { method: 'DELETE' });
}

// ═══════════════════════════════════════════════════════════════
// VISION / ANALYSIS
// ═══════════════════════════════════════════════════════════════
export async function analyzeImage(
  file: File,
  incidentId?: string | number | null,
  notes?: string | null,
  location?: string | null
): Promise<ApiAnalysis> {
  const form = new FormData();
  form.append('file', file);
  if (incidentId) form.append('incident_id', String(incidentId));
  if (notes) form.append('notes', notes);
  if (location) form.append('location', location);

  const res = await fetch(`${BASE}/api/vision/analyze`, { method: 'POST', body: form });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${text}`);
  }
  const raw = await res.json();
  return camelize<ApiAnalysis>(raw);
}

export async function fetchAnalyses(): Promise<ApiAnalysis[]> {
  const raw = await apiFetch<object[]>('/api/vision/analyses');
  return camelize<ApiAnalysis[]>(raw);
}

// ═══════════════════════════════════════════════════════════════
// ADAPTIVE DISASTER IDENTIFICATION & AUTOMATION PIPELINE
// ═══════════════════════════════════════════════════════════════
export async function analyzeImageAdaptive(
  file: File,
  options?: {
    notes?: string | null;
    location?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    incidentId?: string | null;
  }
): Promise<ApiAdaptiveAnalysisResult> {
  const form = new FormData();
  form.append('file', file);
  if (options?.notes) form.append('notes', options.notes);
  if (options?.location) form.append('location', options.location);
  if (options?.latitude != null) form.append('latitude', String(options.latitude));
  if (options?.longitude != null) form.append('longitude', String(options.longitude));
  if (options?.incidentId) form.append('incident_id', options.incidentId);

  const res = await fetch(`${BASE}/api/vision/adaptive-analyze`, { method: 'POST', body: form });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${text}`);
  }
  const raw = await res.json();
  return camelize<ApiAdaptiveAnalysisResult>(raw);
}

export async function fetchWorkflows(): Promise<ApiDisasterWorkflow[]> {
  const raw = await apiFetch<object[]>('/api/workflows');
  return camelize<ApiDisasterWorkflow[]>(raw);
}

export async function fetchWorkflow(idOrCategory: string): Promise<ApiDisasterWorkflow> {
  const raw = await apiFetch<object>(`/api/workflows/${idOrCategory}`);
  return camelize<ApiDisasterWorkflow>(raw);
}

export async function fetchRegisteredModels(): Promise<ApiRegisteredModel[]> {
  const raw = await apiFetch<object[]>('/api/models');
  return camelize<ApiRegisteredModel[]>(raw);
}

// ═══════════════════════════════════════════════════════════════
// TASKS
// ═══════════════════════════════════════════════════════════════
export async function fetchTasks(): Promise<ApiTask[]> {
  const raw = await apiFetch<object[]>('/api/tasks');
  return camelize<ApiTask[]>(raw);
}

export async function createTask(data: Partial<ApiTask>): Promise<ApiTask> {
  const raw = await apiFetch<object>('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(snakify(data)),
  });
  return camelize<ApiTask>(raw);
}

export async function updateTask(id: number | string, data: Partial<ApiTask>): Promise<ApiTask> {
  const raw = await apiFetch<object>(`/api/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(snakify(data)),
  });
  return camelize<ApiTask>(raw);
}

export async function deleteTask(id: number | string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/api/tasks/${id}`, { method: 'DELETE' });
}

// ═══════════════════════════════════════════════════════════════
// ROAD BLOCKAGES  (backend route: /api/road-blockages)
// ═══════════════════════════════════════════════════════════════
export async function fetchBlockages(): Promise<ApiBlockage[]> {
  const raw = await apiFetch<object[]>('/api/road-blockages');
  return camelize<ApiBlockage[]>(raw);
}

export async function createBlockage(data: Partial<ApiBlockage>): Promise<ApiBlockage> {
  const raw = await apiFetch<object>('/api/road-blockages', {
    method: 'POST',
    body: JSON.stringify(snakify(data)),
  });
  return camelize<ApiBlockage>(raw);
}

export async function updateBlockage(id: number | string, data: Partial<ApiBlockage>): Promise<ApiBlockage> {
  const raw = await apiFetch<object>(`/api/road-blockages/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(snakify(data)),
  });
  return camelize<ApiBlockage>(raw);
}

export async function deleteBlockage(id: number | string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/api/road-blockages/${id}`, { method: 'DELETE' });
}

// ═══════════════════════════════════════════════════════════════
// TEAM GPS LOCATIONS
// ═══════════════════════════════════════════════════════════════
export async function fetchTeamLocations(): Promise<ApiTeamLocation[]> {
  const raw = await apiFetch<object[]>('/api/teams/locations');
  return camelize<ApiTeamLocation[]>(raw);
}

export async function postTeamLocation(data: {
  teamName: string;
  deviceId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  status?: string;
}): Promise<ApiTeamLocation> {
  const raw = await apiFetch<object>('/api/teams/location', {
    method: 'POST',
    body: JSON.stringify(snakify(data)),
  });
  return camelize<ApiTeamLocation>(raw);
}

// ═══════════════════════════════════════════════════════════════
// ROUTING
// ═══════════════════════════════════════════════════════════════
export async function calculateRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number
): Promise<ApiRouteResult> {
  const raw = await apiFetch<object>('/api/routing', {
    method: 'POST',
    body: JSON.stringify({
      start_lat: startLat,
      start_lng: startLng,
      end_lat: endLat,
      end_lng: endLng,
    }),
  });
  return camelize<ApiRouteResult>(raw);
}

// ═══════════════════════════════════════════════════════════════
// AI ASSISTANT
// ═══════════════════════════════════════════════════════════════
export async function chatWithAssistant(
  message: string,
  history: ApiChatMessage[] = [],
  incidentId?: string | number
): Promise<ApiChatResponse> {
  const raw = await apiFetch<object>('/api/assistant/chat', {
    method: 'POST',
    body: JSON.stringify({
      message,
      incident_id: incidentId ? String(incidentId) : null,
      history,
    }),
  });
  return camelize<ApiChatResponse>(raw);
}

export async function computeCriticalityScore(
  incidentId: string | number
): Promise<ApiCriticalityResponse> {
  const raw = await apiFetch<object>('/api/assistant/score', {
    method: 'POST',
    body: JSON.stringify({ incident_id: String(incidentId) }),
  });
  return camelize<ApiCriticalityResponse>(raw);
}

// ═══════════════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════════════
export async function fetchReports(): Promise<ApiReport[]> {
  const raw = await apiFetch<object[]>('/api/reports');
  return camelize<ApiReport[]>(raw);
}

export async function createReport(data: {
  incidentId?: string | number;
  title: string;
  reportType: string;
  generatedBy?: string;
  summary?: string;
}): Promise<ApiReport> {
  const raw = await apiFetch<object>('/api/reports', {
    method: 'POST',
    body: JSON.stringify(snakify(data)),
  });
  return camelize<ApiReport>(raw);
}

export function getReportPdfUrl(reportId: string): string {
  return `${BASE}/api/reports/${reportId}/pdf`;
}

export async function fetchHealth(): Promise<{
  status: string;
  geminiAvailable: boolean;
  visionModel: string;
}> {
  const raw = await apiFetch<object>('/api/health');
  return camelize(raw);
}

// ═══════════════════════════════════════════════════════════════
// CHECKBOX-DRIVEN GUIDED AI WORKFLOW
// ═══════════════════════════════════════════════════════════════
export interface ApiWorkflowSession {
  id: string;
  incidentId?: string | null;
  analysisId?: string | null;
  reportId?: string | null;
  currentStep: number;
  status: string;
  fileName: string;
  imagePath: string;
  annotatedImagePath?: string | null;
  classificationJson?: string | null;
  detectionsJson?: string | null;
  weatherJson?: string | null;
  severityJson?: string | null;
  reviewJson?: string | null;
  locationJson?: string | null;
  recommendationsJson?: string | null;
  dispatchedTasksJson?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function startGuidedWorkflow(file: File): Promise<ApiWorkflowSession> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}/api/workflow/start`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${text}`);
  }
  const raw = await res.json();
  return camelize<ApiWorkflowSession>(raw);
}

export async function fetchWorkflowSession(sessionId: string): Promise<ApiWorkflowSession> {
  const raw = await apiFetch<object>(`/api/workflow/sessions/${sessionId}`);
  return camelize<ApiWorkflowSession>(raw);
}

export async function approveWorkflowReview(
  sessionId: string,
  params: {
    disasterType?: string;
    severity?: string;
    confirmedCheckboxes?: Record<string, boolean>;
  }
): Promise<ApiWorkflowSession> {
  const raw = await apiFetch<object>(`/api/workflow/sessions/${sessionId}/approve-review`, {
    method: 'POST',
    body: JSON.stringify(snakify(params)),
  });
  return camelize<ApiWorkflowSession>(raw);
}

export async function setWorkflowLocation(
  sessionId: string,
  params: {
    latitude?: number | null;
    longitude?: number | null;
    locationName?: string | null;
    isUnknown?: boolean;
  }
): Promise<ApiWorkflowSession> {
  const raw = await apiFetch<object>(`/api/workflow/sessions/${sessionId}/set-location`, {
    method: 'POST',
    body: JSON.stringify(snakify(params)),
  });
  return camelize<ApiWorkflowSession>(raw);
}

export async function approveWorkflowRecommendations(
  sessionId: string,
  approvedTasks: Array<{
    title: string;
    description: string;
    assignedTeam: string;
    priority: string;
  }>
): Promise<ApiWorkflowSession> {
  const raw = await apiFetch<object>(`/api/workflow/sessions/${sessionId}/approve-recommendations`, {
    method: 'POST',
    body: JSON.stringify({
      approved_tasks: approvedTasks.map(t => snakify(t)),
    }),
  });
  return camelize<ApiWorkflowSession>(raw);
}

