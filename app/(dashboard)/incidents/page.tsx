'use client';
import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Plus, Search, Trash2, Edit, Eye, AlertTriangle, X
} from 'lucide-react';
import PriorityBadge from '@/components/ui/PriorityBadge';
import { IncidentStatusBadge } from '@/components/ui/StatusBadge';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import EmptyState from '@/components/ui/EmptyState';
import { formatDateTime, truncate, timeAgo } from '@/lib/utils';
import {
  Incident, Priority, IncidentStatus, DisasterType
} from '@/lib/types';
import { DEMO_RESPONDERS } from '@/lib/mockData';

const DISASTER_TYPES: DisasterType[] = ['Flood', 'Earthquake', 'Fire', 'Landslide', 'Storm', 'Infrastructure Damage', 'Other Emergency'];
const PRIORITIES: Priority[] = ['Critical', 'High', 'Medium', 'Low'];
const STATUSES: IncidentStatus[] = ['Reported', 'Under Investigation', 'Response In Progress', 'Resolved', 'Closed'];

const EMPTY_FORM = {
  title: '', disasterType: 'Flood' as DisasterType, description: '',
  locationName: '', latitude: '', longitude: '',
  priority: 'Medium' as Priority, status: 'Reported' as IncidentStatus,
  reportedAt: '',
  assignedTeam: 'Unassigned', notes: '',
};

type FormData = typeof EMPTY_FORM;

