// ============================================================
// LIVE TRACK — Utility helpers
// ============================================================
import { Priority, IncidentStatus, TaskStatus } from './types';

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function priorityColor(p: Priority): string {
  switch (p) {
    case 'Critical': return 'bg-[#EF4444] text-black font-black border-2 border-black shadow-[2px_2px_0px_#000]';
    case 'High': return 'bg-[#F47B20] text-black font-black border-2 border-black shadow-[2px_2px_0px_#000]';
    case 'Medium': return 'bg-[#FACC15] text-black font-black border-2 border-black shadow-[2px_2px_0px_#000]';
    case 'Low': return 'bg-[#94A3B8] text-black font-bold border-2 border-black shadow-[2px_2px_0px_#000]';
  }
}

export function priorityDot(p: Priority): string {
  switch (p) {
    case 'Critical': return 'bg-black';
    case 'High': return 'bg-black';
    case 'Medium': return 'bg-black';
    case 'Low': return 'bg-black';
  }
}

export function incidentStatusColor(s: IncidentStatus): string {
  switch (s) {
    case 'Reported': return 'bg-[#E2E8F0] text-black font-bold border-2 border-black shadow-[2px_2px_0px_#000]';
    case 'Under Investigation': return 'bg-[#38BDF8] text-black font-bold border-2 border-black shadow-[2px_2px_0px_#000]';
    case 'Response In Progress': return 'bg-[#FB923C] text-black font-black border-2 border-black shadow-[2px_2px_0px_#000]';
    case 'Resolved': return 'bg-[#4ADE80] text-black font-bold border-2 border-black shadow-[2px_2px_0px_#000]';
    case 'Closed': return 'bg-[#A1A1AA] text-black font-bold border-2 border-black shadow-[2px_2px_0px_#000]';
  }
}

export function taskStatusColor(s: TaskStatus): string {
  switch (s) {
    case 'Pending': return 'bg-[#E2E8F0] text-black font-bold border-2 border-black shadow-[2px_2px_0px_#000]';
    case 'In Progress': return 'bg-[#60A5FA] text-black font-bold border-2 border-black shadow-[2px_2px_0px_#000]';
    case 'Blocked': return 'bg-[#F87171] text-black font-black border-2 border-black shadow-[2px_2px_0px_#000]';
    case 'Completed': return 'bg-[#4ADE80] text-black font-bold border-2 border-black shadow-[2px_2px_0px_#000]';
  }
}

export function markerColor(p: Priority): string {
  switch (p) {
    case 'Critical': return '#EF4444';
    case 'High': return '#F47B20';
    case 'Medium': return '#EAB308';
    case 'Low': return '#64748B';
  }
}

export function truncate(s: string, max = 60): string {
  return s.length > max ? s.slice(0, max) + '…' : s;
}

export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
