'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import {
  Incident,
  ImageAnalysis,
  RescueTask,
  Report,
  Notification,
  AppSettings,
} from '@/lib/types';
import {
  initializeStorage,
  resetStorage,
  getIncidents,
  saveIncidents,
  getAnalyses,
  saveAnalyses,
  getTasks,
  saveTasks,
  getReports,
  saveReports,
  getNotifications,
  saveNotifications,
  getSettings,
  saveSettings,
  generateId,
} from '@/lib/storage';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}

interface AppContextValue {
  incidents: Incident[];
  analyses: ImageAnalysis[];
  tasks: RescueTask[];
  reports: Report[];
  notifications: Notification[];
  settings: AppSettings;
  toasts: ToastMessage[];

  // Incident actions
  addIncident: (inc: Omit<Incident, 'id'>) => void;
  updateIncident: (inc: Incident) => void;
  deleteIncident: (id: string) => void;

  // Analysis actions
  addAnalysis: (ana: Omit<ImageAnalysis, 'id'>) => void;
  updateAnalysis: (ana: ImageAnalysis) => void;
  deleteAnalysis: (id: string) => void;

  // Task actions
  addTask: (task: Omit<RescueTask, 'id'>) => void;
  updateTask: (task: RescueTask) => void;
  deleteTask: (id: string) => void;

  // Report actions
  addReport: (report: Omit<Report, 'id'>) => void;
  deleteReport: (id: string) => void;

  // Notification actions
  markNotificationRead: (id: string) => void;
  clearAllNotifications: () => void;

  // Settings
  updateSettings: (s: Partial<AppSettings>) => void;

  // UI
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;
  resetDemoData: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [analyses, setAnalyses] = useState<ImageAnalysis[]>([]);
  const [tasks, setTasks] = useState<RescueTask[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    theme: 'dark',
    notificationsEnabled: true,
    soundEnabled: false,
    autoSaveEnabled: true,
  });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      initializeStorage();
      setIncidents(getIncidents());
      setAnalyses(getAnalyses());
      setTasks(getTasks());
      setReports(getReports());
      setNotifications(getNotifications());
      setSettings(getSettings());
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const showToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = generateId('toast');
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Incidents ──────────────────────────────────────────────
  const addIncident = useCallback((inc: Omit<Incident, 'id'>) => {
    const newInc: Incident = { ...inc, id: generateId('INC') };
    setIncidents((prev) => {
      const next = [newInc, ...prev];
      saveIncidents(next);
      return next;
    });
  }, []);

  const updateIncident = useCallback((inc: Incident) => {
    setIncidents((prev) => {
      const next = prev.map((i) => (i.id === inc.id ? inc : i));
      saveIncidents(next);
      return next;
    });
  }, []);

  const deleteIncident = useCallback((id: string) => {
    setIncidents((prev) => {
      const next = prev.filter((i) => i.id !== id);
      saveIncidents(next);
      return next;
    });
  }, []);

  // ── Analyses ───────────────────────────────────────────────
  const addAnalysis = useCallback((ana: Omit<ImageAnalysis, 'id'>) => {
    const newAna: ImageAnalysis = { ...ana, id: generateId('ANA') };
    setAnalyses((prev) => {
      const next = [newAna, ...prev];
      saveAnalyses(next);
      return next;
    });
  }, []);

  const updateAnalysis = useCallback((ana: ImageAnalysis) => {
    setAnalyses((prev) => {
      const next = prev.map((a) => (a.id === ana.id ? ana : a));
      saveAnalyses(next);
      return next;
    });
  }, []);

  const deleteAnalysis = useCallback((id: string) => {
    setAnalyses((prev) => {
      const next = prev.filter((a) => a.id !== id);
      saveAnalyses(next);
      return next;
    });
  }, []);

  // ── Tasks ──────────────────────────────────────────────────
  const addTask = useCallback((task: Omit<RescueTask, 'id'>) => {
    const newTask: RescueTask = { ...task, id: generateId('TSK') };
    setTasks((prev) => {
      const next = [newTask, ...prev];
      saveTasks(next);
      return next;
    });
  }, []);

  const updateTask = useCallback((task: RescueTask) => {
    setTasks((prev) => {
      const next = prev.map((t) => (t.id === task.id ? task : t));
      saveTasks(next);
      return next;
    });
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => {
      const next = prev.filter((t) => t.id !== id);
      saveTasks(next);
      return next;
    });
  }, []);

  // ── Reports ────────────────────────────────────────────────
  const addReport = useCallback((report: Omit<Report, 'id'>) => {
    const newReport: Report = { ...report, id: generateId('RPT') };
    setReports((prev) => {
      const next = [newReport, ...prev];
      saveReports(next);
      return next;
    });
  }, []);

  const deleteReport = useCallback((id: string) => {
    setReports((prev) => {
      const next = prev.filter((r) => r.id !== id);
      saveReports(next);
      return next;
    });
  }, []);

  // ── Notifications ──────────────────────────────────────────
  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      saveNotifications(next);
      return next;
    });
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      saveNotifications(next);
      return next;
    });
  }, []);

  // ── Settings ───────────────────────────────────────────────
  const updateSettings = useCallback((s: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...s };
      saveSettings(next);
      return next;
    });
  }, []);

  // ── Reset ──────────────────────────────────────────────────
  const resetDemoData = useCallback(() => {
    resetStorage();
    initializeStorage();
    setIncidents(getIncidents());
    setAnalyses(getAnalyses());
    setTasks(getTasks());
    setReports(getReports());
    setNotifications(getNotifications());
    setSettings(getSettings());
    showToast({ type: 'success', title: 'Demo data reset', message: 'All data restored to defaults.' });
  }, [showToast]);

  return (
    <AppContext.Provider
      value={{
        incidents,
        analyses,
        tasks,
        reports,
        notifications,
        settings,
        toasts,
        addIncident,
        updateIncident,
        deleteIncident,
        addAnalysis,
        updateAnalysis,
        deleteAnalysis,
        addTask,
        updateTask,
        deleteTask,
        addReport,
        deleteReport,
        markNotificationRead,
        clearAllNotifications,
        updateSettings,
        showToast,
        dismissToast,
        resetDemoData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