function IncidentForm({ initial, onSave, onClose }: {
  initial: FormData;
  onSave: (f: FormData) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState(() => ({
    ...initial,
    reportedAt: initial.reportedAt || new Date().toISOString().slice(0, 16),
  }));
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  function validate() {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.description.trim()) e.description = 'Description is required';
    if (!form.locationName.trim()) e.locationName = 'Location is required';
    if (form.latitude && isNaN(Number(form.latitude))) e.latitude = 'Must be a number';
    if (form.longitude && isNaN(Number(form.longitude))) e.longitude = 'Must be a number';
    return e;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    onSave(form);
  }

  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const field = 'flex flex-col gap-1.5';
  const label = 'text-white text-xs font-black uppercase tracking-wider font-mono';
  const input = 'bg-[#0B1220] border-2 border-black rounded-none px-3 py-2 text-white text-sm font-mono placeholder-slate-500 shadow-[3px_3px_0px_#000] focus:outline-none focus:border-[#F47B20]';
  const error = 'text-[#EF4444] text-xs font-mono font-bold';

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4 font-mono">
      <div className={field}>
        <label className={label}>Incident Title *</label>
        <input className={input} value={form.title} onChange={set('title')} placeholder="e.g. Riverdale Flash Flood Sector 4" />
        {errors.title && <p className={error}>[ERROR: {errors.title}]</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className={field}>
          <label className={label}>Disaster Type</label>
          <select className={input} value={form.disasterType} onChange={set('disasterType')}>
            {DISASTER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className={field}>
          <label className={label}>Priority Severity</label>
          <select className={input} value={form.priority} onChange={set('priority')}>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div className={field}>
        <label className={label}>Description *</label>
        <textarea className={`${input} resize-none`} rows={3} value={form.description} onChange={set('description')} placeholder="Incident situation summary..." />
        {errors.description && <p className={error}>[ERROR: {errors.description}]</p>}
      </div>
      <div className={field}>
        <label className={label}>Location Name *</label>
        <input className={input} value={form.locationName} onChange={set('locationName')} placeholder="e.g. Sector 4, North District" />
        {errors.locationName && <p className={error}>[ERROR: {errors.locationName}]</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className={field}>
          <label className={label}>Latitude (GPS)</label>
          <input className={input} type="number" step="any" value={form.latitude} onChange={set('latitude')} placeholder="28.6139" />
          {errors.latitude && <p className={error}>[ERROR: {errors.latitude}]</p>}
        </div>
        <div className={field}>
          <label className={label}>Longitude (GPS)</label>
          <input className={input} type="number" step="any" value={form.longitude} onChange={set('longitude')} placeholder="77.2090" />
          {errors.longitude && <p className={error}>[ERROR: {errors.longitude}]</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className={field}>
          <label className={label}>Status</label>
          <select className={input} value={form.status} onChange={set('status')}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className={field}>
          <label className={label}>Assigned Team</label>
          <select className={input} value={form.assignedTeam} onChange={set('assignedTeam')}>
            {DEMO_RESPONDERS.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
          </select>
        </div>
      </div>
      <div className={field}>
        <label className={label}>Reported Date & Time</label>
        <input className={input} type="datetime-local" value={form.reportedAt} onChange={set('reportedAt')} />
      </div>
      <div className={field}>
        <label className={label}>Field Notes</label>
        <textarea className={`${input} resize-none`} rows={2} value={form.notes} onChange={set('notes')} placeholder="Tactical observations..." />
      </div>
      <div className="flex gap-3 pt-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-3 border-2 border-black bg-white/10 text-white font-black text-xs uppercase tracking-wider shadow-[3px_3px_0px_#000] hover:bg-white/20 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 py-3 bg-[#F47B20] hover:bg-[#FFA154] text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
        >
          SAVE INCIDENT
        </button>
      </div>
    </form>
  );
}

function IncidentDetail({ incident, onClose, onEdit }: { incident: Incident; onClose: () => void; onEdit: () => void }) {
  return (
    <div className="p-6 space-y-4 font-mono">
      <div className="flex flex-wrap gap-2.5">
        <PriorityBadge priority={incident.priority} />
        <IncidentStatusBadge status={incident.status} />
        <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-black uppercase tracking-wider bg-[#38BDF8] text-black border-2 border-black shadow-[2px_2px_0px_#000]">
          {incident.disasterType}
        </span>
      </div>
      <div className="border-2 border-black bg-black/40 p-3.5 shadow-[3px_3px_0px_#000]">
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider mb-1">INCIDENT BRIEF</p>
        <p className="text-white text-sm leading-relaxed">{incident.description}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="border-2 border-black bg-black/40 p-3 shadow-[2px_2px_0px_#000]">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider mb-0.5">LOCATION</p>
          <p className="text-white text-xs font-black">{incident.locationName}</p>
          {incident.latitude && <p className="text-[#F47B20] text-[11px] mt-0.5">{incident.latitude}, {incident.longitude}</p>}
        </div>
        <div className="border-2 border-black bg-black/40 p-3 shadow-[2px_2px_0px_#000]">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider mb-0.5">RESPONSE UNIT</p>
          <p className="text-white text-xs font-black">{incident.assignedTeam}</p>
        </div>
        <div className="border-2 border-black bg-black/40 p-3 shadow-[2px_2px_0px_#000]">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider mb-0.5">DATE LOGGED</p>
          <p className="text-white text-xs font-black">{formatDateTime(incident.reportedAt)}</p>
        </div>
        <div className="border-2 border-black bg-black/40 p-3 shadow-[2px_2px_0px_#000]">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider mb-0.5">LOG IDENTIFIER</p>
          <p className="text-[#F47B20] text-xs font-black">{incident.id}</p>
        </div>
      </div>
      {incident.notes && (
        <div className="border-2 border-black bg-black/40 p-3 shadow-[2px_2px_0px_#000]">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider mb-0.5">NOTES</p>
          <p className="text-slate-300 text-xs">{incident.notes}</p>
        </div>
      )}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 border-2 border-black bg-white/10 text-white font-black text-xs uppercase tracking-wider shadow-[3px_3px_0px_#000] hover:bg-white/20 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
        >
          Close
        </button>
        <button
          onClick={onEdit}
          className="flex-1 py-2.5 bg-[#F47B20] hover:bg-[#FFA154] text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
        >
          EDIT INCIDENT
        </button>
      </div>
    </div>
  );
}

export default function IncidentsPage() {
  const { incidents, addIncident, updateIncident, deleteIncident, showToast } = useApp();
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [detailInc, setDetailInc] = useState<Incident | null>(null);
  const [editInc, setEditInc] = useState<Incident | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return incidents.filter(i => {
      const q = search.toLowerCase();
      const matchSearch = !q || i.title.toLowerCase().includes(q) || i.locationName.toLowerCase().includes(q) || i.id.toLowerCase().includes(q);
      const matchPriority = !filterPriority || i.priority === filterPriority;
      const matchStatus = !filterStatus || i.status === filterStatus;
      const matchType = !filterType || i.disasterType === filterType;
      return matchSearch && matchPriority && matchStatus && matchType;
    });
  }, [incidents, search, filterPriority, filterStatus, filterType]);

  function handleCreate(form: FormData) {
    addIncident({
      title: form.title, disasterType: form.disasterType as DisasterType,
      description: form.description, locationName: form.locationName,
      latitude: form.latitude ? Number(form.latitude) : undefined,
      longitude: form.longitude ? Number(form.longitude) : undefined,
      priority: form.priority as Priority, status: form.status as IncidentStatus,
      reportedAt: form.reportedAt ? new Date(form.reportedAt).toISOString() : new Date().toISOString(),
      assignedTeam: form.assignedTeam, notes: form.notes,
    });
    setFormOpen(false);
    showToast({ type: 'success', title: 'INCIDENT LOGGED', message: `"${form.title}" registered.` });
  }

  function handleEdit(form: FormData) {
    if (!editInc) return;
    updateIncident({
      ...editInc,
      title: form.title, disasterType: form.disasterType as DisasterType,
      description: form.description, locationName: form.locationName,
      latitude: form.latitude ? Number(form.latitude) : undefined,
      longitude: form.longitude ? Number(form.longitude) : undefined,
      priority: form.priority as Priority, status: form.status as IncidentStatus,
      reportedAt: form.reportedAt ? new Date(form.reportedAt).toISOString() : editInc.reportedAt,
      assignedTeam: form.assignedTeam, notes: form.notes,
    });
    setEditInc(null);
    showToast({ type: 'success', title: 'INCIDENT UPDATED' });
  }

  function handleDelete() {
    if (!deleteId) return;
    deleteIncident(deleteId);
    showToast({ type: 'success', title: 'INCIDENT EXPUNGED' });
    setDeleteId(null);
  }

  const select = 'bg-[#111C2E] border-2 border-black px-3 py-2 text-white text-xs font-mono font-bold uppercase shadow-[3px_3px_0px_#000] focus:outline-none focus:border-[#F47B20]';

  return (
    <div className="space-y-5 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-white font-black text-base uppercase tracking-wider">CRITICAL INCIDENT REGISTRY</h2>
          <p className="text-slate-400 text-xs mt-0.5 uppercase tracking-wider">{incidents.length} RECORDS TOTAL · {incidents.filter(i => ['Reported','Under Investigation','Response In Progress'].includes(i.status)).length} ACTIVE THREATS</p>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#F47B20] hover:bg-[#FFA154] text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-[4px_4px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all self-start sm:self-auto"
        >
          <Plus size={16} className="stroke-[3]" /> LOG NEW INCIDENT
        </button>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full bg-[#111C2E] border-2 border-black pl-9 pr-4 py-2 text-white text-xs font-mono placeholder-slate-500 shadow-[3px_3px_0px_#000] focus:outline-none focus:border-[#F47B20]"
            placeholder="FILTER INCIDENTS BY ID, NAME, LOCATION..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"><X size={14} /></button>}
        </div>
        <select className={select} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="">[ALL PRIORITIES]</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className={select} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">[ALL STATUSES]</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className={select} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">[ALL DISASTERS]</option>
          {DISASTER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Table Frame */}
      <div className="bg-[#111C2E] border-3 border-black shadow-[6px_6px_0px_#000] overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={AlertTriangle} title="NO INCIDENTS MATCH CRITERIA" description="ADJUST APPLIED SEARCH PARAMETERS OR REGISTER A NEW DISASTER ENTRY." action={{ label: 'LOG INCIDENT', onClick: () => setFormOpen(true) }} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-black/60 border-b-2 border-black text-slate-400 text-[10px] uppercase tracking-wider">
                  <th className="text-left px-5 py-3">ID</th>
                  <th className="text-left px-5 py-3">INCIDENT DETAILS</th>
                  <th className="text-left px-5 py-3 hidden lg:table-cell">TYPE</th>
                  <th className="text-left px-5 py-3 hidden md:table-cell">ZONE</th>
                  <th className="text-left px-5 py-3">PRIORITY</th>
                  <th className="text-left px-5 py-3">STATUS</th>
                  <th className="text-left px-5 py-3 hidden md:table-cell">UNIT</th>
                  <th className="text-left px-5 py-3 hidden xl:table-cell">TIMESTAMP</th>
                  <th className="px-5 py-3 text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black">
                {filtered.map(inc => (
                  <tr key={inc.id} className="hover:bg-white/5 transition">
                    <td className="px-5 py-3 text-[#F47B20] text-xs font-black whitespace-nowrap">{inc.id}</td>
                    <td className="px-5 py-3">
                      <p className="text-white text-xs font-black">{truncate(inc.title, 40)}</p>
                      <p className="text-slate-400 text-[11px] mt-0.5">{timeAgo(inc.reportedAt)}</p>
                    </td>
                    <td className="px-5 py-3 hidden lg:table-cell text-slate-300 text-xs">{inc.disasterType}</td>
                    <td className="px-5 py-3 hidden md:table-cell text-slate-300 text-xs">{truncate(inc.locationName, 25)}</td>
                    <td className="px-5 py-3"><PriorityBadge priority={inc.priority} /></td>
                    <td className="px-5 py-3"><IncidentStatusBadge status={inc.status} /></td>
                    <td className="px-5 py-3 hidden md:table-cell text-slate-300 text-xs font-black">{inc.assignedTeam}</td>
                    <td className="px-5 py-3 hidden xl:table-cell text-slate-400 text-xs whitespace-nowrap">{formatDateTime(inc.reportedAt)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => setDetailInc(inc)} className="p-1.5 border border-black bg-white/10 hover:bg-[#38BDF8] text-white hover:text-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all" title="View"><Eye size={14} /></button>
                        <button onClick={() => setEditInc(inc)} className="p-1.5 border border-black bg-white/10 hover:bg-[#FACC15] text-white hover:text-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all" title="Edit"><Edit size={14} /></button>
                        <button onClick={() => setDeleteId(inc.id)} className="p-1.5 border border-black bg-white/10 hover:bg-[#EF4444] text-white hover:text-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all" title="Delete"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="LOG NEW EMERGENCY INCIDENT" size="lg">
        <IncidentForm initial={EMPTY_FORM} onSave={handleCreate} onClose={() => setFormOpen(false)} />
      </Modal>

      <Modal open={!!editInc} onClose={() => setEditInc(null)} title="UPDATE INCIDENT PROFILE" size="lg">
        {editInc && (
          <IncidentForm
            initial={{
              title: editInc.title, disasterType: editInc.disasterType,
              description: editInc.description, locationName: editInc.locationName,
              latitude: editInc.latitude?.toString() ?? '',
              longitude: editInc.longitude?.toString() ?? '',
              priority: editInc.priority, status: editInc.status,
              reportedAt: editInc.reportedAt.slice(0, 16),
              assignedTeam: editInc.assignedTeam, notes: editInc.notes ?? '',
            }}
            onSave={handleEdit}
            onClose={() => setEditInc(null)}
          />
        )}
      </Modal>

      <Modal open={!!detailInc && !editInc} onClose={() => setDetailInc(null)} title={detailInc?.title ?? ''} size="lg">
        {detailInc && (
          <IncidentDetail
            incident={detailInc}
            onClose={() => setDetailInc(null)}
            onEdit={() => { setEditInc(detailInc); setDetailInc(null); }}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="EXPUNGE INCIDENT RECORD"
        message="Are you certain you wish to purge this incident record? This operation cannot be reversed."
        confirmLabel="EXPUNGE"
        danger
      />
    </div>
  );
}
