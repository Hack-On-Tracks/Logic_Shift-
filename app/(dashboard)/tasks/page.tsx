'use client';
import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Plus, Search, X, Trash2, Edit, Eye, ClipboardList, LayoutGrid, List,
} from 'lucide-react';
import PriorityBadge from '@/components/ui/PriorityBadge';
import { TaskStatusBadge } from '@/components/ui/StatusBadge';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import EmptyState from '@/components/ui/EmptyState';
import { formatDate, truncate } from '@/lib/utils';
import { RescueTask, Priority, TaskStatus } from '@/lib/types';
import { DEMO_RESPONDERS } from '@/lib/mockData';

const PRIORITIES: Priority[] = ['Critical', 'High', 'Medium', 'Low'];
const STATUSES: TaskStatus[] = ['Pending', 'In Progress', 'Blocked', 'Completed'];

const EMPTY_FORM = {
  title: '', description: '', incidentId: '',
  assignedTeam: 'Team Alpha', priority: 'Medium' as Priority, status: 'Pending' as TaskStatus,
  startDate: '', dueDate: '', notes: '',
};
type FormData = typeof EMPTY_FORM;

function TaskForm({ initial, onSave, onClose, incidents }: {
  initial: FormData;
  onSave: (f: FormData) => void;
  onClose: () => void;
  incidents: { id: string; title: string }[];
}) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  function validate() {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.description.trim()) e.description = 'Description is required';
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
  const input = 'bg-[#0B1220] border-2 border-black rounded-none px-3 py-2 text-white text-sm font-mono placeholder-slate-500 shadow-[3px_3px_0px_#000] focus:outline-none focus:border-[#2563EB]';
  const errCls = 'text-[#EF4444] text-xs font-mono font-bold';

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4 font-mono">
      <div className={field}>
        <label className={label}>Directive Title *</label>
        <input className={input} value={form.title} onChange={set('title')} placeholder="e.g. Evacuate Block A residents" />
        {errors.title && <p className={errCls}>[ERROR: {errors.title}]</p>}
      </div>
      <div className={field}>
        <label className={label}>Directive Scope *</label>
        <textarea className={`${input} resize-none`} rows={3} value={form.description} onChange={set('description')} placeholder="Operational instructions..." />
        {errors.description && <p className={errCls}>[ERROR: {errors.description}]</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className={field}>
          <label className={label}>Priority Level</label>
          <select className={input} value={form.priority} onChange={set('priority')}>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className={field}>
          <label className={label}>Directive Status</label>
          <select className={input} value={form.status} onChange={set('status')}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className={field}>
          <label className={label}>Assigned Response Team</label>
          <select className={input} value={form.assignedTeam} onChange={set('assignedTeam')}>
            {DEMO_RESPONDERS.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
          </select>
        </div>
        <div className={field}>
          <label className={label}>Linked Incident</label>
          <select className={input} value={form.incidentId} onChange={set('incidentId')}>
            <option value="">[NONE // UNLINKED]</option>
            {incidents.map(i => <option key={i.id} value={i.id}>{`${i.id} // ${truncate(i.title, 28)}`}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className={field}>
          <label className={label}>Commence Date</label>
          <input className={input} type="datetime-local" value={form.startDate} onChange={set('startDate')} />
        </div>
        <div className={field}>
          <label className={label}>Completion Deadline</label>
          <input className={input} type="datetime-local" value={form.dueDate} onChange={set('dueDate')} />
        </div>
      </div>
      <div className={field}>
        <label className={label}>Field Dispatch Notes</label>
        <textarea className={`${input} resize-none`} rows={2} value={form.notes} onChange={set('notes')} placeholder="Tactical requirements or gear constraints..." />
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
          className="flex-1 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
        >
          DISPATCH DIRECTIVE
        </button>
      </div>
    </form>
  );
}

const STATUS_COLS: TaskStatus[] = ['Pending', 'In Progress', 'Blocked', 'Completed'];
const STATUS_HEADER_COLORS: Record<TaskStatus, { bg: string; text: string }> = {
  Pending: { bg: 'bg-slate-200', text: 'text-black' },
  'In Progress': { bg: 'bg-[#60A5FA]', text: 'text-black' },
  Blocked: { bg: 'bg-[#F87171]', text: 'text-black' },
  Completed: { bg: 'bg-[#4ADE80]', text: 'text-black' },
};

export default function TasksPage() {
  const { incidents, tasks, addTask, updateTask, deleteTask, showToast } = useApp();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const [filterIncident, setFilterIncident] = useState('');
  const [view, setView] = useState<'board' | 'table'>('board');
  const [formOpen, setFormOpen] = useState(false);
  const [editTask, setEditTask] = useState<RescueTask | null>(null);
  const [detailTask, setDetailTask] = useState<RescueTask | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const incidentMap = useMemo(() => Object.fromEntries(incidents.map(i => [i.id, i.title])), [incidents]);

  const filtered = useMemo(() => tasks.filter(t => {
    const q = search.toLowerCase();
    const ms = !q || t.title.toLowerCase().includes(q) || t.assignedTeam.toLowerCase().includes(q);
    const mp = !filterPriority || t.priority === filterPriority;
    const mst = !filterStatus || t.status === filterStatus;
    const mt = !filterTeam || t.assignedTeam === filterTeam;
    const mi = !filterIncident || t.incidentId === filterIncident;
    return ms && mp && mst && mt && mi;
  }), [tasks, search, filterPriority, filterStatus, filterTeam, filterIncident]);

  function handleCreate(form: FormData) {
    addTask({
      title: form.title, description: form.description,
      incidentId: form.incidentId, assignedTeam: form.assignedTeam,
      priority: form.priority, status: form.status,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
      notes: form.notes,
    });
    setFormOpen(false);
    showToast({ type: 'success', title: 'DIRECTIVE DISPATCHED' });
  }

  function handleEdit(form: FormData) {
    if (!editTask) return;
    updateTask({
      ...editTask,
      title: form.title, description: form.description,
      incidentId: form.incidentId, assignedTeam: form.assignedTeam,
      priority: form.priority, status: form.status,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
      notes: form.notes,
    });
    setEditTask(null);
    showToast({ type: 'success', title: 'DIRECTIVE UPDATED' });
  }

  function handleDelete() {
    if (!deleteId) return;
    deleteTask(deleteId);
    showToast({ type: 'success', title: 'DIRECTIVE PURGED' });
    setDeleteId(null);
  }

  function quickStatusChange(task: RescueTask, status: TaskStatus) {
    updateTask({ ...task, status });
    showToast({ type: 'success', title: `DIRECTIVE REPOSITIONED -> ${status}` });
  }

  const select = 'bg-[#111C2E] border-2 border-black px-3 py-2 text-white text-xs font-mono font-bold uppercase shadow-[3px_3px_0px_#000] focus:outline-none focus:border-[#2563EB]';

  return (
    <div className="space-y-5 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-white font-black text-base uppercase tracking-wider">TACTICAL DIRECTIVES & DISPATCH</h2>
          <p className="text-slate-400 text-xs mt-0.5 uppercase tracking-wider">{tasks.length} DIRECTIVES LOGGED · {tasks.filter(t => t.status === 'In Progress').length} UNDER ACTIVE EXECUTION</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex border-2 border-black shadow-[3px_3px_0px_#000]">
            <button
              onClick={() => setView('board')}
              className={`px-3 py-2 text-xs font-black uppercase flex items-center gap-1.5 transition ${view === 'board' ? 'bg-[#2563EB] text-white' : 'bg-[#111C2E] text-slate-400 hover:text-white'}`}
            >
              <LayoutGrid size={14} className="stroke-[3]" /> KANBAN
            </button>
            <button
              onClick={() => setView('table')}
              className={`px-3 py-2 text-xs font-black uppercase flex items-center gap-1.5 transition ${view === 'table' ? 'bg-[#2563EB] text-white' : 'bg-[#111C2E] text-slate-400 hover:text-white'}`}
            >
              <List size={14} className="stroke-[3]" /> ROSTER
            </button>
          </div>
          <button
            onClick={() => setFormOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[4px_4px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
          >
            <Plus size={16} className="stroke-[3]" /> ISSUE DIRECTIVE
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="bg-[#111C2E] border-2 border-black pl-9 pr-4 py-2 text-white text-xs font-mono placeholder-slate-500 shadow-[3px_3px_0px_#000] focus:outline-none focus:border-[#2563EB] w-56"
            placeholder="FILTER DIRECTIVES..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"><X size={14} /></button>}
        </div>
        <select className={select} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">[ALL STATUSES]</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className={select} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="">[ALL PRIORITIES]</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className={select} value={filterTeam} onChange={e => setFilterTeam(e.target.value)}>
          <option value="">[ALL CORPS]</option>
          {DEMO_RESPONDERS.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
        </select>
        <select className={select} value={filterIncident} onChange={e => setFilterIncident(e.target.value)}>
          <option value="">[ALL TARGET INCIDENTS]</option>
          {incidents.map(i => <option key={i.id} value={i.id}>{`${i.id} // ${truncate(i.title, 24)}`}</option>)}
        </select>
      </div>

      {/* Kanban Board View */}
      {view === 'board' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {STATUS_COLS.map(col => {
            const colTasks = filtered.filter(t => t.status === col);
            const { bg, text } = STATUS_HEADER_COLORS[col];
            return (
              <div key={col} className="bg-[#111C2E] border-3 border-black shadow-[6px_6px_0px_#000] overflow-hidden flex flex-col">
                <div className={`px-4 py-2.5 ${bg} ${text} border-b-2 border-black flex items-center justify-between`}>
                  <span className="text-xs font-black uppercase tracking-wider">{col}</span>
                  <span className="bg-black text-white px-2 py-0.5 text-[10px] font-black border border-black">{colTasks.length}</span>
                </div>
                <div className="p-3 space-y-3 min-h-48 flex-1 bg-[#0B1220]/60">
                  {colTasks.length === 0 && (
                    <p className="text-slate-500 text-xs text-center py-8 uppercase tracking-widest">[QUEUE EMPTY]</p>
                  )}
                  {colTasks.map(t => (
                    <div key={t.id} className="bg-[#111C2E] border-2 border-black p-3.5 shadow-[3px_3px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_#2563EB] transition-all">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[#2563EB] text-[10px] font-black">{t.id}</span>
                        <PriorityBadge priority={t.priority} />
                      </div>
                      <p className="text-white text-xs font-black leading-snug mb-1">{t.title}</p>
                      <p className="text-slate-400 text-[10px] mb-2 font-bold uppercase">{t.assignedTeam}</p>
                      {t.incidentId && (
                        <p className="text-slate-500 text-[9px] mb-2 truncate">
                          LINK // {incidentMap[t.incidentId] ?? t.incidentId}
                        </p>
                      )}
                      <div className="flex items-center justify-between pt-2 border-t border-black">
                        <span className="text-slate-400 text-[9px]">{t.dueDate ? formatDate(t.dueDate) : 'NO DEADLINE'}</span>
                        <div className="flex gap-1.5">
                          <button onClick={() => setDetailTask(t)} className="p-1 border border-black bg-white/10 hover:bg-[#38BDF8] text-white hover:text-black transition" title="Inspect"><Eye size={12} /></button>
                          <button onClick={() => setEditTask(t)} className="p-1 border border-black bg-white/10 hover:bg-[#FACC15] text-white hover:text-black transition" title="Modify"><Edit size={12} /></button>
                          <button onClick={() => setDeleteId(t.id)} className="p-1 border border-black bg-white/10 hover:bg-[#EF4444] text-white hover:text-black transition" title="Expunge"><Trash2 size={12} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {view === 'table' && (
        <div className="bg-[#111C2E] border-3 border-black shadow-[6px_6px_0px_#000] overflow-hidden">
          {filtered.length === 0 ? (
            <EmptyState icon={ClipboardList} title="NO DIRECTIVES MATCH CRITERIA" description="ALTER FILTERS OR ISSUE A NEW DIRECTIVE TICKET." action={{ label: 'ISSUE DIRECTIVE', onClick: () => setFormOpen(true) }} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-black/60 border-b-2 border-black text-slate-400 text-[10px] uppercase tracking-wider">
                    <th className="text-left px-5 py-3">ID</th>
                    <th className="text-left px-5 py-3">DIRECTIVE</th>
                    <th className="text-left px-5 py-3 hidden md:table-cell">LINKED DISASTER</th>
                    <th className="text-left px-5 py-3 hidden lg:table-cell">UNIT</th>
                    <th className="text-left px-5 py-3">PRIORITY</th>
                    <th className="text-left px-5 py-3">STATUS</th>
                    <th className="text-left px-5 py-3 hidden xl:table-cell">DEADLINE</th>
                    <th className="px-5 py-3 text-center">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black">
                  {filtered.map(t => (
                    <tr key={t.id} className="hover:bg-white/5 transition">
                      <td className="px-5 py-3 text-[#2563EB] text-xs font-black">{t.id}</td>
                      <td className="px-5 py-3">
                        <p className="text-white text-xs font-black">{truncate(t.title, 42)}</p>
                        <p className="text-slate-400 text-[11px] mt-0.5">{t.description ? truncate(t.description, 45) : ''}</p>
                      </td>
                      <td className="px-5 py-3 hidden md:table-cell text-slate-300 text-xs">{t.incidentId ? truncate(incidentMap[t.incidentId] ?? t.incidentId, 25) : '—'}</td>
                      <td className="px-5 py-3 hidden lg:table-cell text-slate-300 text-xs font-black">{t.assignedTeam}</td>
                      <td className="px-5 py-3"><PriorityBadge priority={t.priority} /></td>
                      <td className="px-5 py-3"><TaskStatusBadge status={t.status} /></td>
                      <td className="px-5 py-3 hidden xl:table-cell text-slate-400 text-xs">{t.dueDate ? formatDate(t.dueDate) : '—'}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => setDetailTask(t)} className="p-1.5 border border-black bg-white/10 hover:bg-[#38BDF8] text-white hover:text-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"><Eye size={13} /></button>
                          <button onClick={() => setEditTask(t)} className="p-1.5 border border-black bg-white/10 hover:bg-[#FACC15] text-white hover:text-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"><Edit size={13} /></button>
                          <button onClick={() => setDeleteId(t.id)} className="p-1.5 border border-black bg-white/10 hover:bg-[#EF4444] text-white hover:text-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="ISSUE RESCUE DIRECTIVE" size="lg">
        <TaskForm initial={EMPTY_FORM} onSave={handleCreate} onClose={() => setFormOpen(false)} incidents={incidents} />
      </Modal>

      <Modal open={!!editTask} onClose={() => setEditTask(null)} title="UPDATE DIRECTIVE" size="lg">
        {editTask && (
          <TaskForm
            initial={{
              title: editTask.title, description: editTask.description,
              incidentId: editTask.incidentId, assignedTeam: editTask.assignedTeam,
              priority: editTask.priority, status: editTask.status,
              startDate: editTask.startDate?.slice(0, 16) ?? '',
              dueDate: editTask.dueDate?.slice(0, 16) ?? '',
              notes: editTask.notes ?? '',
            }}
            onSave={handleEdit}
            onClose={() => setEditTask(null)}
            incidents={incidents}
          />
        )}
      </Modal>

      <Modal open={!!detailTask && !editTask} onClose={() => setDetailTask(null)} title={detailTask?.title ?? ''} size="md">
        {detailTask && (
          <div className="p-6 space-y-4 font-mono">
            <div className="flex flex-wrap gap-2">
              <PriorityBadge priority={detailTask.priority} />
              <TaskStatusBadge status={detailTask.status} />
            </div>
            <div className="border-2 border-black bg-black/40 p-3.5 shadow-[2px_2px_0px_#000]">
              <p className="text-slate-400 text-[10px] font-black uppercase mb-1">DIRECTIVE SCOPE</p>
              <p className="text-white text-sm leading-relaxed">{detailTask.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="border-2 border-black bg-black/40 p-3 shadow-[2px_2px_0px_#000]"><p className="text-slate-400 text-[10px] font-black uppercase">UNIT</p><p className="text-white text-xs font-black">{detailTask.assignedTeam}</p></div>
              <div className="border-2 border-black bg-black/40 p-3 shadow-[2px_2px_0px_#000]"><p className="text-slate-400 text-[10px] font-black uppercase">LINKED INCIDENT</p><p className="text-white text-xs font-black">{detailTask.incidentId ? (incidentMap[detailTask.incidentId] ?? detailTask.incidentId) : '—'}</p></div>
              <div className="border-2 border-black bg-black/40 p-3 shadow-[2px_2px_0px_#000]"><p className="text-slate-400 text-[10px] font-black uppercase">COMMENCE</p><p className="text-white text-xs">{detailTask.startDate ? formatDate(detailTask.startDate) : '—'}</p></div>
              <div className="border-2 border-black bg-black/40 p-3 shadow-[2px_2px_0px_#000]"><p className="text-slate-400 text-[10px] font-black uppercase">DEADLINE</p><p className="text-white text-xs">{detailTask.dueDate ? formatDate(detailTask.dueDate) : '—'}</p></div>
            </div>
            {detailTask.notes && (
              <div className="border-2 border-black bg-black/40 p-3 shadow-[2px_2px_0px_#000]">
                <p className="text-slate-400 text-[10px] font-black uppercase mb-1">FIELD NOTES</p>
                <p className="text-slate-300 text-xs">{detailTask.notes}</p>
              </div>
            )}
            <div>
              <p className="text-white text-xs font-black uppercase tracking-wider mb-2">QUICK REPOSITION STATUS</p>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map(s => (
                  <button
                    key={s}
                    onClick={() => { quickStatusChange(detailTask, s); setDetailTask({ ...detailTask, status: s }); }}
                    className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all ${detailTask.status === s ? 'bg-[#2563EB] text-white' : 'bg-black text-slate-300 hover:text-white'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-3">
              <button
                onClick={() => setDetailTask(null)}
                className="flex-1 py-2.5 border-2 border-black bg-white/10 text-white font-black text-xs uppercase tracking-wider shadow-[3px_3px_0px_#000] hover:bg-white/20 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
              >
                Close
              </button>
              <button
                onClick={() => { setEditTask(detailTask); setDetailTask(null); }}
                className="flex-1 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
              >
                EDIT DIRECTIVE
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="PURGE DIRECTIVE TICKET"
        message="Permanently purge this rescue directive? The ticket will be expunged from all logs."
        confirmLabel="PURGE"
        danger
      />
    </div>
  );
}
