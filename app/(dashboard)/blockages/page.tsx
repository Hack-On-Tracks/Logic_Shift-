'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  TriangleAlert, Plus, Search, RefreshCw, Trash2, Edit,
  Eye, MapPin, CheckCircle, Clock, XCircle, ChevronDown,
} from 'lucide-react';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import EmptyState from '@/components/ui/EmptyState';
import LoadingState from '@/components/ui/LoadingState';
import {
  fetchBlockages, createBlockage, updateBlockage, deleteBlockage, ApiBlockage,
} from '@/lib/api';
import { formatDateTime, timeAgo, cn } from '@/lib/utils';

// ─── Status helpers ───────────────────────────────────────────
const STATUS_OPTIONS = ['Reported', 'Under Review', 'Verified', 'Cleared'] as const;
type BlockageStatus = typeof STATUS_OPTIONS[number];

const SEVERITY_OPTIONS = ['Low', 'Moderate', 'High', 'Critical'] as const;
type BlockageSeverity = typeof SEVERITY_OPTIONS[number];

const TYPE_OPTIONS = [
  'Debris', 'Landslide', 'Flood Water', 'Collapsed Structure',
  'Vehicle Accident', 'Tree Fall', 'Utility Hazard', 'Other',
] as const;

function statusStyle(s: BlockageStatus) {
  switch (s) {
    case 'Reported':     return 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000]';
    case 'Under Review': return 'bg-[#38BDF8] text-black border-2 border-black shadow-[2px_2px_0px_#000]';
    case 'Verified':     return 'bg-[#2563EB] text-white border-2 border-black shadow-[2px_2px_0px_#000]';
    case 'Cleared':      return 'bg-[#4ADE80] text-black border-2 border-black shadow-[2px_2px_0px_#000]';
  }
}
function severityStyle(s: BlockageSeverity) {
  switch (s) {
    case 'Critical':  return 'bg-[#EF4444] text-white border-2 border-black shadow-[2px_2px_0px_#000]';
    case 'High':      return 'bg-[#2563EB] text-white border-2 border-black shadow-[2px_2px_0px_#000]';
    case 'Moderate':  return 'bg-white text-black border-2 border-black shadow-[2px_2px_0px_#000]';
    case 'Low':       return 'bg-[#94A3B8] text-black border-2 border-black shadow-[2px_2px_0px_#000]';
  }
}
function statusIcon(s: BlockageStatus) {
  switch (s) {
    case 'Reported':     return <Clock size={12} />;
    case 'Under Review': return <Eye size={12} />;
    case 'Verified':     return <TriangleAlert size={12} />;
    case 'Cleared':      return <CheckCircle size={12} />;
  }
}

// ─── Empty form ───────────────────────────────────────────────
const EMPTY_FORM = {
  title: '',
  description: '',
  blockageType: 'Debris',
  severity: 'Moderate' as BlockageSeverity,
  status: 'Reported' as BlockageStatus,
  latitude: '',
  longitude: '',
  locationName: '',
  estimatedClearance: '',
  notes: '',
};
type FormData = typeof EMPTY_FORM;

