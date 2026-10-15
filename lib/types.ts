// ============================================================
// LIVE TRACK by Logic Shift — TypeScript Data Models
// ============================================================

export type DisasterType =
  | 'Flood'
  | 'Earthquake'
  | 'Fire'
  | 'Landslide'
  | 'Storm'
  | 'Infrastructure Damage'
  | 'Other Emergency';

export type Priority = 'Critical' | 'High' | 'Medium' | 'Low';

export type IncidentStatus =
  | 'Reported'
  | 'Under Investigation'
  | 'Response In Progress'
  | 'Resolved'
  | 'Closed';

export type TaskStatus = 'Pending' | 'In Progress' | 'Blocked' | 'Completed';

export type AnalysisStatus =
  | 'not_analyzed'
  | 'pending'
  | 'completed'
  | 'failed';

export interface Incident {
  id: string;
  title: string;
  disasterType: DisasterType;
  description: string;
  locationName: string;
  latitude?: number;
  longitude?: number;
  priority: Priority;
  status: IncidentStatus;
  reportedAt: string; // ISO string
  assignedTeam: string;
  notes?: string;
}

export interface Detection {
  id: string;
  className: 'Person' | 'Vehicle' | 'Obstacle';
  confidence: number; // 0–1
  boundingBox: { x: number; y: number; width: number; height: number };
}

export interface ImageAnalysis {
  id: string;
  incidentId: string;
  fileName: string;
  originalImagePreview?: string; // object URL or data URL
  annotatedImagePreview?: string;
  uploadedAt: string;
  analysisStatus: AnalysisStatus;
  isDemoResult: boolean;
  detections: Detection[];
  notes?: string;
  location?: string;
}

export interface RescueTask {
  id: string;
  title: string;
  description: string;
  incidentId: string;
  assignedTeam: string;
  priority: Priority;
  status: TaskStatus;
  startDate?: string;
  dueDate?: string;
  notes?: string;
}

export interface Report {
  id: string;
  incidentId: string;
  createdAt: string;
  analysisSummary: {
    totalImages: number;
    peopleDetected: number;
    vehiclesDetected: number;
    obstaclesDetected: number;
  };
  taskSummary: {
    openTasks: number;
    completedTasks: number;
  };
  isDemoResult: boolean;
  notes?: string;
}

export interface Responder {
  id: string;
  name: string;
  role: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
}

export interface AppSettings {
  theme: 'dark' | 'light';
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  autoSaveEnabled: boolean;
}
