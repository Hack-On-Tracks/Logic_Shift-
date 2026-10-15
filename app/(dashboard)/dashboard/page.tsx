'use client';
import Link from 'next/link';
import {
  AlertTriangle, Activity, ScanSearch, Users, Car, Construction,
  ClipboardList, CheckCircle2, Plus, Map, FileText,
  RefreshCw, Wifi, WifiOff, Loader2,
} from 'lucide-react';
import StatCard from '@/components/ui/StatCard';
import PriorityBadge from '@/components/ui/PriorityBadge';
import { IncidentStatusBadge } from '@/components/ui/StatusBadge';
import { timeAgo, truncate, cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { fetchDashboard, fetchIncidents, ApiDashboard } from '@/lib/api';
import { Priority, IncidentStatus } from '@/lib/types';

const COLORS = ['#EF4444', '#2563EB', '#FFFFFF', '#38BDF8', '#818CF8', '#4ADE80', '#94A3B8'];

// Map backend incident to display types
function mapPriority(severity: string): Priority {
  const s = severity?.toLowerCase();
  if (s === 'critical') return 'Critical';
  if (s === 'high') return 'High';
  if (s === 'low') return 'Low';
  return 'Medium';
}
function mapStatus(status: string): IncidentStatus {
  if (status === 'In Progress' || status === 'Response In Progress') return 'Response In Progress';
  if (status === 'Resolved') return 'Resolved';
  if (status === 'Closed') return 'Closed';
  if (status === 'Under Investigation') return 'Under Investigation';
  return 'Reported';
}

export default function DashboardPage() {
  const [data, setData] = useState<ApiDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const d = await fetchDashboard();
      if (!d.recentIncidents) {
        try {
          const incs = await fetchIncidents();
          d.recentIncidents = incs.slice(0, 5);
        } catch {
          // Gracefully omit if incidents endpoint is unavailable
        }
      }
      setData(d);
      setLastRefresh(new Date().toLocaleTimeString('en-IN'));
    } catch {
      setError('Backend offline — showing cached data if available');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  const disasterChartData = useMemo(() => {
    if (!data?.recentIncidents) return [];
    const counts: Record<string, number> = {};
    (data.recentIncidents ?? []).forEach(i => {
      const type = i.disasterType || 'Unknown';
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [data]);

  const priorityCounts = useMemo(() => {
    if (!data?.recentIncidents) return { Critical: 0, High: 0, Medium: 0, Low: 0 };
    const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    (data.recentIncidents ?? []).forEach(i => {
      const p = mapPriority(i.severity);
      counts[p]++;
    });
    return counts;
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div className={cn(
        'flex items-center gap-3 border-2 border-black p-3.5 shadow-[4px_4px_0px_#000]',
        error ? 'bg-[#EF4444]/10 border-[#EF4444]' : 'bg-[#2563EB] text-white'
      )}>
        {loading ? <Loader2 size={16} className="animate-spin flex-shrink-0" /> :
          error ? <WifiOff size={16} className="flex-shrink-0 text-[#EF4444]" /> :
            <Wifi size={16} className="flex-shrink-0 text-white" />}
        <p className="text-xs font-mono font-black uppercase tracking-wider flex-1">
          {loading ? 'SYNCING WITH BACKEND...' :
            error ? `BACKEND LINK ERROR — ${error}` :
              `LIVE BACKEND DATA · LAST SYNC: ${lastRefresh} · AUTO-REFRESH: 30S`}
        </p>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/30 text-[10px] font-black uppercase tracking-wider transition disabled:opacity-50 font-mono">
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> REFRESH
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="TOTAL INCIDENTS" value={data?.totalIncidents ?? '—'} icon={AlertTriangle} color="text-white" iconBg="bg-[#2563EB]" />
        <StatCard label="ACTIVE THREATS" value={data?.activeIncidents ?? '—'} icon={Activity} color="text-white" iconBg="bg-[#EF4444]" />
        <StatCard label="SURVEY IMAGES" value={data?.totalAnalyses ?? '—'} icon={ScanSearch} color="text-black" iconBg="bg-[#38BDF8]" />
        <StatCard label="VICTIMS DETECTED" value={data?.peopleDetected ?? '—'} icon={Users} color="text-black" iconBg="bg-white" subtitle="YOLO AI" />
        <StatCard label="VEHICLES SPOTTED" value={data?.vehiclesDetected ?? '—'} icon={Car} color="text-black" iconBg="bg-[#C084FC]" subtitle="YOLO AI" />
        <StatCard label="ROAD OBSTACLES" value={data?.obstaclesDetected ?? '—'} icon={Construction} color="text-white" iconBg="bg-[#EF4444]" subtitle="YOLO AI" />
        <StatCard label="DISPATCH TICKETS" value={data?.openTasks ?? '—'} icon={ClipboardList} color="text-black" iconBg="bg-[#38BDF8]" />
        <StatCard label="TASKS RESOLVED" value={data?.completedTasks ?? '—'} icon={CheckCircle2} color="text-black" iconBg="bg-white" />
      </div>

      {/* Quick Action Buttons */}
      <div>
        <h2 className="text-white font-mono font-black text-xs uppercase tracking-wider mb-2.5">[MISSION SHORTCUTS]</h2>
        <div className="flex flex-wrap gap-3">
          {[
            { href: '/incidents', icon: Plus, label: 'LOG INCIDENT', primary: true },
            { href: '/analysis', icon: ScanSearch, label: 'RUN AI VISION', primary: false },
            { href: '/map', icon: Map, label: 'TACTICAL MAP', primary: false },
            { href: '/tasks', icon: ClipboardList, label: 'DISPATCH TASK', primary: false },
            { href: '/blockages', icon: AlertTriangle, label: 'ROAD BLOCKAGES', primary: false },
            { href: '/assistant', icon: FileText, label: 'AI ASSISTANT', primary: false },
          ].map(({ href, icon: Icon, label, primary }) => (
            <Link key={href} href={href}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 font-black text-xs uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all font-mono',
                primary
                  ? 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white'
                  : 'bg-[#111C2E] hover:bg-white/10 text-white'
              )}>
              <Icon size={15} className="stroke-[3]" /> {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Incidents Table */}
        <div className="lg:col-span-2 bg-[#111C2E] border-2 border-black shadow-[6px_6px_0px_#000] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 bg-[#0B1220] border-b-2 border-black">
            <h2 className="text-white font-black text-xs font-mono uppercase tracking-wider">RECENT INCIDENT FEED</h2>
            <Link href="/incidents" className="text-[#2563EB] text-xs font-mono font-bold uppercase hover:underline">VIEW ALL &gt;</Link>
          </div>
          <div className="overflow-x-auto">
            {loading && !data ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={20} className="animate-spin text-[#2563EB]" />
              </div>
            ) : (
              <table className="w-full font-mono">
                <thead>
                  <tr className="bg-black/60 border-b-2 border-black text-slate-400 text-[10px] uppercase tracking-wider">
                    <th className="text-left px-5 py-2.5">ID</th>
                    <th className="text-left px-5 py-2.5">INCIDENT DETAILS</th>
                    <th className="text-left px-5 py-2.5 hidden md:table-cell">PRIORITY</th>
                    <th className="text-left px-5 py-2.5">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black">
                  {(data?.recentIncidents ?? []).map((inc) => (
                    <tr key={inc.id} className="hover:bg-white/5 transition">
                      <td className="px-5 py-3 text-[#2563EB] text-xs font-black">{inc.incidentId}</td>
                      <td className="px-5 py-3">
                        <p className="text-white text-xs font-black">{truncate(inc.title, 38)}</p>
                        <p className="text-slate-400 text-[11px] mt-0.5">{inc.disasterType} · {timeAgo(inc.reportedAt)}</p>
                      </td>
                      <td className="px-5 py-3 hidden md:table-cell">
                        <PriorityBadge priority={mapPriority(inc.severity)} />
                      </td>
                      <td className="px-5 py-3">
                        <IncidentStatusBadge status={mapStatus(inc.status)} />
                      </td>
                    </tr>
                  ))}
                  {(!data || (data.recentIncidents ?? []).length === 0) && (
                    <tr><td colSpan={4} className="text-center py-8 text-slate-500 text-xs">NO INCIDENTS YET</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Priority Breakdown */}
          <div className="bg-[#111C2E] border-2 border-black shadow-[6px_6px_0px_#000] p-5">
            <h2 className="text-white font-black text-xs font-mono uppercase tracking-wider mb-4 pb-2 border-b-2 border-black">
              PRIORITY SEVERITY
            </h2>
            <div className="space-y-3 font-mono">
              {([['Critical', 'bg-[#EF4444]', '#EF4444'], ['High', 'bg-[#2563EB]', '#2563EB'], ['Medium', 'bg-white', '#FFFFFF'], ['Low', 'bg-[#94A3B8]', '#94A3B8']] as const).map(([p, color, hex]) => {
                const total = data?.totalIncidents ?? 1;
                const count = priorityCounts[p] ?? 0;
                return (
                  <div key={p} className="flex items-center gap-3">
                    <div className={`w-3.5 h-3.5 border border-black ${color} flex-shrink-0`} />
                    <span className="text-white text-xs font-bold uppercase flex-1">{p}</span>
                    <div className="flex-1 h-3 bg-black border border-white/20 overflow-hidden">
                      <div className="h-full" style={{ backgroundColor: hex, width: `${total ? (count / total) * 100 : 0}%` }} />
                    </div>
                    <span className="text-white text-xs font-black w-5 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Task Status */}
          <div className="bg-[#111C2E] border-2 border-black shadow-[6px_6px_0px_#000] p-5">
            <h2 className="text-white font-black text-xs font-mono uppercase tracking-wider mb-4 pb-2 border-b-2 border-black">
              DIRECTIVE STATUS
            </h2>
            <div className="space-y-2.5 font-mono">
              {([
                ['Open', 'bg-slate-300', data?.openTasks],
                ['In Progress', 'bg-[#60A5FA]', data?.inProgressTasks],
                ['Completed', 'bg-[#4ADE80]', data?.completedTasks],
              ] as const).map(([s, cls, count]) => (
                <div key={s} className="flex items-center justify-between border-b border-black/40 pb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 border border-black ${cls}`} />
                    <span className="text-slate-300 text-xs font-bold uppercase">{s}</span>
                  </div>
                  <span className="text-white text-xs font-black bg-black px-2 py-0.5 border border-white/20">
                    {count ?? '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Chart + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-mono">
        <div className="bg-[#111C2E] border-2 border-black shadow-[6px_6px_0px_#000] p-5">
          <h2 className="text-white font-black text-xs uppercase tracking-wider mb-4 pb-2 border-b-2 border-black">
            INCIDENT TAXONOMY
          </h2>
          {disasterChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={disasterChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'monospace' }} axisLine={{ stroke: '#000', strokeWidth: 2 }} tickLine={false} />
                <YAxis tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'monospace' }} axisLine={{ stroke: '#000', strokeWidth: 2 }} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#0B1220', border: '2px solid #000', color: '#FFFFFF', boxShadow: '3px 3px 0px #000', fontFamily: 'monospace', fontSize: '11px' }} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="value" stroke="#000" strokeWidth={2}>
                  {disasterChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-slate-500 text-xs">NO DATA YET</div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="bg-[#111C2E] border-2 border-black shadow-[6px_6px_0px_#000] p-5">
          <h2 className="text-white font-black text-xs uppercase tracking-wider mb-4 pb-2 border-b-2 border-black">
            DISPATCH LOG TRAIL
          </h2>
          <div className="space-y-3">
            {(data?.recentActivity ?? []).map((act, i) => (
              <div key={i} className="flex gap-3 items-start border-l-2 border-[#2563EB] pl-3 py-1 bg-black/40">
                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 text-xs font-black uppercase">{act.description}</p>
                  <p className="text-[#2563EB] text-[10px] mt-0.5 tracking-wider">{timeAgo(act.createdAt)}</p>
                </div>
              </div>
            ))}
            {(!data || (data.recentActivity ?? []).length === 0) && (
              <p className="text-slate-500 text-xs">NO DISPATCH EVENTS.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
