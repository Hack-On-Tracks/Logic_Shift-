'use client';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import {
  AlertTriangle, Activity, ScanSearch, Users, Car, Construction,
  ClipboardList, CheckCircle2, Plus, Map, FileText,
} from 'lucide-react';
import StatCard from '@/components/ui/StatCard';
import PriorityBadge from '@/components/ui/PriorityBadge';
import { IncidentStatusBadge } from '@/components/ui/StatusBadge';
import { timeAgo, truncate } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { useMemo } from 'react';

export default function DashboardPage() {
  const { incidents, analyses, tasks } = useApp();

  const stats = useMemo(() => {
    const totalIncidents = incidents.length;
    const activeIncidents = incidents.filter(i =>
      ['Reported', 'Under Investigation', 'Response In Progress'].includes(i.status)
    ).length;
    const totalDetections = analyses.flatMap(a => a.detections);
    const people = totalDetections.filter(d => d.className === 'Person').length;
    const vehicles = totalDetections.filter(d => d.className === 'Vehicle').length;
    const obstacles = totalDetections.filter(d => d.className === 'Obstacle').length;
    const openTasks = tasks.filter(t => t.status !== 'Completed').length;
    const completedTasks = tasks.filter(t => t.status === 'Completed').length;
    return { totalIncidents, activeIncidents, totalAnalyses: analyses.length, people, vehicles, obstacles, openTasks, completedTasks };
  }, [incidents, analyses, tasks]);

  const recentIncidents = useMemo(() => [...incidents].sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()).slice(0, 5), [incidents]);

  const activityItems = useMemo(() => {
    const items: { time: string; text: string; type: string }[] = [];
    incidents.slice(0, 4).forEach(i => items.push({ time: i.reportedAt, text: `INCIDENT LOGGED // "${truncate(i.title, 36)}"`, type: 'incident' }));
    tasks.filter(t => t.status === 'Completed').slice(0, 3).forEach(t => items.push({ time: t.dueDate ?? t.startDate ?? '', text: `DIRECTIVE CLOSED // "${truncate(t.title, 36)}"`, type: 'task' }));
    return items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 6);
  }, [incidents, tasks]);

  const disasterChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    incidents.forEach(i => { counts[i.disasterType] = (counts[i.disasterType] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name: name.replace(' ', '\n'), value }));
  }, [incidents]);

  const COLORS = ['#EF4444', '#F47B20', '#FACC15', '#38BDF8', '#C084FC', '#4ADE80', '#94A3B8'];

  const priorityCounts = useMemo(() => ({
    Critical: incidents.filter(i => i.priority === 'Critical').length,
    High: incidents.filter(i => i.priority === 'High').length,
    Medium: incidents.filter(i => i.priority === 'Medium').length,
    Low: incidents.filter(i => i.priority === 'Low').length,
  }), [incidents]);

  return (
    <div className="space-y-6">
      {/* Demo status banner */}
      <div className="flex items-center gap-3 bg-[#F47B20] text-black border-2 border-black p-3.5 shadow-[4px_4px_0px_#000]">
        <Activity size={18} className="stroke-[3] flex-shrink-0" />
        <p className="text-xs font-mono font-black uppercase tracking-wider">
          TACTICAL DEMO MODE ACTIVE // ALL INCIDENT TELEMETRY AND VISION DATA GENERATED LOCALLY
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="TOTAL INCIDENTS" value={stats.totalIncidents} icon={AlertTriangle} color="text-black" iconBg="bg-[#F47B20]" />
        <StatCard label="ACTIVE THREATS" value={stats.activeIncidents} icon={Activity} color="text-black" iconBg="bg-[#EF4444]" />
        <StatCard label="SURVEY IMAGES" value={stats.totalAnalyses} icon={ScanSearch} color="text-black" iconBg="bg-[#38BDF8]" />
        <StatCard label="VICTIMS FOUND" value={stats.people} icon={Users} color="text-black" iconBg="bg-[#4ADE80]" subtitle="CV DEMO" />
        <StatCard label="VEHICLES SPOTTED" value={stats.vehicles} icon={Car} color="text-black" iconBg="bg-[#C084FC]" subtitle="CV DEMO" />
        <StatCard label="ROAD OBSTACLES" value={stats.obstacles} icon={Construction} color="text-black" iconBg="bg-[#FACC15]" subtitle="CV DEMO" />
        <StatCard label="DISPATCH TICKETS" value={stats.openTasks} icon={ClipboardList} color="text-black" iconBg="bg-[#FB923C]" />
        <StatCard label="TASKS RESOLVED" value={stats.completedTasks} icon={CheckCircle2} color="text-black" iconBg="bg-[#4ADE80]" />
      </div>

      {/* Quick Action Buttons */}
      <div>
        <h2 className="text-white font-mono font-black text-xs uppercase tracking-wider mb-2.5">[MISSION SHORTCUTS]</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/incidents"
            className="flex items-center gap-2 px-4 py-2.5 bg-[#F47B20] hover:bg-[#FFA154] text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all font-mono"
          >
            <Plus size={15} className="stroke-[3]" /> LOG INCIDENT
          </Link>
          <Link
            href="/analysis"
            className="flex items-center gap-2 px-4 py-2.5 bg-[#111C2E] hover:bg-white/10 text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all font-mono"
          >
            <ScanSearch size={15} /> RUN AI VISION
          </Link>
          <Link
            href="/map"
            className="flex items-center gap-2 px-4 py-2.5 bg-[#111C2E] hover:bg-white/10 text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all font-mono"
          >
            <Map size={15} /> TACTICAL MAP
          </Link>
          <Link
            href="/tasks"
            className="flex items-center gap-2 px-4 py-2.5 bg-[#111C2E] hover:bg-white/10 text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all font-mono"
          >
            <ClipboardList size={15} /> DISPATCH TASK
          </Link>
          <Link
            href="/reports"
            className="flex items-center gap-2 px-4 py-2.5 bg-[#111C2E] hover:bg-white/10 text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all font-mono"
          >
            <FileText size={15} /> GENERATE REPORT
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Incidents Table */}
        <div className="lg:col-span-2 bg-[#111C2E] border-3 border-black shadow-[6px_6px_0px_#000] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 bg-[#0B1220] border-b-2 border-black">
            <h2 className="text-white font-black text-xs font-mono uppercase tracking-wider">RECENT INCIDENT FEED</h2>
            <Link href="/incidents" className="text-[#F47B20] text-xs font-mono font-bold uppercase hover:underline">VIEW ALL &gt;</Link>
          </div>
          <div className="overflow-x-auto">
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
                {recentIncidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-white/5 transition">
                    <td className="px-5 py-3 text-[#F47B20] text-xs font-black">{inc.id}</td>
                    <td className="px-5 py-3">
                      <p className="text-white text-xs font-black">{truncate(inc.title, 38)}</p>
                      <p className="text-slate-400 text-[11px] mt-0.5">{inc.disasterType} · {timeAgo(inc.reportedAt)}</p>
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell"><PriorityBadge priority={inc.priority} /></td>
                    <td className="px-5 py-3"><IncidentStatusBadge status={inc.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Priority Breakdown */}
          <div className="bg-[#111C2E] border-3 border-black shadow-[6px_6px_0px_#000] p-5">
            <h2 className="text-white font-black text-xs font-mono uppercase tracking-wider mb-4 pb-2 border-b-2 border-black">
              PRIORITY SEVERITY
            </h2>
            <div className="space-y-3 font-mono">
              {([['Critical', 'bg-[#EF4444]', '#EF4444'], ['High', 'bg-[#F47B20]', '#F47B20'], ['Medium', 'bg-[#FACC15]', '#FACC15'], ['Low', 'bg-[#94A3B8]', '#94A3B8']] as const).map(([p, color]) => (
                <div key={p} className="flex items-center gap-3">
                  <div className={`w-3.5 h-3.5 border border-black ${color} flex-shrink-0`} />
                  <span className="text-white text-xs font-bold uppercase flex-1">{p}</span>
                  <div className="flex-1 h-3 bg-black border border-white/20 overflow-hidden">
                    <div className={`h-full ${color}`} style={{ width: `${stats.totalIncidents ? (priorityCounts[p] / stats.totalIncidents) * 100 : 0}%` }} />
                  </div>
                  <span className="text-white text-xs font-black w-5 text-right">{priorityCounts[p]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Directives by Status */}
          <div className="bg-[#111C2E] border-3 border-black shadow-[6px_6px_0px_#000] p-5">
            <h2 className="text-white font-black text-xs font-mono uppercase tracking-wider mb-4 pb-2 border-b-2 border-black">
              DIRECTIVE STATUS
            </h2>
            <div className="space-y-2.5 font-mono">
              {(['Pending', 'In Progress', 'Blocked', 'Completed'] as const).map(s => {
                const count = tasks.filter(t => t.status === s).length;
                const colors: Record<string, string> = { Pending: 'bg-slate-300', 'In Progress': 'bg-[#60A5FA]', Blocked: 'bg-[#F87171]', Completed: 'bg-[#4ADE80]' };
                return (
                  <div key={s} className="flex items-center justify-between border-b border-black/40 pb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 border border-black ${colors[s]}`} />
                      <span className="text-slate-300 text-xs font-bold uppercase">{s}</span>
                    </div>
                    <span className="text-white text-xs font-black bg-black px-2 py-0.5 border border-white/20">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Chart + Dispatch Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-mono">
        {/* Disaster Type Chart */}
        <div className="bg-[#111C2E] border-3 border-black shadow-[6px_6px_0px_#000] p-5">
          <h2 className="text-white font-black text-xs uppercase tracking-wider mb-4 pb-2 border-b-2 border-black">
            INCIDENT TAXONOMY
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={disasterChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'monospace' }} axisLine={{ stroke: '#000', strokeWidth: 2 }} tickLine={false} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 10, fontFamily: 'monospace' }} axisLine={{ stroke: '#000', strokeWidth: 2 }} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#0B1220', border: '2px solid #000', color: '#FFFFFF', boxShadow: '3px 3px 0px #000', fontFamily: 'monospace', fontSize: '11px' }}
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              />
              <Bar dataKey="value" stroke="#000" strokeWidth={2}>
                {disasterChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Live Dispatch Feed */}
        <div className="bg-[#111C2E] border-3 border-black shadow-[6px_6px_0px_#000] p-5">
          <h2 className="text-white font-black text-xs uppercase tracking-wider mb-4 pb-2 border-b-2 border-black">
            DISPATCH LOG TRAIL
          </h2>
          <div className="space-y-3">
            {activityItems.map((item, i) => (
              <div key={i} className="flex gap-3 items-start border-l-3 border-[#F47B20] pl-3 py-1 bg-black/40">
                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 text-xs font-black">{item.text}</p>
                  {item.time && <p className="text-[#F47B20] text-[10px] mt-0.5 tracking-wider">{timeAgo(item.time)}</p>}
                </div>
              </div>
            ))}
            {activityItems.length === 0 && <p className="text-slate-400 text-xs">NO DISPATCH EVENTS.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
