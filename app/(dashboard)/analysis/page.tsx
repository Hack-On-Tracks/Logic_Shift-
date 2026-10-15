'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
  Upload, X, ScanSearch, Image as ImageIcon,
  Users, Car, Construction, Eye,
  RefreshCw, Loader2, CheckCircle, Wifi, WifiOff,
  Wind, CloudRain, Thermometer, AlertTriangle, ShieldAlert,
  FileText, ExternalLink, MapPin, Compass, Sparkles, Check,
  Layers, ChevronRight, HelpCircle,
} from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import { formatDateTime, timeAgo, cn } from '@/lib/utils';
import {
  analyzeImageAdaptive, fetchAnalyses, fetchWorkflows, fetchIncidents, fetchHealth,
  ApiAnalysis, ApiAdaptiveAnalysisResult, ApiDisasterWorkflow, ApiIncident,
} from '@/lib/api';
import GuidedWorkflowView from '@/components/workflow/GuidedWorkflowView';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

type FilterClass = 'All' | 'person' | 'vehicle' | 'obstacle';

const getFileName = (path?: string | null, fallbackName?: string | null) => {
  if (fallbackName) return fallbackName;
  if (!path) return 'Unknown image';
  return path.split(/[\\/]/).pop() || 'Unknown image';
};

const getPeopleCount = (ana: ApiAnalysis) =>
  ana.peopleCount ?? (ana.detections ?? []).filter(d => (d.className || '').toLowerCase() === 'person').length ?? 0;

const getVehicleCount = (ana: ApiAnalysis) =>
  ana.vehicleCount ?? (ana.detections ?? []).filter(d => ['car', 'bus', 'truck', 'motorcycle', 'vehicle'].includes((d.className || '').toLowerCase())).length ?? 0;

const getObstacleCount = (ana: ApiAnalysis) =>
  ana.obstacleCount ?? (ana.detections ?? []).filter(d => ['obstacle', 'debris', 'rock', 'block'].some(w => (d.className || '').toLowerCase().includes(w))).length ?? 0;

const PIPELINE_STAGES = [
  { id: 1, label: 'Gemini Vision Classification' },
  { id: 2, label: 'Workflow Registry Resolution' },
  { id: 3, label: 'YOLO Detection & Object Extraction' },
  { id: 4, label: 'Open-Meteo Weather Grounding' },
  { id: 5, label: 'Adaptive Severity Assessment' },
  { id: 6, label: 'Incident Sync & Tactical Tasks' },
  { id: 7, label: 'After-Action Dossier (PDF)' },
];