// ─── Blockage Form ────────────────────────────────────────────
function BlockageForm({ initial, onSave, onClose }: {
  initial: FormData;
  onSave: (f: FormData) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  function validate() {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.title.trim()) e.title = 'Title required';
    if (!form.locationName.trim()) e.locationName = 'Location required';
    if (!form.latitude || isNaN(Number(form.latitude))) e.latitude = 'Valid lat required';
    if (!form.longitude || isNaN(Number(form.longitude))) e.longitude = 'Valid lng required';
    return e;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    onSave(form);
  }

  const set = (k: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const fieldCls = 'w-full bg-black/40 border-2 border-black text-white text-xs font-mono px-3 py-2 focus:outline-none focus:border-[#2563EB] transition placeholder:text-slate-600';
  const labelCls = 'block text-slate-400 text-[10px] font-black uppercase tracking-wider mb-1 font-mono';

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4 font-mono">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={labelCls}>Title *</label>
          <input value={form.title} onChange={set('title')} placeholder="e.g. Landslide on NH-44 km 312" className={fieldCls} />
          {errors.title && <p className="text-[#EF4444] text-[10px] mt-1">{errors.title}</p>}
        </div>
        <div>
          <label className={labelCls}>Blockage Type</label>
          <select value={form.blockageType} onChange={set('blockageType')} className={fieldCls}>
            {TYPE_OPTIONS.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Severity</label>
          <select value={form.severity} onChange={set('severity')} className={fieldCls}>
            {SEVERITY_OPTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <select value={form.status} onChange={set('status')} className={fieldCls}>
            {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Location Name *</label>
          <input value={form.locationName} onChange={set('locationName')} placeholder="e.g. NH-44, Assam" className={fieldCls} />
          {errors.locationName && <p className="text-[#EF4444] text-[10px] mt-1">{errors.locationName}</p>}
        </div>
        <div>
          <label className={labelCls}>Latitude *</label>
          <input type="number" step="any" value={form.latitude} onChange={set('latitude')} placeholder="26.1445" className={fieldCls} />
          {errors.latitude && <p className="text-[#EF4444] text-[10px] mt-1">{errors.latitude}</p>}
        </div>
        <div>
          <label className={labelCls}>Longitude *</label>
          <input type="number" step="any" value={form.longitude} onChange={set('longitude')} placeholder="91.7362" className={fieldCls} />
          {errors.longitude && <p className="text-[#EF4444] text-[10px] mt-1">{errors.longitude}</p>}
        </div>
        <div>
          <label className={labelCls}>Est. Clearance (ISO datetime)</label>
          <input type="datetime-local" value={form.estimatedClearance} onChange={set('estimatedClearance')} className={fieldCls} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Description</label>
          <textarea value={form.description} onChange={set('description')} rows={2} placeholder="Describe the blockage..." className={fieldCls} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Notes</label>
          <textarea value={form.notes} onChange={set('notes')} rows={2} placeholder="Additional field notes..." className={fieldCls} />
        </div>
      </div>
      <div className="flex gap-3 pt-2 border-t-2 border-black">
        <button type="button" onClick={onClose}
          className="flex-1 py-2.5 border-2 border-black text-slate-300 hover:bg-white/5 text-xs font-black uppercase tracking-wider transition font-mono">
          CANCEL
        </button>
        <button type="submit"
          className="flex-1 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none text-xs font-black uppercase tracking-wider transition font-mono">
          SAVE BLOCKAGE
        </button>
      </div>
    </form>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────
function BlockageDetail({ b, onClose, onStatusChange }: {
  b: ApiBlockage;
  onClose: () => void;
  onStatusChange: (newStatus: BlockageStatus) => void;
}) {
  const [statusOpen, setStatusOpen] = useState(false);
  return (
    <div className="p-6 space-y-4 font-mono">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={cn('inline-flex items-center gap-1 px-2 py-1 text-xs font-black uppercase', statusStyle(b.status as BlockageStatus))}>
          {statusIcon(b.status as BlockageStatus)} {b.status}
        </span>
        <span className={cn('inline-flex items-center gap-1 px-2 py-1 text-xs font-black uppercase', severityStyle(b.severity as BlockageSeverity))}>
          {b.severity}
        </span>
        <span className="px-2 py-1 text-xs bg-[#111C2E] border-2 border-black text-slate-300 font-black uppercase">{b.blockageType}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="border-2 border-black bg-black/40 p-3">
          <p className="text-[10px] text-slate-400 uppercase font-black mb-0.5">LOCATION</p>
          <p className="text-white text-xs font-black">{b.locationName || '—'}</p>
        </div>
        <div className="border-2 border-black bg-black/40 p-3">
          <p className="text-[10px] text-slate-400 uppercase font-black mb-0.5">COORDINATES</p>
          <p className="text-[#2563EB] text-xs font-black">{b.latitude.toFixed(4)}, {b.longitude.toFixed(4)}</p>
        </div>
        <div className="border-2 border-black bg-black/40 p-3">
          <p className="text-[10px] text-slate-400 uppercase font-black mb-0.5">REPORTED</p>
          <p className="text-white text-xs">{formatDateTime(b.reportedAt)}</p>
        </div>
        {b.estimatedClearance && (
          <div className="border-2 border-black bg-black/40 p-3">
            <p className="text-[10px] text-slate-400 uppercase font-black mb-0.5">EST. CLEARANCE</p>
            <p className="text-[#4ADE80] text-xs">{formatDateTime(b.estimatedClearance)}</p>
          </div>
        )}
        {b.description && (
          <div className="sm:col-span-2 border-2 border-black bg-black/40 p-3">
            <p className="text-[10px] text-slate-400 uppercase font-black mb-1">DESCRIPTION</p>
            <p className="text-white text-xs leading-relaxed">{b.description}</p>
          </div>
        )}
        {b.notes && (
          <div className="sm:col-span-2 border-2 border-black bg-black/40 p-3">
            <p className="text-[10px] text-slate-400 uppercase font-black mb-1">FIELD NOTES</p>
            <p className="text-slate-300 text-xs leading-relaxed">{b.notes}</p>
          </div>
        )}
      </div>

      {/* Status change */}
      <div>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider mb-2">UPDATE STATUS</p>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map(s => (
            <button key={s} onClick={() => { onStatusChange(s); onClose(); }}
              className={cn(
                'px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition border-2 border-black',
                b.status === s
                  ? 'bg-[#2563EB] text-white shadow-[2px_2px_0px_#000]'
                  : 'bg-[#111C2E] text-slate-300 hover:bg-white/10'
              )}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <button onClick={onClose}
        className="w-full py-2.5 border-2 border-black text-slate-300 hover:bg-white/5 text-xs font-black uppercase tracking-wider font-mono transition">
        CLOSE
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function BlockagesPage() {
  const [blockages, setBlockages] = useState<ApiBlockage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterSeverity, setFilterSeverity] = useState<string>('All');
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ApiBlockage | null>(null);
  const [viewTarget, setViewTarget] = useState<ApiBlockage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ApiBlockage | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBlockages();
      setBlockages(data);
    } catch (err) {
      setError('Could not load blockages from backend. Is the API server running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = blockages.filter(b => {
    const q = search.toLowerCase();
    const matchQ = !q || b.title.toLowerCase().includes(q) || b.locationName.toLowerCase().includes(q);
    const matchS = filterStatus === 'All' || b.status === filterStatus;
    const matchSev = filterSeverity === 'All' || b.severity === filterSeverity;
    return matchQ && matchS && matchSev;
  });

  async function handleCreate(form: FormData) {
    try {
      const created = await createBlockage({
        title: form.title,
        description: form.description,
        blockageType: form.blockageType,
        severity: form.severity,
        status: form.status,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        locationName: form.locationName,
        estimatedClearance: form.estimatedClearance || undefined,
        notes: form.notes,
      });
      setBlockages(prev => [created, ...prev]);
      setCreateOpen(false);
    } catch {
      alert('Failed to create blockage. Check API connection.');
    }
  }

  async function handleEdit(form: FormData) {
    if (!editTarget) return;
    try {
      const updated = await updateBlockage(editTarget.id, {
        title: form.title,
        description: form.description,
        blockageType: form.blockageType,
        severity: form.severity,
        status: form.status,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        locationName: form.locationName,
        estimatedClearance: form.estimatedClearance || undefined,
        notes: form.notes,
      });
      setBlockages(prev => prev.map(b => b.id === updated.id ? updated : b));
      setEditTarget(null);
    } catch {
      alert('Failed to update blockage.');
    }
  }

  async function handleStatusChange(b: ApiBlockage, newStatus: BlockageStatus) {
    try {
      const updated = await updateBlockage(b.id, { status: newStatus });
      setBlockages(prev => prev.map(x => x.id === updated.id ? updated : x));
    } catch {
      alert('Failed to update status.');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteBlockage(deleteTarget.id);
      setBlockages(prev => prev.filter(b => b.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      alert('Failed to delete blockage.');
    }
  }

  const counts = {
    total: blockages.length,
    reported: blockages.filter(b => b.status === 'Reported').length,
    verified: blockages.filter(b => b.status === 'Verified').length,
    cleared: blockages.filter(b => b.status === 'Cleared').length,
    critical: blockages.filter(b => b.severity === 'Critical').length,
  };

  return (
    <div className="space-y-5 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-white font-black text-lg uppercase tracking-wider">ROAD BLOCKAGE ANALYSIS</h1>
          <p className="text-slate-400 text-xs uppercase tracking-widest">
            {counts.total} BLOCKAGES · {counts.verified} VERIFIED · {counts.critical} CRITICAL
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2.5 border-2 border-black bg-[#111C2E] text-slate-300 hover:bg-white/10 shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition">
            <RefreshCw size={15} />
          </button>
          <button onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none text-xs font-black uppercase tracking-wider transition">
            <Plus size={14} className="stroke-[3]" /> LOG BLOCKAGE
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'TOTAL', value: counts.total, cls: 'bg-white text-black' },
          { label: 'REPORTED', value: counts.reported, cls: 'bg-[#38BDF8] text-black' },
          { label: 'VERIFIED', value: counts.verified, cls: 'bg-[#2563EB] text-white' },
          { label: 'CRITICAL', value: counts.critical, cls: 'bg-[#EF4444] text-white' },
        ].map(s => (
          <div key={s.label} className="border-2 border-black shadow-[4px_4px_0px_#000] p-4 bg-[#111C2E]">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider mb-1">{s.label}</p>
            <p className={cn('text-2xl font-black w-9 h-9 flex items-center justify-center border-2 border-black', s.cls)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="SEARCH BLOCKAGES..."
            className="w-full pl-9 pr-3 py-2 bg-[#111C2E] border-2 border-black text-white text-xs font-mono placeholder:text-slate-600 focus:outline-none focus:border-[#2563EB] transition" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-[#111C2E] border-2 border-black text-white text-xs font-mono focus:outline-none">
          <option value="All">ALL STATUSES</option>
          {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}
          className="px-3 py-2 bg-[#111C2E] border-2 border-black text-white text-xs font-mono focus:outline-none">
          <option value="All">ALL SEVERITIES</option>
          {SEVERITY_OPTIONS.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-[#EF4444] text-white border-2 border-black p-4 shadow-[4px_4px_0px_#000]">
          <XCircle size={16} className="flex-shrink-0" />
          <span className="text-xs font-black uppercase">{error}</span>
          <button onClick={load} className="ml-auto text-[10px] underline font-black">RETRY</button>
        </div>
      )}

      {/* Content */}
      {loading ? <LoadingState label="LOADING BLOCKAGES..." /> : (
        filtered.length === 0 ? (
          <EmptyState icon={TriangleAlert} title="NO BLOCKAGES FOUND"
            description="No road blockages match your filters."
            action={{ label: 'LOG BLOCKAGE', onClick: () => setCreateOpen(true) }} />
        ) : (
          <div className="bg-[#111C2E] border-2 border-black shadow-[6px_6px_0px_#000] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-black text-slate-400 text-[10px] uppercase tracking-wider border-b-2 border-black">
                    <th className="text-left px-5 py-3">BLOCKAGE</th>
                    <th className="text-left px-5 py-3 hidden md:table-cell">LOCATION</th>
                    <th className="text-left px-5 py-3">SEVERITY</th>
                    <th className="text-left px-5 py-3">STATUS</th>
                    <th className="text-left px-5 py-3 hidden lg:table-cell">REPORTED</th>
                    <th className="text-right px-5 py-3">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black">
                  {filtered.map(b => (
                    <tr key={b.id} className="hover:bg-white/5 transition">
                      <td className="px-5 py-3">
                        <p className="text-white text-xs font-black">{b.title}</p>
                        <p className="text-slate-500 text-[10px] mt-0.5">{b.blockageType}</p>
                      </td>
                      <td className="px-5 py-3 hidden md:table-cell">
                        <div className="flex items-center gap-1.5 text-slate-300 text-xs">
                          <MapPin size={11} className="text-[#2563EB] flex-shrink-0" />
                          <span className="truncate max-w-[160px]">{b.locationName || '—'}</span>
                        </div>
                        <p className="text-slate-600 text-[10px] mt-0.5">{b.latitude.toFixed(3)}, {b.longitude.toFixed(3)}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span className={cn('inline-flex items-center px-2 py-1 text-[10px] font-black uppercase', severityStyle(b.severity as BlockageSeverity))}>
                          {b.severity}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={cn('inline-flex items-center gap-1 px-2 py-1 text-[10px] font-black uppercase', statusStyle(b.status as BlockageStatus))}>
                          {statusIcon(b.status as BlockageStatus)} {b.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 hidden lg:table-cell">
                        <p className="text-slate-400 text-[10px]">{timeAgo(b.reportedAt)}</p>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setViewTarget(b)}
                            className="p-1.5 border-2 border-black bg-[#0B1220] text-slate-400 hover:text-white hover:bg-[#2563EB] shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition">
                            <Eye size={13} />
                          </button>
                          <button onClick={() => setEditTarget(b)}
                            className="p-1.5 border-2 border-black bg-[#0B1220] text-slate-400 hover:text-white hover:bg-white/10 shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition">
                            <Edit size={13} />
                          </button>
                          <button onClick={() => setDeleteTarget(b)}
                            className="p-1.5 border-2 border-black bg-[#0B1220] text-slate-400 hover:text-white hover:bg-[#EF4444] shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Modals */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="LOG NEW BLOCKAGE" size="lg">
        <BlockageForm
          initial={EMPTY_FORM}
          onSave={handleCreate}
          onClose={() => setCreateOpen(false)}
        />
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="EDIT BLOCKAGE" size="lg">
        {editTarget && (
          <BlockageForm
            initial={{
              title: editTarget.title,
              description: editTarget.description,
              blockageType: editTarget.blockageType,
              severity: editTarget.severity as BlockageSeverity,
              status: editTarget.status as BlockageStatus,
              latitude: String(editTarget.latitude),
              longitude: String(editTarget.longitude),
              locationName: editTarget.locationName,
              estimatedClearance: editTarget.estimatedClearance ?? '',
              notes: editTarget.notes,
            }}
            onSave={handleEdit}
            onClose={() => setEditTarget(null)}
          />
        )}
      </Modal>

      <Modal open={!!viewTarget} onClose={() => setViewTarget(null)} title={viewTarget?.title ?? ''} size="lg">
        {viewTarget && (
          <BlockageDetail
            b={viewTarget}
            onClose={() => setViewTarget(null)}
            onStatusChange={(s) => handleStatusChange(viewTarget, s)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="DELETE BLOCKAGE"
        message={`Permanently delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="DELETE"
        danger
      />
    </div>
  );
}
