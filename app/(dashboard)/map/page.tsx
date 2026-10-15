'use client';
import { useState, useMemo, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useApp } from '@/context/AppContext';
import {
  Map as MapIcon, X, ExternalLink, Navigation, Radio,
  AlertTriangle, Shield, CheckCircle, RefreshCw, Loader2,
} from 'lucide-react';
import PriorityBadge from '@/components/ui/PriorityBadge';
import { IncidentStatusBadge } from '@/components/ui/StatusBadge';
import { formatDateTime, cn } from '@/lib/utils';
import { Priority, IncidentStatus, DisasterType, Incident } from '@/lib/types';
import LoadingState from '@/components/ui/LoadingState';
import Link from 'next/link';
import {
  fetchIncidents, fetchBlockages, fetchTeamLocations, postTeamLocation,
  calculateRoute, ApiBlockage, ApiTeamLocation, ApiRouteResult,
} from '@/lib/api';

const MapComponent = dynamic(() => import('@/components/map/MapComponent'), {
  ssr: false,
  loading: () => <LoadingState label="MOUNTING TACTICAL GIS SATELLITE TILES..." />,
});

const LEGEND = [
  { color: 'bg-[#EF4444]', label: 'CRITICAL THREAT' },
  { color: 'bg-[#2563EB]', label: 'HIGH PRIORITY' },
  { color: 'bg-white', label: 'MEDIUM' },
  { color: 'bg-[#94A3B8]', label: 'LOW' },
  { color: 'bg-[#EF4444] border-dashed', label: 'ROAD CLOSURE' },
  { color: 'bg-[#4ADE80]', label: 'RESCUE UNIT (GPS)' },
];

