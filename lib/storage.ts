// ============================================================
// LIVE TRACK — localStorage Helpers
// ============================================================
import {
  Incident,
  ImageAnalysis,
  RescueTask,
  Report,
  Notification,
  AppSettings,
} from './types';
import {
  SEED_INCIDENTS,
  SEED_ANALYSES,
  SEED_TASKS,
  SEED_REPORTS,
  SEED_NOTIFICATIONS,
} from './mockData';

const KEYS = {
  incidents: 'lt_incidents',
  analyses: 'lt_analyses',
  tasks: 'lt_tasks',
  reports: 'lt_reports',
  notifications: 'lt_notifications',
  settings: 'lt_settings',
  initialized: 'lt_initialized',
};

function read<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota errors in prototype
  }
}

export function initializeStorage(): void {
  if (read<boolean>(KEYS.initialized)) return;
  write(KEYS.incidents, SEED_INCIDENTS);
  write(KEYS.analyses, SEED_ANALYSES);
  write(KEYS.tasks, SEED_TASKS);
  write(KEYS.reports, SEED_REPORTS);
  write(KEYS.notifications, SEED_NOTIFICATIONS);
  write(KEYS.settings, defaultSettings());
  write(KEYS.initialized, true);
}

export function resetStorage(): void {
  if (typeof window === 'undefined') return;
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
}

function defaultSettings(): AppSettings {
  return {
    theme: 'dark',
    notificationsEnabled: true,
    soundEnabled: false,
    autoSaveEnabled: true,
  };
}

// ── Incidents ────────────────────────────────────────────────
export function getIncidents(): Incident[] {
  return read<Incident[]>(KEYS.incidents) ?? SEED_INCIDENTS;
}
export function saveIncidents(incidents: Incident[]): void {
  write(KEYS.incidents, incidents);
}

// ── Analyses ─────────────────────────────────────────────────
export function getAnalyses(): ImageAnalysis[] {
  return read<ImageAnalysis[]>(KEYS.analyses) ?? SEED_ANALYSES;
}
export function saveAnalyses(analyses: ImageAnalysis[]): void {
  write(KEYS.analyses, analyses);
}

// ── Tasks ────────────────────────────────────────────────────
export function getTasks(): RescueTask[] {
  return read<RescueTask[]>(KEYS.tasks) ?? SEED_TASKS;
}
export function saveTasks(tasks: RescueTask[]): void {
  write(KEYS.tasks, tasks);
}

// ── Reports ──────────────────────────────────────────────────
export function getReports(): Report[] {
  return read<Report[]>(KEYS.reports) ?? SEED_REPORTS;
}
export function saveReports(reports: Report[]): void {
  write(KEYS.reports, reports);
}

// ── Notifications ────────────────────────────────────────────
export function getNotifications(): Notification[] {
  return read<Notification[]>(KEYS.notifications) ?? SEED_NOTIFICATIONS;
}
export function saveNotifications(notifications: Notification[]): void {
  write(KEYS.notifications, notifications);
}

// ── Settings ─────────────────────────────────────────────────
export function getSettings(): AppSettings {
  return read<AppSettings>(KEYS.settings) ?? defaultSettings();
}
export function saveSettings(settings: AppSettings): void {
  write(KEYS.settings, settings);
}

// ── ID generators ────────────────────────────────────────────
export function generateId(prefix: string): string {
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${num}`;
}
