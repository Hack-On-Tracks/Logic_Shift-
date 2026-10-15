'use client';
import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import {
  FileText, Search, X, Eye, Trash2, Download, Users, Car,
  Construction, ClipboardList, CheckCircle2, Info, Printer,
} from 'lucide-react';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import EmptyState from '@/components/ui/EmptyState';
import PriorityBadge from '@/components/ui/PriorityBadge';
import { IncidentStatusBadge } from '@/components/ui/StatusBadge';
import { formatDate, formatDateTime, truncate } from '@/lib/utils';
import { Report } from '@/lib/types';

function ReportPreview({ report, incident, tasks, analyses, onClose }: {
  report: Report;
  incident: ReturnType<typeof useApp>['incidents'][0] | undefined;
  tasks: ReturnType<typeof useApp>['tasks'];
  analyses: ReturnType<typeof useApp>['analyses'];
  onClose: () => void;
}) {
  const incTasks = tasks.filter(t => t.incidentId === incident?.id);
  const incAnalyses = analyses.filter(a => a.incidentId === incident?.id);

  return (
    <div className="p-6 space-y-5 font-mono">
      {/* Report header */}
      <div className="bg-[#0B1220] p-4 border-2 border-black shadow-[3px_3px_0px_#000]">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 bg-[#2563EB] border-2 border-black flex items-center justify-center">
                <FileText size={15} className="text-white stroke-[3]" />
              </div>
              <span className="text-[#2563EB] font-black text-sm uppercase tracking-wider">LIVE TRACK // INCIDENT AUDIT</span>
            </div>
            <p className="text-slate-400 text-xs">DOSSIER REF // {report.id}</p>
          </div>
          <span className="bg-black text-[#4ADE80] border border-white/20 px-2 py-0.5 text-xs font-black">
            {formatDateTime(report.createdAt)}
          </span>
        </div>
      </div>

      {report.isDemoResult && (
        <div className="flex items-start gap-2 bg-[#2563EB] text-white border-2 border-black p-3 shadow-[3px_3px_0px_#000]">
          <Info size={16} className="mt-0.5 flex-shrink-0" />
          <p className="text-xs font-black leading-snug">
            DEMO AUDIT // DETECTION TOTALS REPRESENT SAMPLE PROTOTYPE DATA STREAMS ONLY.
          </p>
        </div>
      )}

      {/* Incident summary */}
      {incident ? (
        <div className="space-y-3">
          <h3 className="text-white font-black text-xs uppercase tracking-wider pb-1 border-b-2 border-black">
            TARGET DISASTER PROFILE
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 border-2 border-black bg-black/40 p-3 shadow-[2px_2px_0px_#000]">
              <p className="text-slate-400 text-[10px] font-black uppercase mb-0.5">TARGET</p>
              <p className="text-white text-sm font-black">{incident.title}</p>
            </div>
            <div className="border-2 border-black bg-black/40 p-3 shadow-[2px_2px_0px_#000]">
              <p className="text-slate-400 text-[10px] font-black uppercase mb-0.5">SECTOR</p>
              <p className="text-white text-xs font-bold">{incident.locationName}</p>
            </div>
            <div className="border-2 border-black bg-black/40 p-3 shadow-[2px_2px_0px_#000]">
              <p className="text-slate-400 text-[10px] font-black uppercase mb-0.5">RECORDED</p>
              <p className="text-white text-xs">{formatDateTime(incident.reportedAt)}</p>
            </div>
            <div className="border-2 border-black bg-black/40 p-3 shadow-[2px_2px_0px_#000]">
              <p className="text-slate-400 text-[10px] font-black uppercase mb-0.5">TYPE</p>
              <p className="text-white text-xs font-bold">{incident.disasterType}</p>
            </div>
            <div className="border-2 border-black bg-black/40 p-3 shadow-[2px_2px_0px_#000]">
              <p className="text-slate-400 text-[10px] font-black uppercase mb-0.5">CORPS</p>
              <p className="text-[#2563EB] text-xs font-black">{incident.assignedTeam}</p>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <PriorityBadge priority={incident.priority} />
            <IncidentStatusBadge status={incident.status} />
          </div>
        </div>
      ) : (
        <p className="text-slate-400 text-sm">TARGET RECORD MISSING.</p>
      )}

      {/* Image analysis summary */}
      <div>
        <h3 className="text-white font-black text-xs uppercase tracking-wider mb-3 pb-1 border-b-2 border-black">
          AERIAL VISION DISCOVERY METRICS
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#4ADE80] text-black border-2 border-black p-3 text-center shadow-[3px_3px_0px_#000]">
            <Users size={18} className="mx-auto mb-1 stroke-[2.5]" />
            <p className="text-2xl font-black">{report.analysisSummary.peopleDetected}</p>
            <p className="text-[10px] font-black uppercase tracking-wider">VICTIMS</p>
          </div>
          <div className="bg-[#38BDF8] text-black border-2 border-black p-3 text-center shadow-[3px_3px_0px_#000]">
            <Car size={18} className="mx-auto mb-1 stroke-[2.5]" />
            <p className="text-2xl font-black">{report.analysisSummary.vehiclesDetected}</p>
            <p className="text-[10px] font-black uppercase tracking-wider">VEHICLES</p>
          </div>
          <div className="bg-[#FACC15] text-black border-2 border-black p-3 text-center shadow-[3px_3px_0px_#000]">
            <Construction size={18} className="mx-auto mb-1 stroke-[2.5]" />
            <p className="text-2xl font-black">{report.analysisSummary.obstaclesDetected}</p>
            <p className="text-[10px] font-black uppercase tracking-wider">DEBRIS</p>
          </div>
        </div>
        <p className="text-slate-400 text-xs mt-2 uppercase">{report.analysisSummary.totalImages} AERIAL FRAME(S) · {incAnalyses.length} RECON DATASETS LINKED</p>
      </div>

      {/* Directives Summary */}
      <div>
        <h3 className="text-white font-black text-xs uppercase tracking-wider mb-3 pb-1 border-b-2 border-black">
          MISSION DIRECTIVE PROGRESS
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#38BDF8] text-black border-2 border-black p-3 text-center shadow-[3px_3px_0px_#000]">
            <ClipboardList size={18} className="mx-auto mb-1 stroke-[2.5]" />
            <p className="text-2xl font-black">{report.taskSummary.openTasks}</p>
            <p className="text-[10px] font-black uppercase tracking-wider">OPEN DIRECTIVES</p>
          </div>
          <div className="bg-[#4ADE80] text-black border-2 border-black p-3 text-center shadow-[3px_3px_0px_#000]">
            <CheckCircle2 size={18} className="mx-auto mb-1 stroke-[2.5]" />
            <p className="text-2xl font-black">{report.taskSummary.completedTasks}</p>
            <p className="text-[10px] font-black uppercase tracking-wider">RESOLVED</p>
          </div>
        </div>
        {incTasks.length > 0 && (
          <div className="mt-3 space-y-2 border-2 border-black bg-black/40 p-2.5">
            {incTasks.map(t => (
              <div key={t.id} className="flex items-center justify-between border-b border-black/40 pb-1.5 last:border-0 last:pb-0">
                <span className="text-white text-xs font-bold truncate max-w-xs">{t.title}</span>
                <span className={`text-[10px] font-black px-1.5 py-0.2 border border-black ${t.status === 'Completed' ? 'bg-[#4ADE80] text-black' : t.status === 'Blocked' ? 'bg-[#EF4444] text-black' : 'bg-slate-300 text-black'}`}>
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {report.notes && (
        <div className="border-2 border-black bg-black/40 p-3 shadow-[2px_2px_0px_#000]">
          <p className="text-slate-400 text-[10px] font-black uppercase mb-1">AUDIT SUMMARY</p>
          <p className="text-slate-300 text-xs">{report.notes}</p>
        </div>
      )}

      <div className="flex gap-3 pt-3">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 border-2 border-black bg-white/10 text-white font-black text-xs uppercase tracking-wider shadow-[3px_3px_0px_#000] hover:bg-white/20 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
        >
          Close
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
        >
          <Printer size={15} className="stroke-[3]" /> PRINT AUDIT
        </button>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const { incidents, tasks, analyses, reports, addReport, deleteReport, showToast } = useApp();
  const [search, setSearch] = useState('');
  const [filterIncident, setFilterIncident] = useState('');
  const [viewReport, setViewReport] = useState<Report | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const incidentMap = useMemo(() => Object.fromEntries(incidents.map(i => [i.id, i])), [incidents]);

  const filtered = useMemo(() => reports.filter(r => {
    const q = search.toLowerCase();
    const inc = incidentMap[r.incidentId];
    const ms = !q || r.id.toLowerCase().includes(q) || (inc?.title.toLowerCase().includes(q) ?? false);
    const mi = !filterIncident || r.incidentId === filterIncident;
    return ms && mi;
  }), [reports, search, filterIncident, incidentMap]);

  function generateReport(incidentId: string) {
    const inc = incidentMap[incidentId];
    if (!inc) return;
    const incAnalyses = analyses.filter(a => a.incidentId === incidentId);
    const incTasks = tasks.filter(t => t.incidentId === incidentId);
    const allDetections = incAnalyses.flatMap(a => a.detections);
    addReport({
      incidentId,
      createdAt: new Date().toISOString(),
      analysisSummary: {
        totalImages: incAnalyses.length,
        peopleDetected: allDetections.filter(d => d.className === 'Person').length,
        vehiclesDetected: allDetections.filter(d => d.className === 'Vehicle').length,
        obstaclesDetected: allDetections.filter(d => d.className === 'Obstacle').length,
      },
      taskSummary: {
        openTasks: incTasks.filter(t => t.status !== 'Completed').length,
        completedTasks: incTasks.filter(t => t.status === 'Completed').length,
      },
      isDemoResult: incAnalyses.some(a => a.isDemoResult),
    });
    showToast({ type: 'success', title: 'AUDIT REPORT COMPILED', message: `Report generated for "${inc.title}".` });
  }

  function exportCSV() {
    const rows = [
      ['Report ID', 'Incident', 'Location', 'Priority', 'Status', 'Images', 'People', 'Vehicles', 'Obstacles', 'Open Tasks', 'Completed', 'Created'],
      ...filtered.map(r => {
        const inc = incidentMap[r.incidentId];
        return [r.id, inc?.title ?? r.incidentId, inc?.locationName ?? '', inc?.priority ?? '', inc?.status ?? '',
          r.analysisSummary.totalImages, r.analysisSummary.peopleDetected, r.analysisSummary.vehiclesDetected,
          r.analysisSummary.obstaclesDetected, r.taskSummary.openTasks, r.taskSummary.completedTasks, formatDateTime(r.createdAt)];
      }),
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'livetrack-audit-reports.csv'; a.click();
    URL.revokeObjectURL(url);
    showToast({ type: 'success', title: 'CSV EXPORTED' });
  }

  const select = 'bg-[#111C2E] border-2 border-black px-3 py-2 text-white text-xs font-mono font-bold uppercase shadow-[3px_3px_0px_#000] focus:outline-none focus:border-[#2563EB]';

  return (
    <div className="space-y-5 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-white font-black text-base uppercase tracking-wider">AFTER-ACTION AUDIT REPORTS</h2>
          <p className="text-slate-400 text-xs mt-0.5 uppercase tracking-wider">{reports.length} DOSSIERS COMPILED</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#4ADE80] hover:bg-[#22C55E] text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-[4px_4px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
        >
          <Download size={15} className="stroke-[3]" /> EXPORT COMPLIANCE CSV
        </button>
      </div>

      {/* Generate report strip */}
      <div className="bg-[#111C2E] border-3 border-black p-5 shadow-[6px_6px_0px_#000]">
        <h3 className="text-white font-black text-xs uppercase tracking-wider mb-1">INSTANT REPORT SYNTHESIS</h3>
        <p className="text-slate-400 text-xs mb-4 uppercase">CHOOSE AN ACTIVE INCIDENT TO AGGREGATE SENSORY AND DIRECTIVE DATA:</p>
        <div className="flex gap-2.5 flex-wrap">
          {incidents.map(inc => (
            <button
              key={inc.id}
              onClick={() => generateReport(inc.id)}
              className="flex items-center gap-2 px-3 py-2 bg-[#0B1220] hover:bg-[#2563EB] hover:text-white text-white border-2 border-black text-xs font-bold uppercase shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
            >
              <FileText size={13} className="text-[#2563EB] group-hover:text-white" />
              {truncate(inc.title, 26)}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="bg-[#111C2E] border-2 border-black pl-9 pr-4 py-2 text-white text-xs font-mono placeholder-slate-500 shadow-[3px_3px_0px_#000] focus:outline-none focus:border-[#2563EB] w-60"
            placeholder="FILTER AUDIT REPORTS..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"><X size={14} /></button>}
        </div>
        <select className={select} value={filterIncident} onChange={e => setFilterIncident(e.target.value)}>
          <option value="">[ALL INCIDENTS]</option>
          {incidents.map(i => <option key={i.id} value={i.id}>{`${i.id} // ${truncate(i.title, 28)}`}</option>)}
        </select>
      </div>

      {/* Reports Table */}
      <div className="bg-[#111C2E] border-3 border-black shadow-[6px_6px_0px_#000] overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={FileText} title="NO AUDIT REPORTS ARCHIVED" description="SYNTHESIZE A REPORT FROM AN INCIDENT ABOVE." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-black/60 border-b-2 border-black text-slate-400 text-[10px] uppercase tracking-wider">
                  <th className="text-left px-5 py-3">REF ID</th>
                  <th className="text-left px-5 py-3">INCIDENT TARGET</th>
                  <th className="text-left px-5 py-3 hidden md:table-cell">AERIALS</th>
                  <th className="text-left px-5 py-3 hidden lg:table-cell">VISION DETECTIONS</th>
                  <th className="text-left px-5 py-3 hidden md:table-cell">DIRECTIVE BALANCE</th>
                  <th className="text-left px-5 py-3">GENERATED</th>
                  <th className="px-5 py-3 text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black">
                {filtered.map(r => {
                  const inc = incidentMap[r.incidentId];
                  return (
                    <tr key={r.id} className="hover:bg-white/5 transition">
                      <td className="px-5 py-3 text-[#2563EB] text-xs font-black">{r.id}</td>
                      <td className="px-5 py-3">
                        <p className="text-white text-xs font-black">{inc ? truncate(inc.title, 38) : r.incidentId}</p>
                        {r.isDemoResult && <span className="text-[#FACC15] text-[10px] font-bold">[DEMO CALIBRATION]</span>}
                      </td>
                      <td className="px-5 py-3 hidden md:table-cell text-slate-300 text-xs font-bold">{r.analysisSummary.totalImages} FRAMES</td>
                      <td className="px-5 py-3 hidden lg:table-cell text-slate-300 text-xs">
                        <span className="font-bold">{r.analysisSummary.peopleDetected}P // {r.analysisSummary.vehiclesDetected}V // {r.analysisSummary.obstaclesDetected}O</span>
                      </td>
                      <td className="px-5 py-3 hidden md:table-cell text-slate-300 text-xs font-bold">
                        {r.taskSummary.openTasks} OPEN · {r.taskSummary.completedTasks} RESOLVED
                      </td>
                      <td className="px-5 py-3 text-slate-400 text-xs whitespace-nowrap">{formatDate(r.createdAt)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => setViewReport(r)} className="p-1.5 border border-black bg-white/10 hover:bg-[#38BDF8] text-white hover:text-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all" title="Inspect"><Eye size={13} /></button>
                          <button onClick={() => setDeleteId(r.id)} className="p-1.5 border border-black bg-white/10 hover:bg-[#EF4444] text-white hover:text-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all" title="Expunge"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Report preview modal */}
      <Modal open={!!viewReport} onClose={() => setViewReport(null)} title={`AUDIT DOSSIER // ${viewReport?.id}`} size="lg">
        {viewReport && (
          <ReportPreview
            report={viewReport}
            incident={incidentMap[viewReport.incidentId]}
            tasks={tasks}
            analyses={analyses}
            onClose={() => setViewReport(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { if (deleteId) { deleteReport(deleteId); showToast({ type: 'success', title: 'AUDIT REPORT PURGED' }); setDeleteId(null); } }}
        title="PURGE AUDIT DOSSIER"
        message="Permanently purge this after-action report? Record cannot be reconstructed."
        confirmLabel="PURGE"
        danger
      />
    </div>
  );
}
