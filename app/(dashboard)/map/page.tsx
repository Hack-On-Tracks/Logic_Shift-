'use client';
import { useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useApp } from '@/context/AppContext';
import {
  Map as MapIcon, X, ExternalLink,
} from 'lucide-react';
import PriorityBadge from '@/components/ui/PriorityBadge';
import { IncidentStatusBadge } from '@/components/ui/StatusBadge';
import { formatDateTime } from '@/lib/utils';
import { Priority, IncidentStatus, DisasterType } from '@/lib/types';
import LoadingState from '@/components/ui/LoadingState';
import Link from 'next/link';

const MapComponent = dynamic(() => import('@/components/map/MapComponent'), {
  ssr: false,
  loading: () => <LoadingState label="MOUNTING TACTICAL GIS SATELLITE TILES..." />,
});

const LEGEND = [
  { color: 'bg-[#EF4444]', label: 'CRITICAL' },
  { color: 'bg-[#F47B20]', label: 'HIGH' },
  { color: 'bg-[#FACC15]', label: 'MEDIUM' },
  { color: 'bg-[#94A3B8]', label: 'LOW' },
];

export default function MapPage() {
  const { incidents } = useApp();
  const [selected, setSelected] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterType, setFilterType] = useState('');

  const filtered = useMemo(() => {
    return incidents.filter(i => {
      const ms = !filterStatus || i.status === filterStatus;
      const mp = !filterPriority || i.priority === filterPriority;
      const mt = !filterType || i.disasterType === filterType;
      return ms && mp && mt;
    });
  }, [incidents, filterStatus, filterPriority, filterType]);

  const mappable = filtered.filter(i => i.latitude && i.longitude);
  const selectedInc = incidents.find(i => i.id === selected);
  const handleSelect = useCallback((id: string) => setSelected(id), []);

  const noCoords = incidents.filter(i => !i.latitude || !i.longitude);

  const select = 'bg-[#111C2E] border-2 border-black px-3 py-2 text-white text-xs font-mono font-bold uppercase shadow-[3px_3px_0px_#000] focus:outline-none focus:border-[#F47B20]';

  return (
    <div className="space-y-4 font-mono">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-[#F47B20] text-black border-2 border-black px-3 py-2 text-xs font-black uppercase tracking-wider shadow-[3px_3px_0px_#000]">
          <MapIcon size={16} className="stroke-[3]" />
          <span>{mappable.length} / {incidents.length} INCIDENTS POSITIONED</span>
        </div>
        <div className="flex-1" />
        <select className={select} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="">[ALL PRIORITIES]</option>
          {(['Critical','High','Medium','Low'] as Priority[]).map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className={select} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">[ALL STATUSES]</option>
          {(['Reported','Under Investigation','Response In Progress','Resolved','Closed'] as IncidentStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className={select} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">[ALL DISASTERS]</option>
          {(['Flood','Earthquake','Fire','Landslide','Storm','Infrastructure Damage','Other Emergency'] as DisasterType[]).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {(filterStatus || filterPriority || filterType) && (
          <button
            onClick={() => { setFilterStatus(''); setFilterPriority(''); setFilterType(''); }}
            className="flex items-center gap-1.5 bg-black border-2 border-black text-[#EF4444] font-black text-xs px-3 py-2 shadow-[2px_2px_0px_#000] hover:bg-[#EF4444] hover:text-black transition uppercase tracking-wider"
          >
            <X size={14} className="stroke-[3]" /> RESET
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4" style={{ height: '70vh' }}>
        {/* Leaflet Map Frame */}
        <div className="lg:col-span-3 relative border-3 border-black shadow-[6px_6px_0px_#000] overflow-hidden h-full bg-[#0B1220]">
          <MapComponent incidents={filtered} selectedId={selected} onSelect={handleSelect} />

          {/* Brutalist Legend */}
          <div className="absolute bottom-4 left-4 bg-[#0B1220] border-2 border-black p-3 shadow-[4px_4px_0px_#000] z-[1000]">
            <p className="text-white text-[10px] font-black uppercase tracking-wider mb-2 border-b border-white/20 pb-1">
              THREAT CLASSIFICATION
            </p>
            <div className="space-y-1.5">
              {LEGEND.map(l => (
                <div key={l.label} className="flex items-center gap-2">
                  <div className={`w-3 h-3 border border-black ${l.color}`} />
                  <span className="text-slate-200 text-[10px] font-bold tracking-wider">{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Uncoordinated alert */}
          {noCoords.length > 0 && (
            <div className="absolute top-4 left-4 bg-[#FACC15] text-black border-2 border-black px-3 py-1.5 shadow-[3px_3px_0px_#000] z-[1000] text-xs font-black uppercase">
              ⚠️ {noCoords.length} INCIDENT{noCoords.length > 1 ? 'S' : ''} WITHOUT GPS TELEMETRY EXCLUDED
            </div>
          )}
        </div>

        {/* Tactical Side Panel */}
        <div className="flex flex-col gap-4 overflow-y-auto">
          {selectedInc ? (
            <div className="bg-[#111C2E] border-3 border-black shadow-[5px_5px_0px_#000] p-4 space-y-3">
              <div className="flex items-start justify-between gap-2 border-b-2 border-black pb-2">
                <h3 className="text-white font-black text-xs uppercase tracking-wider leading-snug">{selectedInc.title}</h3>
                <button
                  onClick={() => setSelected(null)}
                  className="p-1 border border-black bg-white/10 hover:bg-[#EF4444] text-white hover:text-black transition"
                >
                  <X size={13} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <PriorityBadge priority={selectedInc.priority} />
                <IncidentStatusBadge status={selectedInc.status} />
              </div>
              <div className="space-y-2 text-xs divide-y divide-black/40 pt-1">
                <div className="pt-1"><p className="text-slate-400 text-[10px] uppercase font-bold">SECTOR ZONE</p><p className="text-white font-bold">{selectedInc.locationName}</p></div>
                <div className="pt-1"><p className="text-slate-400 text-[10px] uppercase font-bold">TAXONOMY</p><p className="text-white font-bold">{selectedInc.disasterType}</p></div>
                <div className="pt-1"><p className="text-slate-400 text-[10px] uppercase font-bold">RESPONSE CORPS</p><p className="text-[#F47B20] font-black">{selectedInc.assignedTeam}</p></div>
                <div className="pt-1"><p className="text-slate-400 text-[10px] uppercase font-bold">RECORDED</p><p className="text-white">{formatDateTime(selectedInc.reportedAt)}</p></div>
                {selectedInc.latitude && (
                  <div className="pt-1"><p className="text-slate-400 text-[10px] uppercase font-bold">GPS COORDS</p><p className="text-[#38BDF8] font-bold">{selectedInc.latitude?.toFixed(4)}, {selectedInc.longitude?.toFixed(4)}</p></div>
                )}
              </div>
              <Link
                href="/incidents"
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F47B20] text-black font-black text-[11px] uppercase border-2 border-black shadow-[2px_2px_0px_#000] hover:bg-[#FFA154] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all w-full justify-center"
              >
                OPEN FULL DOSSIER <ExternalLink size={12} className="stroke-[3]" />
              </Link>
            </div>
          ) : (
            <div className="bg-[#111C2E] border-3 border-black shadow-[4px_4px_0px_#000] p-4">
              <div className="flex items-center gap-2 text-white font-black text-xs uppercase mb-1.5">
                <MapIcon size={16} className="text-[#F47B20]" />
                <span>INTERACTIVE TARGET SELECTION</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">SELECT ANY MAP MARKER TO RETRIEVE TARGET LOG TELEMETRY AND FIELD STATUS.</p>
            </div>
          )}

          {/* Quick incident listing */}
          <div className="bg-[#111C2E] border-3 border-black shadow-[5px_5px_0px_#000] overflow-hidden flex-1">
            <div className="px-4 py-2.5 bg-[#0B1220] border-b-2 border-black flex items-center justify-between">
              <h3 className="text-white text-xs font-black uppercase tracking-wider">TARGET ROSTER</h3>
              <span className="text-[#F47B20] text-xs font-black">{filtered.length}</span>
            </div>
            <div className="overflow-y-auto max-h-80 divide-y-2 divide-black">
              {filtered.map(inc => (
                <button
                  key={inc.id}
                  onClick={() => setSelected(inc.id === selected ? null : inc.id)}
                  className={`w-full text-left p-3 hover:bg-white/5 transition flex flex-col gap-1.5 ${selected === inc.id ? 'bg-[#F47B20]/15 border-l-4 border-l-[#F47B20]' : ''}`}
                >
                  <p className="text-white text-xs font-black truncate">{inc.title}</p>
                  <div className="flex items-center justify-between">
                    <PriorityBadge priority={inc.priority} />
                    {!inc.latitude && <span className="text-[#EF4444] text-[9px] font-black">[NO GPS]</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