export default function MapPage() {
  const { incidents: contextIncidents } = useApp();
  const [incidents, setIncidents] = useState<Incident[]>(contextIncidents);
  const [blockages, setBlockages] = useState<ApiBlockage[]>([]);
  const [teams, setTeams] = useState<ApiTeamLocation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterType, setFilterType] = useState('');
  const [loading, setLoading] = useState(true);

  // GPS Broadcast State
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [myTeamName, setMyTeamName] = useState('Alpha Unit 1');
  const [watchId, setWatchId] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Routing State
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [routeResult, setRouteResult] = useState<ApiRouteResult | null>(null);
  const [routingLoading, setRoutingLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [backendInc, backendBlock, backendTeams] = await Promise.allSettled([
        fetchIncidents(),
        fetchBlockages(),
        fetchTeamLocations(),
      ]);

      if (backendInc.status === 'fulfilled' && backendInc.value.length > 0) {
        // Map backend incidents to frontend Incident interface
        const mapped: Incident[] = backendInc.value.map(bi => ({
          id: bi.incidentId || `INC-${bi.id}`,
          title: bi.title,
          description: bi.description,
          disasterType: bi.disasterType as DisasterType,
          priority: bi.severity as Priority,
          status: bi.status as IncidentStatus,
          latitude: bi.latitude ?? undefined,
          longitude: bi.longitude ?? undefined,
          locationName: bi.locationName,
          reportedAt: bi.reportedAt,
          assignedTeam: bi.assignedTeam,
          notes: bi.notes,
        }));
        setIncidents(mapped);
      }

      if (backendBlock.status === 'fulfilled') {
        setBlockages(backendBlock.value);
      }

      if (backendTeams.status === 'fulfilled') {
        setTeams(backendTeams.value);
        if (backendTeams.value.length > 0 && !selectedTeamId) {
          setSelectedTeamId(String(backendTeams.value[0].id));
        }
      }
    } catch (err) {
      console.error('Failed to sync map telemetry', err);
    } finally {
      setLoading(false);
    }
  }, [selectedTeamId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // GPS Tracking Toggle
  const toggleGpsBroadcast = () => {
    if (isBroadcasting) {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        setWatchId(null);
      }
      setIsBroadcasting(false);
      setGpsError(null);
    } else {
      if (!('geolocation' in navigator)) {
        setGpsError('Geolocation is not supported by your browser.');
        return;
      }
      setGpsError(null);
      const id = navigator.geolocation.watchPosition(
        async (position) => {
          const { latitude, longitude, accuracy, heading } = position.coords;
          try {
            const updated = await postTeamLocation({
              teamName: myTeamName,
              deviceId: `DEV-${Math.floor(Math.random() * 8999 + 1000)}`,
              latitude,
              longitude,
              accuracy: accuracy || undefined,
              heading: heading || undefined,
              status: 'Active',
            });
            setTeams(prev => {
              const without = prev.filter(t => t.teamName !== myTeamName);
              return [...without, updated];
            });
          } catch (err) {
            console.error('Error posting GPS update', err);
          }
        },
        (error) => {
          setGpsError(`GPS Access Error: ${error.message}`);
          setIsBroadcasting(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
      setWatchId(id);
      setIsBroadcasting(true);
    }
  };

  // Route Dispatch Calculation
  const handleCalculateRoute = async () => {
    const inc = incidents.find(i => i.id === selected);
    const team = teams.find(t => String(t.id) === selectedTeamId) || teams[0];

    if (!inc?.latitude || !inc?.longitude || !team?.latitude || !team?.longitude) {
      alert('Missing coordinates for route calculation.');
      return;
    }

    setRoutingLoading(true);
    try {
      const res = await calculateRoute(team.latitude, team.longitude, inc.latitude, inc.longitude);
      setRouteResult(res);
    } catch {
      alert('Routing service unavailable. Ensure OSRM or network connection is active.');
    } finally {
      setRoutingLoading(false);
    }
  };

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
  const handleSelect = useCallback((id: string) => {
    setSelected(id);
    setRouteResult(null); // clear prior route
  }, []);

  const noCoords = incidents.filter(i => !i.latitude || !i.longitude);

  const selectStyle = 'bg-[#111C2E] border-2 border-black px-3 py-2 text-white text-xs font-mono font-bold uppercase shadow-[3px_3px_0px_#000] focus:outline-none focus:border-[#2563EB]';

  return (
    <div className="space-y-4 font-mono">
      {/* Top Banner & GIS Controls */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-[#2563EB] text-white border-2 border-black px-3 py-2 text-xs font-black uppercase tracking-wider shadow-[3px_3px_0px_#000]">
            <MapIcon size={16} className="stroke-[3]" />
            <span>{mappable.length} / {incidents.length} TARGETS</span>
          </div>

          <div className="flex items-center gap-2 bg-[#4ADE80] text-black border-2 border-black px-3 py-2 text-xs font-black uppercase tracking-wider shadow-[3px_3px_0px_#000]">
            <Shield size={16} className="stroke-[3]" />
            <span>{teams.length} UNITS ONLINE</span>
          </div>

          <div className="flex items-center gap-2 bg-[#EF4444] text-white border-2 border-black px-3 py-2 text-xs font-black uppercase tracking-wider shadow-[3px_3px_0px_#000]">
            <AlertTriangle size={16} className="stroke-[3]" />
            <span>{blockages.length} HAZARD BLOCKS</span>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 border-2 border-black bg-[#111C2E] text-slate-300 hover:text-white hover:bg-white/10 shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition"
            title="Refresh GIS Feeds"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* GPS Broadcast Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleGpsBroadcast}
            className={cn(
              'flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all',
              isBroadcasting ? 'bg-[#EF4444] text-white animate-pulse' : 'bg-[#111C2E] hover:bg-white/10 text-white'
            )}
          >
            <Radio size={14} className="stroke-[3]" />
            {isBroadcasting ? 'STOP GPS BROADCAST' : 'BROADCAST GPS TELEMETRY'}
          </button>
        </div>
      </div>

      {gpsError && (
        <div className="bg-[#EF4444] text-white text-xs font-black p-2 border-2 border-black shadow-[3px_3px_0px_#000]">
          ⚠️ {gpsError}
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <select className={selectStyle} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="">[ALL PRIORITIES]</option>
          {(['Critical', 'High', 'Medium', 'Low'] as Priority[]).map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className={selectStyle} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">[ALL STATUSES]</option>
          {(['Reported', 'Under Investigation', 'Response In Progress', 'Resolved', 'Closed'] as IncidentStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className={selectStyle} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">[ALL DISASTERS]</option>
          {(['Flood', 'Earthquake', 'Fire', 'Landslide', 'Storm', 'Infrastructure Damage', 'Other Emergency'] as DisasterType[]).map(t => <option key={t} value={t}>{t}</option>)}
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

      {/* Map & Detail Split Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4" style={{ minHeight: '68vh' }}>
        {/* Leaflet Map Frame */}
        <div className="lg:col-span-3 relative border-3 border-black shadow-[6px_6px_0px_#000] overflow-hidden min-h-[500px] bg-[#0B1220]">
          <MapComponent
            incidents={filtered}
            selectedId={selected}
            onSelect={handleSelect}
            blockages={blockages}
            teams={teams}
            routeGeometry={routeResult?.geometry ?? null}
          />

          {/* Brutalist Legend */}
          <div className="absolute bottom-4 left-4 bg-[#0B1220] border-2 border-black p-3 shadow-[4px_4px_0px_#000] z-[1000] pointer-events-auto">
            <p className="text-white text-[10px] font-black uppercase tracking-wider mb-2 border-b border-white/20 pb-1">
              GIS TELEMETRY LEGEND
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

          {/* Route Warning Banner */}
          {routeResult && (
            <div className="absolute top-4 left-4 right-4 z-[1000] space-y-2 pointer-events-auto">
              <div className="bg-[#2563EB] text-white border-2 border-black p-3 shadow-[4px_4px_0px_#000] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Navigation size={18} className="stroke-[3]" />
                  <span className="font-black text-xs uppercase">
                    ESTIMATED ROUTE: {(routeResult.distanceMeters / 1000).toFixed(1)} KM · {Math.round(routeResult.durationSeconds / 60)} MINS
                  </span>
                </div>
                <button
                  onClick={() => setRouteResult(null)}
                  className="p-1 bg-black text-white hover:bg-[#EF4444] transition"
                >
                  <X size={14} />
                </button>
              </div>

              {(routeResult.hasClosureWarning || (routeResult.intersectingClosures && routeResult.intersectingClosures.length > 0)) && (
                <div className="bg-[#EF4444] text-white border-2 border-black p-3 shadow-[4px_4px_0px_#000]">
                  <p className="font-black text-xs uppercase flex items-center gap-1.5 mb-1">
                    <AlertTriangle size={16} /> CRITICAL OBSTACLE WARNING: ROUTE INTERSECTS WITH ROAD CLOSURE!
                  </p>
                  <div className="text-[11px] font-bold space-y-1">
                    {routeResult.warningDetails && (
                      <div className="bg-black/30 p-1.5 mb-1">{routeResult.warningDetails}</div>
                    )}
                    {(routeResult.intersectingClosures || []).map(bw => (
                      <div key={bw.id} className="bg-black/30 p-1.5">
                        • {bw.title} ({bw.blockageType || 'Closure'}) at {bw.locationName || 'Road Segment'} - {bw.severity || 'Hazard'}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {noCoords.length > 0 && !routeResult && (
            <div className="absolute top-4 left-4 bg-[#FACC15] text-black border-2 border-black px-3 py-1.5 shadow-[3px_3px_0px_#000] z-[1000] text-xs font-black uppercase">
              ⚠️ {noCoords.length} TARGETS LACK COORDINATES
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
                  onClick={() => { setSelected(null); setRouteResult(null); }}
                  className="p-1 border border-black bg-white/10 hover:bg-[#EF4444] text-white hover:text-black transition"
                >
                  <X size={13} />
                </button>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[10px] uppercase font-black">REF ID</span>
                  <span className="text-[#2563EB] font-black">{selectedInc.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[10px] uppercase font-black">PRIORITY</span>
                  <PriorityBadge priority={selectedInc.priority} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[10px] uppercase font-black">STATUS</span>
                  <IncidentStatusBadge status={selectedInc.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[10px] uppercase font-black">DISASTER</span>
                  <span className="text-white font-bold">{selectedInc.disasterType}</span>
                </div>
                <div className="border-t border-black/40 pt-1.5">
                  <span className="text-slate-400 text-[10px] uppercase font-black block mb-0.5">LOCATION</span>
                  <p className="text-white text-xs">{selectedInc.locationName}</p>
                  <p className="text-[#2563EB] text-[10px] font-mono mt-0.5">{selectedInc.latitude?.toFixed(4)}, {selectedInc.longitude?.toFixed(4)}</p>
                </div>
                <div className="border-t border-black/40 pt-1.5">
                  <span className="text-slate-400 text-[10px] uppercase font-black block mb-0.5">ASSIGNED CORPS</span>
                  <p className="text-white text-xs font-black">{selectedInc.assignedTeam}</p>
                </div>
              </div>

              {/* OSRM Route Dispatcher */}
              <div className="border-t-2 border-black pt-3 space-y-2">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider">
                  DISPATCH ROUTE NAVIGATION
                </p>
                <select
                  value={selectedTeamId}
                  onChange={e => setSelectedTeamId(e.target.value)}
                  className="w-full bg-black border-2 border-black text-white text-xs p-2 font-mono"
                >
                  {teams.map(t => (
                    <option key={t.id} value={String(t.id)}>
                      {t.teamName} (Unit #{t.id})
                    </option>
                  ))}
                  {teams.length === 0 && <option value="">No Active Units</option>}
                </select>

                <button
                  onClick={handleCalculateRoute}
                  disabled={routingLoading || teams.length === 0}
                  className="w-full py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-slate-700 text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition flex items-center justify-center gap-2"
                >
                  {routingLoading ? (
                    <><Loader2 size={13} className="animate-spin" /> PLOTTING OSRM ROUTE...</>
                  ) : (
                    <><Navigation size={13} /> PLOT RESCUE ROUTE</>
                  )}
                </button>
              </div>

              <div className="flex gap-2 pt-2 border-t border-black/40">
                <Link
                  href="/incidents"
                  className="flex-1 py-1.5 bg-[#111C2E] hover:bg-white/10 text-center text-white border border-black text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1 shadow-[2px_2px_0px_#000] transition"
                >
                  <ExternalLink size={11} /> DOSSIER
                </Link>
                <Link
                  href="/tasks"
                  className="flex-1 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-center text-white border border-black text-[11px] font-black uppercase tracking-wider shadow-[2px_2px_0px_#000] transition"
                >
                  TASK UNIT
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-[#111C2E] border-3 border-black shadow-[5px_5px_0px_#000] p-4 text-center">
              <p className="text-white text-xs font-black uppercase tracking-wider mb-1">NO INCIDENT PINNED</p>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Click any coordinate marker on the tactical map to inspect incident telemetry, compute team rescue routes, and review obstacle warnings.
              </p>
            </div>
          )}

          {/* Active Teams Mini Roster */}
          <div className="bg-[#111C2E] border-3 border-black shadow-[5px_5px_0px_#000] p-4">
            <h4 className="text-white font-black text-xs uppercase tracking-wider pb-2 border-b-2 border-black mb-3">
              ACTIVE GPS UNITS ({teams.length})
            </h4>
            <div className="space-y-2">
              {teams.map(t => (
                <div key={t.id} className="bg-black/40 border border-black p-2 flex items-center justify-between">
                  <div>
                    <p className="text-white text-xs font-black">{t.teamName}</p>
                    <p className="text-slate-400 text-[10px]">{t.latitude.toFixed(3)}, {t.longitude.toFixed(3)}</p>
                  </div>
                  <span className="text-[#4ADE80] text-[10px] font-black uppercase bg-[#4ADE80]/10 px-1.5 py-0.5 border border-[#4ADE80]/30">
                    {t.status}
                  </span>
                </div>
              ))}
              {teams.length === 0 && (
                <p className="text-slate-500 text-xs">NO FIELD TEAMS BROADCASTING</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