export default function AdaptiveAnalysisPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [locationName, setLocationName] = useState('');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('');

  const [running, setRunning] = useState(false);
  const [activeStage, setActiveStage] = useState(1);
  const [analyses, setAnalyses] = useState<ApiAnalysis[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [detailAnalysis, setDetailAnalysis] = useState<ApiAnalysis | null>(null);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const [adaptiveResult, setAdaptiveResult] = useState<ApiAdaptiveAnalysisResult | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const [registeredWorkflows, setRegisteredWorkflows] = useState<ApiDisasterWorkflow[]>([]);
  const [workflowModalOpen, setWorkflowModalOpen] = useState(false);
  const [existingIncidents, setExistingIncidents] = useState<ApiIncident[]>([]);
  const [activeMode, setActiveMode] = useState<'guided' | 'audit'>('guided');

  // Load history and registry
  const loadData = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const [hist, wfs, incs, health] = await Promise.allSettled([
        fetchAnalyses(),
        fetchWorkflows(),
        fetchIncidents(),
        fetchHealth(),
      ]);

      if (hist.status === 'fulfilled') {
        setAnalyses((hist.value ?? []).sort((a, b) => {
          const timeB = new Date(b.uploadedAt || b.createdAt || 0).getTime();
          const timeA = new Date(a.uploadedAt || a.createdAt || 0).getTime();
          return timeB - timeA;
        }));
      }

      if (wfs.status === 'fulfilled') setRegisteredWorkflows(wfs.value ?? []);
      if (incs.status === 'fulfilled') setExistingIncidents(incs.value ?? []);
      if (health.status === 'fulfilled') setBackendOk(health.value.geminiAvailable !== undefined);
      else setBackendOk(false);
    } catch {
      setBackendOk(false);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(id);
  }, [toast]);

  function setFileAndPreview(f: File) {
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(f.type)) {
      setToast({ type: 'error', msg: 'Supported aerial images: JPG, JPEG, PNG.' });
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      setToast({ type: 'error', msg: 'Maximum file ceiling is 20 MB.' });
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) setFileAndPreview(f);
  }

  function clearUpload() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null); setPreview(null);
  }

  function useCurrentGPS() {
    if (!navigator.geolocation) {
      setToast({ type: 'error', msg: 'Geolocation not supported by this browser.' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLatitude(pos.coords.latitude.toFixed(5));
        setLongitude(pos.coords.longitude.toFixed(5));
        setToast({ type: 'success', msg: `GPS acquired: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}` });
      },
      err => {
        setToast({ type: 'error', msg: `GPS permission denied or timeout: ${err.message}` });
      }
    );
  }

  // Execute Adaptive Pipeline
  async function handleAdaptiveAnalyze() {
    if (!file) { setToast({ type: 'error', msg: 'Please select a disaster or drone image first.' }); return; }
    setRunning(true);
    setAdaptiveResult(null);
    setActiveStage(1);

    // Staged progress ticker
    const timer = setInterval(() => {
      setActiveStage(curr => (curr < 7 ? curr + 1 : curr));
    }, 1200);

    try {
      const latVal = latitude ? parseFloat(latitude) : undefined;
      const lonVal = longitude ? parseFloat(longitude) : undefined;

      const result = await analyzeImageAdaptive(file, {
        notes,
        location: locationName || undefined,
        latitude: latVal,
        longitude: lonVal,
        incidentId: selectedIncidentId || undefined,
      });

      clearInterval(timer);
      setActiveStage(7);
      setAdaptiveResult(result);

      // Refresh recent analyses
      fetchAnalyses().then(data => {
        setAnalyses((data ?? []).sort((a, b) => {
          const timeB = new Date(b.uploadedAt || b.createdAt || 0).getTime();
          const timeA = new Date(a.uploadedAt || a.createdAt || 0).getTime();
          return timeB - timeA;
        }));
      }).catch(() => {});

      setToast({
        type: 'success',
        msg: `Adaptive AI classified scene as "${result.classification.primaryDisasterType}" (${(result.classification.confidence * 100).toFixed(0)}% confidence).`,
      });
    } catch (err: unknown) {
      clearInterval(timer);
      const msg = err instanceof Error ? err.message : 'Adaptive analysis failed. Check backend status.';
      setToast({ type: 'error', msg });
    } finally {
      setRunning(false);
    }
  }

  const inputCls = 'bg-[#0B1220] border-2 border-black px-3 py-2 text-white text-xs font-mono placeholder-slate-500 shadow-[3px_3px_0px_#000] focus:outline-none focus:border-[#2563EB]';

  return (
    <div className="space-y-6 font-mono">
      {/* Top Banner */}
      <div className={cn(
        'flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-2 border-black p-3.5 shadow-[4px_4px_0px_#000]',
        backendOk === false ? 'bg-[#EF4444]/10 border-[#EF4444]' : 'bg-[#2563EB] text-white'
      )}>
        <div className="flex items-center gap-2.5">
          {backendOk === false ? <WifiOff size={18} className="text-[#EF4444]" /> : <Sparkles size={18} className="text-white" />}
          <div>
            <h1 className="text-xs font-black uppercase tracking-wider">
              LLM-BASED DISASTER IDENTIFICATION & ADAPTIVE AI AUTOMATION
            </h1>
            <p className="text-[10px] opacity-90">
              Gemini Vision classifies disaster type first, then dynamically selects specialized models, weather data, map layers, severity rubrics, and rescue directives.
            </p>
          </div>
        </div>
        <button
          onClick={() => setWorkflowModalOpen(true)}
          className="self-start sm:self-auto px-3 py-1.5 bg-black text-white hover:bg-white hover:text-black text-[10px] font-black uppercase tracking-wider border-2 border-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition flex items-center gap-1.5"
        >
          <Layers size={13} /> WORKFLOW REGISTRY ({registeredWorkflows.length})
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className={cn(
          'flex items-center gap-3 border-2 border-black p-3 shadow-[3px_3px_0px_#000]',
          toast.type === 'success' ? 'bg-[#4ADE80] text-black' : 'bg-[#EF4444] text-white'
        )}>
          {toast.type === 'success' ? <CheckCircle size={16} className="flex-shrink-0" /> : <X size={16} className="flex-shrink-0" />}
          <p className="text-xs font-black uppercase">{toast.msg}</p>
          <button onClick={() => setToast(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* Mode Switcher Tabs */}
      <div className="flex border-2 border-black font-mono text-xs font-black shadow-[4px_4px_0px_#000]">
        <button
          onClick={() => setActiveMode('guided')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-3 px-4 border-r-2 border-black transition cursor-pointer',
            activeMode === 'guided'
              ? 'bg-[#2563EB] text-white shadow-inner'
              : 'bg-[#111C2E] text-slate-400 hover:text-white hover:bg-white/5'
          )}
        >
          <Sparkles size={16} className={activeMode === 'guided' ? 'text-white' : 'text-[#60A5FA]'} />
          <span>⚡ 8-STEP GUIDED AI WORKFLOW (ONE-CLICK & CHECKBOXES)</span>
        </button>
        <button
          onClick={() => setActiveMode('audit')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-3 px-4 transition cursor-pointer',
            activeMode === 'audit'
              ? 'bg-[#2563EB] text-white shadow-inner'
              : 'bg-[#111C2E] text-slate-400 hover:text-white hover:bg-white/5'
          )}
        >
          <FileText size={16} className={activeMode === 'audit' ? 'text-white' : 'text-slate-400'} />
          <span>📋 RECONNAISSANCE AUDIT & HISTORY ARCHIVE ({analyses.length})</span>
        </button>
      </div>

      {activeMode === 'guided' ? (
        <GuidedWorkflowView />
      ) : (
        <>
          {/* Main Grid: Upload & Controls / Live Results */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Ingestion & Telemetry Form */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-[#111C2E] border-2 border-black shadow-[6px_6px_0px_#000] p-5">
            <h2 className="text-white font-black text-xs uppercase tracking-wider mb-4 pb-2 border-b-2 border-black flex items-center justify-between">
              <span>INGEST DISASTER RECONNAISSANCE</span>
              <span className="text-[10px] text-[#2563EB]">STEP 01</span>
            </h2>

            {/* Drag & Drop Upload */}
            {!preview ? (
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'border-2 border-dashed p-8 text-center cursor-pointer transition-all',
                  dragOver ? 'border-[#2563EB] bg-[#2563EB]/15' : 'border-black bg-black/40 hover:bg-black/60 shadow-[4px_4px_0px_#000]'
                )}
              >
                <Upload size={32} className="mx-auto mb-3 text-[#2563EB] stroke-[2.5]" />
                <p className="text-white text-xs font-black uppercase tracking-wider mb-1">
                  DRAG & DROP DISASTER IMAGE OR CLICK TO BROWSE
                </p>
                <p className="text-slate-400 text-[11px]">
                  DRONE PASS · SATELLITE TILE · FIELD PHOTO (JPG, PNG · MAX 20 MB)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) setFileAndPreview(f); }}
                />
              </div>
            ) : (
              <div className="relative border-2 border-black shadow-[4px_4px_0px_#000] bg-black p-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Ingested Disaster Recon" className="w-full h-48 object-cover border border-white/20" />
                <button
                  onClick={clearUpload}
                  className="absolute top-2.5 right-2.5 p-1 border-2 border-black bg-[#EF4444] text-white shadow-[2px_2px_0px_#000] hover:bg-[#DC2626] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
                  title="Remove Image"
                >
                  <X size={14} className="stroke-[3]" />
                </button>
                <div className="mt-2 px-1 pb-1">
                  <p className="text-[#2563EB] text-xs font-black truncate">{file?.name}</p>
                  <p className="text-slate-400 text-[10px]">{file ? (file.size / 1024).toFixed(0) : 0} KB // PAYLOAD BUFFERED</p>
                </div>
              </div>
            )}

            {/* Mission Metadata Fields */}
            <div className="space-y-3 mt-4">
              <div>
                <label className="text-white text-[10px] font-black uppercase tracking-wider block mb-1">
                  SECTOR / LOCATION NAME (OPTIONAL)
                </label>
                <input
                  className={`w-full ${inputCls}`}
                  value={locationName}
                  onChange={e => setLocationName(e.target.value)}
                  placeholder="e.g. Sector 4 East Bridge, Riverdale Basin"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-white text-[10px] font-black uppercase tracking-wider block mb-1">
                    LATITUDE
                  </label>
                  <input
                    className={`w-full ${inputCls}`}
                    value={latitude}
                    onChange={e => setLatitude(e.target.value)}
                    placeholder="19.0760"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-white text-[10px] font-black uppercase tracking-wider block">
                      LONGITUDE
                    </label>
                    <button
                      type="button"
                      onClick={useCurrentGPS}
                      className="text-[9px] text-[#2563EB] hover:underline flex items-center gap-0.5 font-black uppercase"
                    >
                      <Compass size={10} /> USE GPS
                    </button>
                  </div>
                  <input
                    className={`w-full ${inputCls}`}
                    value={longitude}
                    onChange={e => setLongitude(e.target.value)}
                    placeholder="72.8777"
                  />
                </div>
              </div>

              <div>
                <label className="text-white text-[10px] font-black uppercase tracking-wider block mb-1">
                  LINK TO EXISTING INCIDENT (OPTIONAL)
                </label>
                <select
                  className={`w-full ${inputCls}`}
                  value={selectedIncidentId}
                  onChange={e => setSelectedIncidentId(e.target.value)}
                >
                  <option value="">[AUTO-CREATE NEW INCIDENT FROM CLASSIFICATION]</option>
                  {existingIncidents.map(inc => (
                    <option key={inc.id} value={inc.incidentId || String(inc.id)}>
                      {inc.incidentId || inc.id} — {inc.title.slice(0, 32)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-white text-[10px] font-black uppercase tracking-wider block mb-1">
                  OPERATIONAL NOTES / OBSERVER CONTEXT
                </label>
                <textarea
                  className={`w-full ${inputCls} resize-none`}
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Observed debris, water currents, smoke direction..."
                />
              </div>
            </div>

            {/* Execute Button */}
            <button
              onClick={handleAdaptiveAnalyze}
              disabled={running || !file}
              className="w-full mt-5 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[4px_4px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2"
            >
              {running ? (
                <><Loader2 size={16} className="animate-spin" /> EXECUTING ADAPTIVE AUTOMATION PIPELINE...</>
              ) : (
                <><Sparkles size={16} className="stroke-[2.5]" /> EXECUTE ADAPTIVE DISASTER PIPELINE</>
              )}
            </button>
            {!file && (
              <p className="text-slate-400 text-[10px] text-center mt-2 uppercase tracking-wider">
                [SELECT AN AERIAL PASS TO TRIGGER DISASTER CLASSIFICATION]
              </p>
            )}
          </div>
        </div>

        {/* Right: Adaptive Pipeline Progression & Results */}
        <div className="lg:col-span-7 space-y-4">
          {/* Real-time Stage Progression Tracker */}
          {running && (
            <div className="bg-[#111C2E] border-2 border-black shadow-[6px_6px_0px_#000] p-4">
              <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-black">
                <span className="text-white text-xs font-black uppercase tracking-wider flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-[#2563EB]" />
                  AUTONOMOUS TACTICAL PIPELINE RUNNING
                </span>
                <span className="text-[10px] text-[#2563EB] font-black">STAGE {activeStage} / 7</span>
              </div>
              <div className="space-y-1.5">
                {PIPELINE_STAGES.map(stage => (
                  <div
                    key={stage.id}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-1.5 border border-black text-xs font-bold transition-all',
                      activeStage === stage.id
                        ? 'bg-[#2563EB] text-white shadow-[2px_2px_0px_#000]'
                        : activeStage > stage.id
                        ? 'bg-[#4ADE80] text-black opacity-90'
                        : 'bg-black/40 text-slate-500'
                    )}
                  >
                    {activeStage > stage.id ? (
                      <Check size={13} className="stroke-[3]" />
                    ) : activeStage === stage.id ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <span className="w-3 text-[10px] text-center">{stage.id}</span>
                    )}
                    <span className="uppercase tracking-wider text-[11px]">{stage.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Adaptive Results Display */}
          {adaptiveResult ? (
            <div className="space-y-4">
              {/* Classification Hero Card */}
              <div className="bg-[#111C2E] border-2 border-black shadow-[6px_6px_0px_#000] p-5">
                <div className="flex flex-wrap items-start justify-between gap-2 pb-3 mb-3 border-b-2 border-black">
                  <div>
                    <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest block">
                      AI DISASTER CLASSIFICATION
                    </span>
                    <h2 className="text-white text-lg font-black uppercase tracking-wider flex items-center gap-2 mt-0.5">
                      <span>{adaptiveResult.classification.primaryDisasterType}</span>
                      <span className={cn(
                        'px-2 py-0.5 text-[10px] font-black border border-black',
                        adaptiveResult.classification.isUncertain
                          ? 'bg-[#EF4444] text-white'
                          : 'bg-[#4ADE80] text-black'
                      )}>
                        {(adaptiveResult.classification.confidence * 100).toFixed(0)}% ASSURANCE
                      </span>
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-black text-[#38BDF8] border border-black text-[10px] font-black">
                      {adaptiveResult.workflow.workflowId}
                    </span>
                    {adaptiveResult.downstreamSynchronization.reportPdfUrl && (
                      <a
                        href={`${BASE_URL}${adaptiveResult.downstreamSynchronization.reportPdfUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-[#4ADE80] hover:bg-[#22C55E] text-black text-[10px] font-black uppercase border border-black shadow-[2px_2px_0px_#000] flex items-center gap-1 active:translate-x-[1px] active:translate-y-[1px]"
                      >
                        <FileText size={12} /> DOSSIER PDF
                      </a>
                    )}
                  </div>
                </div>

                {/* Multi-hazard tags */}
                {adaptiveResult.classification.secondaryDisasterTypes.length > 0 && (
                  <div className="flex items-center gap-2 mb-3 bg-[#2563EB]/15 border-2 border-[#2563EB] p-2">
                    <AlertTriangle size={14} className="text-[#2563EB] flex-shrink-0" />
                    <span className="text-[10px] font-black text-white uppercase">COMPOUND MULTI-HAZARDS:</span>
                    {adaptiveResult.classification.secondaryDisasterTypes.map(sec => (
                      <span key={sec} className="px-1.5 py-0.5 bg-black text-[#38BDF8] border border-black text-[9px] font-black">
                        + {sec}
                      </span>
                    ))}
                  </div>
                )}

                {/* Supporting Evidence & Uncertainties */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  <div className="bg-black/50 border-2 border-black p-3">
                    <span className="text-[#4ADE80] text-[10px] font-black uppercase tracking-wider block mb-1">
                      SUPPORTING VISUAL EVIDENCE
                    </span>
                    <ul className="text-slate-300 text-[11px] space-y-1 list-disc list-inside">
                      {adaptiveResult.classification.supportingEvidence.map((ev, i) => (
                        <li key={i}>{ev}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-black/50 border-2 border-black p-3">
                    <span className="text-[#EF4444] text-[10px] font-black uppercase tracking-wider block mb-1">
                      UNCERTAINTIES & MISSING EVIDENCE
                    </span>
                    <ul className="text-slate-300 text-[11px] space-y-1 list-disc list-inside">
                      {adaptiveResult.classification.uncertainties.map((un, i) => (
                        <li key={i}>{un}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Human Verification Warning if needed */}
                {adaptiveResult.humanVerificationNeeded && (
                  <div className="bg-[#EF4444] text-white border-2 border-black p-3 mb-4 shadow-[3px_3px_0px_#000]">
                    <div className="flex items-start gap-2">
                      <ShieldAlert size={16} className="flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider">
                          HUMAN COMMANDER VERIFICATION MANDATED
                        </p>
                        <p className="text-[10px] font-mono leading-relaxed mt-0.5">
                          {adaptiveResult.verificationPrompts.join(' ')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Annotated Output Preview */}
                <div className="border-2 border-black bg-black p-1 shadow-[4px_4px_0px_#000]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${BASE_URL}${adaptiveResult.modelExecution.annotatedImageUrl}`}
                    alt="Adaptive Annotated Output"
                    className="w-full max-h-72 object-contain"
                  />
                  <div className="flex items-center justify-between p-2 bg-[#0B1220] border-t border-white/20 text-[10px]">
                    <span className="text-slate-400 uppercase">
                      MODEL: {adaptiveResult.modelExecution.modelDisplayName}
                    </span>
                    <div className="flex gap-2">
                      <span className="text-[#4ADE80] font-black">{adaptiveResult.modelExecution.peopleDetected} VICTIMS</span>
                      <span className="text-[#38BDF8] font-black">{adaptiveResult.modelExecution.vehiclesDetected} VEHICLES</span>
                      <span className="text-[#EF4444] font-black">{adaptiveResult.modelExecution.obstaclesDetected} DEBRIS</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Workflow Details & Environmental Grounding */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Workflow Actions */}
                <div className="bg-[#111C2E] border-2 border-black shadow-[6px_6px_0px_#000] p-4 space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b-2 border-black">
                    <Layers size={14} className="text-[#2563EB]" />
                    <h3 className="text-white text-xs font-black uppercase tracking-wider">
                      {adaptiveResult.workflow.displayName}
                    </h3>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[10px] font-black uppercase block mb-1">
                      RECOMMENDED RESCUE RESOURCES:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {adaptiveResult.workflow.recommendedRescueResources.slice(0, 4).map((res, i) => (
                        <span key={i} className="px-2 py-0.5 bg-black text-white text-[10px] border border-white/20">
                          {res}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[10px] font-black uppercase block mb-1">
                      POTENTIAL SECONDARY HAZARDS:
                    </span>
                    <ul className="text-slate-300 text-[10px] space-y-0.5 list-disc list-inside">
                      {adaptiveResult.workflow.potentialHazards.slice(0, 3).map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[10px] font-black uppercase block mb-1">
                      RELEVANT GIS MAP LAYERS:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {adaptiveResult.workflow.relevantMapLayers.map((layer, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-[#2563EB]/20 text-[#38BDF8] border border-[#2563EB] text-[9px] font-black uppercase">
                          {layer.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Weather & Severity */}
                <div className="bg-[#111C2E] border-2 border-black shadow-[6px_6px_0px_#000] p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b-2 border-black">
                    <div className="flex items-center gap-2">
                      <Thermometer size={14} className="text-[#EF4444]" />
                      <h3 className="text-white text-xs font-black uppercase tracking-wider">
                        METEOROLOGICAL GROUNDING
                      </h3>
                    </div>
                    <span className="text-[10px] text-[#4ADE80] font-black uppercase">
                      {adaptiveResult.weather.condition}
                    </span>
                  </div>

                  {adaptiveResult.weather.available ? (
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-black/50 border border-black p-2">
                        <span className="text-slate-400 text-[9px] block">TEMP</span>
                        <span className="text-white text-xs font-black">{adaptiveResult.weather.temperatureC}°C</span>
                      </div>
                      <div className="bg-black/50 border border-black p-2">
                        <span className="text-slate-400 text-[9px] block">WIND SPEED</span>
                        <span className="text-white text-xs font-black">{adaptiveResult.weather.windSpeedKmh} km/h</span>
                      </div>
                      <div className="bg-black/50 border border-black p-2">
                        <span className="text-slate-400 text-[9px] block">RAIN</span>
                        <span className="text-white text-xs font-black">{adaptiveResult.weather.precipitationMm} mm</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-400 text-[10px] italic">
                      {adaptiveResult.weather.reason || 'Telemetry unconfirmed for this sector.'}
                    </p>
                  )}

                  <p className="text-slate-300 text-[10px] bg-black/40 p-2 border border-black/40">
                    <span className="text-[#2563EB] font-black">IMPACT: </span>
                    {adaptiveResult.weather.riskImpact}
                  </p>

                  <div className="pt-1 border-t border-black/40">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 uppercase font-black">ADAPTIVE SEVERITY SCORE</span>
                      <span className={cn(
                        'px-2 py-0.5 text-xs font-black border border-black',
                        adaptiveResult.severityAssessment.severityLevel === 'Critical' ? 'bg-[#EF4444] text-white' :
                        adaptiveResult.severityAssessment.severityLevel === 'High' ? 'bg-[#2563EB] text-white' :
                        adaptiveResult.severityAssessment.severityLevel === 'Medium' ? 'bg-white text-black' : 'bg-[#94A3B8] text-black'
                      )}>
                        {adaptiveResult.severityAssessment.score} / 10 ({adaptiveResult.severityAssessment.severityLevel.toUpperCase()})
                      </span>
                    </div>
                    <p className="text-slate-500 text-[9px] mt-1 italic">
                      {adaptiveResult.severityAssessment.disclaimer}
                    </p>
                  </div>
                </div>
              </div>

              {/* Auto-Dispatched Directives & Map Link */}
              <div className="bg-[#111C2E] border-2 border-black shadow-[6px_6px_0px_#000] p-4">
                <div className="flex items-center justify-between pb-2 mb-3 border-b-2 border-black">
                  <span className="text-white text-xs font-black uppercase tracking-wider">
                    AUTOMATIC DOWNSTREAM SYNCHRONIZATION ({adaptiveResult.downstreamSynchronization.dispatchedTasksCount} TASKS DISPATCHED)
                  </span>
                  {adaptiveResult.downstreamSynchronization.incidentId && (
                    <Link
                      href="/map"
                      className="text-[10px] text-[#2563EB] hover:underline font-black uppercase flex items-center gap-1"
                    >
                      <MapPin size={12} /> OPEN IN RESCUE MAP
                    </Link>
                  )}
                </div>

                <div className="space-y-2">
                  {adaptiveResult.downstreamSynchronization.dispatchedTasks.map(task => (
                    <div key={task.id} className="flex items-center justify-between bg-black/40 border-2 border-black px-3 py-2">
                      <div>
                        <p className="text-white text-xs font-black">{task.title}</p>
                        <p className="text-slate-400 text-[10px]">CORPS: {task.team} · REF: {task.id}</p>
                      </div>
                      <span className={cn(
                        'px-2 py-0.5 text-[9px] font-black border border-black',
                        task.priority === 'Critical' ? 'bg-[#EF4444] text-white' :
                        task.priority === 'High' ? 'bg-[#2563EB] text-white' : 'bg-white text-black'
                      )}>
                        {task.priority.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#111C2E] border-2 border-black shadow-[6px_6px_0px_#000] p-8 text-center">
              <ScanSearch size={40} className="mx-auto mb-3 text-slate-500" />
              <h3 className="text-white text-sm font-black uppercase tracking-wider mb-1">
                ADAPTIVE AUTOMATION STANDBY
              </h3>
              <p className="text-slate-400 text-xs max-w-md mx-auto">
                Ingest an aerial pass on the left and trigger the pipeline.
                The Gemini vision model will classify the disaster and autonomously configure detection models, weather telemetry, and task directives.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Processed Reconnaissance History */}
      <div className="bg-[#111C2E] border-2 border-black shadow-[6px_6px_0px_#000] overflow-hidden mt-8">
        <div className="px-5 py-3.5 bg-[#0B1220] border-b-2 border-black flex items-center justify-between">
          <h2 className="text-white font-black text-xs uppercase tracking-wider">
            MISSION AUDIT LOGS & PROCESSED RECON
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-[#2563EB] text-xs font-black">{analyses.length} ARCHIVES</span>
            <button
              onClick={loadData}
              className="p-1.5 border-2 border-black bg-[#0B1220] text-slate-400 hover:bg-white/10 shadow-[2px_2px_0px_#000] active:shadow-none transition"
              title="Refresh Recon"
            >
              <RefreshCw size={12} />
            </button>
          </div>
        </div>

        {loadingHistory ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin text-[#2563EB]" />
          </div>
        ) : analyses.length === 0 ? (
          <EmptyState
            icon={ImageIcon}
            title="NO AERIAL PASSES PROCESSED"
            description="Upload an image and run adaptive disaster detection to populate recon logs."
          />
        ) : (
          <div className="divide-y-2 divide-black">
            {analyses.map(ana => {
              const pCount = getPeopleCount(ana);
              const vCount = getVehicleCount(ana);
              const oCount = getObstacleCount(ana);
              const fileName = getFileName(ana.filePath || ana.imagePath, ana.fileName);
              const modelName = ana.modelName || ana.modelUsed || 'YOLOv8s';
              const timestamp = ana.uploadedAt || ana.createdAt;
              const timeDisplay = timestamp ? timeAgo(timestamp) : 'Recently';

              return (
                <div key={ana.id ?? ana.analysisId ?? Math.random()} className="p-4 hover:bg-white/5 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-white text-xs font-black truncate">{fileName}</p>
                        <span className="px-1.5 py-0.5 bg-[#2563EB] text-white border border-black text-[9px] font-black uppercase">
                          AI RECON
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px]">{modelName} · {timeDisplay}</p>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className="flex items-center gap-1.5 px-2 py-0.5 bg-[#4ADE80] text-black font-black text-[10px] border border-black shadow-[1px_1px_0px_#000]">
                          <Users size={12} />{pCount} VICTIMS
                        </span>
                        <span className="flex items-center gap-1.5 px-2 py-0.5 bg-[#38BDF8] text-black font-black text-[10px] border border-black shadow-[1px_1px_0px_#000]">
                          <Car size={12} />{vCount} VEHICLES
                        </span>
                        <span className="flex items-center gap-1.5 px-2 py-0.5 bg-[#FACC15] text-black font-black text-[10px] border border-black shadow-[1px_1px_0px_#000]">
                          <Construction size={12} />{oCount} DEBRIS
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => setDetailAnalysis(ana)}
                        className="p-1.5 border border-black bg-white/10 hover:bg-[#38BDF8] text-white hover:text-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
                        title="Inspect Recon Detail"
                      >
                        <Eye size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </>
      )}

      {/* Workflow Registry Modal */}
      <Modal open={workflowModalOpen} onClose={() => setWorkflowModalOpen(false)} title="DISASTER WORKFLOW REGISTRY" size="xl">
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto font-mono">
          <p className="text-slate-400 text-xs">
            RescueVision AI maintains a central registry of 10 configurable disaster workflows.
            When an image is ingested, Gemini Vision classifies the primary and secondary hazards and binds the corresponding workflow.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {registeredWorkflows.map(wf => (
              <div key={wf.workflowId} className="bg-black/60 border-2 border-black p-3.5 shadow-[3px_3px_0px_#000]">
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-white text-xs font-black uppercase tracking-wider">{wf.displayName}</h4>
                  <span className="px-1.5 py-0.5 bg-[#2563EB] text-white text-[9px] font-black border border-black">
                    {wf.workflowId}
                  </span>
                </div>
                <p className="text-slate-300 text-[11px] mb-2">{wf.description}</p>
                <div className="space-y-1 text-[10px]">
                  <p className="text-slate-400"><strong className="text-white">CATEGORY:</strong> {wf.category}</p>
                  <p className="text-slate-400"><strong className="text-white">CLASSES:</strong> {wf.supportedClasses?.join(', ') || 'person, car, truck, obstacle'}</p>
                  <p className="text-slate-400"><strong className="text-white">RESCUE SQUADS:</strong> {wf.recommendedRescueResources?.slice(0, 2).join(', ')}</p>
                  <p className="text-slate-400"><strong className="text-white">MAP LAYERS:</strong> {wf.relevantMapLayers?.slice(0, 2).join(', ')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Detail Recon Modal */}
      <Modal open={!!detailAnalysis} onClose={() => setDetailAnalysis(null)} title={`AERIAL RECON — ${detailAnalysis?.id ?? detailAnalysis?.analysisId ?? 'RECORD'}`} size="lg">
        {detailAnalysis && (
          <div className="p-6 space-y-4 font-mono">
            {detailAnalysis.annotatedPath && (
              <div className="border-2 border-black bg-black p-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${BASE_URL}${detailAnalysis.annotatedPath}`}
                  alt="Annotated"
                  className="w-full max-h-64 object-contain"
                />
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#4ADE80] text-black border-2 border-black p-3 text-center">
                <p className="text-2xl font-black">{getPeopleCount(detailAnalysis)}</p>
                <p className="text-[10px] font-black uppercase">VICTIMS</p>
              </div>
              <div className="bg-[#38BDF8] text-black border-2 border-black p-3 text-center">
                <p className="text-2xl font-black">{getVehicleCount(detailAnalysis)}</p>
                <p className="text-[10px] font-black uppercase">VEHICLES</p>
              </div>
              <div className="bg-[#EF4444] text-white border-2 border-black p-3 text-center">
                <p className="text-2xl font-black">{getObstacleCount(detailAnalysis)}</p>
                <p className="text-[10px] font-black uppercase">OBSTACLES</p>
              </div>
            </div>
            <div className="border-2 border-black bg-black/40 p-3 text-xs space-y-1">
              <p><strong className="text-slate-400">MODEL:</strong> {detailAnalysis.modelName || 'YOLOv8s'}</p>
              <p><strong className="text-slate-400">RECORDED:</strong> {detailAnalysis.uploadedAt ? formatDateTime(detailAnalysis.uploadedAt) : 'Recently'}</p>
              {detailAnalysis.notes && <p><strong className="text-slate-400">NOTES:</strong> {detailAnalysis.notes}</p>}
            </div>
            <button
              onClick={() => setDetailAnalysis(null)}
              className="w-full py-2.5 border-2 border-black bg-white/10 text-white font-black text-xs uppercase"
            >
              CLOSE
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
