'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload, X, ScanSearch, Image as ImageIcon,
  Users, Car, Construction, Info, Trash2, Eye,
  RefreshCw, Loader2, CheckCircle, Wifi, WifiOff,
} from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { formatDateTime, timeAgo, cn } from '@/lib/utils';
import { analyzeImage, fetchAnalyses, ApiAnalysis, fetchHealth } from '@/lib/api';

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

// ─── Detection Detail Modal ───────────────────────────────────
function AnalysisDetail({ analysis, onClose }: { analysis: ApiAnalysis; onClose: () => void }) {
  const [filter, setFilter] = useState<FilterClass>('All');
  const detections = (analysis.detections ?? []).filter(d =>
    filter === 'All' || d.className.toLowerCase() === filter
  );
  const rawAnnotated = analysis.annotatedPath || analysis.annotatedImagePath;
  const annotatedUrl = rawAnnotated
    ? (rawAnnotated.startsWith('http') ? rawAnnotated : `${BASE_URL}${rawAnnotated.startsWith('/') ? '' : '/'}${rawAnnotated}`)
    : null;

  const people = getPeopleCount(analysis);
  const vehicles = getVehicleCount(analysis);
  const obstacles = getObstacleCount(analysis);
  const model = analysis.modelName || analysis.modelUsed || 'YOLOv8s';
  const timestamp = analysis.uploadedAt || analysis.createdAt;

  return (
    <div className="p-6 space-y-4 font-mono">
      {/* Annotated image */}
      {annotatedUrl && (
        <div className="border-2 border-black shadow-[3px_3px_0px_#000] bg-black p-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={annotatedUrl} alt="Annotated" className="w-full max-h-64 object-contain" />
          <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider text-center">YOLO ANNOTATED OUTPUT</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {([
          ['VICTIMS', 'person', 'text-black', 'bg-[#4ADE80]', people],
          ['VEHICLES', 'vehicle', 'text-black', 'bg-[#38BDF8]', vehicles],
          ['OBSTACLES', 'obstacle', 'text-white', 'bg-[#EF4444]', obstacles],
        ] as const).map(([label, cls, color, bg, count]) => (
          <div key={cls} className={`${bg} border-2 border-black p-3 text-center shadow-[3px_3px_0px_#000]`}>
            <p className={`text-2xl font-black ${color}`}>{count}</p>
            <p className={`text-[10px] font-black uppercase tracking-wider ${color}`}>{label}</p>
          </div>
        ))}
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 gap-3">
        <div className="border-2 border-black bg-black/40 p-3">
          <p className="text-[10px] text-slate-400 uppercase font-black mb-0.5">MODEL USED</p>
          <p className="text-white text-xs font-black">{model}</p>
        </div>
        <div className="border-2 border-black bg-black/40 p-3">
          <p className="text-[10px] text-slate-400 uppercase font-black mb-0.5">TIMESTAMP</p>
          <p className="text-white text-xs">{timestamp ? formatDateTime(timestamp) : '—'}</p>
        </div>
        {(analysis.notes || analysis.analysisNotes) && (
          <div className="col-span-2 border-2 border-black bg-black/40 p-3">
            <p className="text-[10px] text-slate-400 uppercase font-black mb-1">NOTES</p>
            <p className="text-slate-300 text-xs">{analysis.notes || analysis.analysisNotes}</p>
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['All', 'person', 'vehicle', 'obstacle'] as FilterClass[]).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn(
              'px-3 py-1.5 text-[10px] font-black uppercase tracking-wider border-2 border-black transition-all shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none',
              filter === f ? 'bg-[#2563EB] text-white' : 'bg-black text-slate-300 hover:text-white'
            )}>
            {f}
          </button>
        ))}
      </div>

      {/* Detection list */}
      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {detections.length === 0 ? (
          <p className="text-slate-400 text-xs text-center py-4 uppercase">NO DETECTIONS FOR THIS CLASS.</p>
        ) : detections.map(d => (
          <div key={d.id} className="flex items-center justify-between bg-black/60 border-2 border-black px-3.5 py-2 shadow-[2px_2px_0px_#000]">
            <div className="flex items-center gap-2.5">
              {d.className.toLowerCase() === 'person' && <Users size={14} className="text-[#4ADE80]" />}
              {d.className.toLowerCase() === 'vehicle' && <Car size={14} className="text-[#38BDF8]" />}
              {(d.className.toLowerCase() === 'obstacle' || !['person','vehicle'].includes(d.className.toLowerCase())) && <Construction size={14} className="text-[#EF4444]" />}
              <span className="text-white text-xs font-black uppercase tracking-wider">{d.className}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-20 h-2.5 bg-black border border-white/20 overflow-hidden">
                <div className="h-full bg-[#2563EB]" style={{ width: `${d.confidence * 100}%` }} />
              </div>
              <span className="text-[#2563EB] text-xs font-black w-8 text-right">
                {Math.round(d.confidence * 100)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      <button onClick={onClose}
        className="w-full py-2.5 border-2 border-black bg-white/10 text-white font-black text-xs uppercase tracking-wider shadow-[3px_3px_0px_#000] hover:bg-white/20 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all">
        CLOSE WINDOW
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function AnalysisPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [running, setRunning] = useState(false);
  const [analyses, setAnalyses] = useState<ApiAnalysis[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [detailAnalysis, setDetailAnalysis] = useState<ApiAnalysis | null>(null);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const [lastResult, setLastResult] = useState<ApiAnalysis | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Load history from backend
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const data = await fetchAnalyses();
      setAnalyses((data ?? []).sort((a, b) => {
        const timeB = new Date(b.uploadedAt || b.createdAt || 0).getTime();
        const timeA = new Date(a.uploadedAt || a.createdAt || 0).getTime();
        return timeB - timeA;
      }));
    } catch {
      // silently fail — user will see empty state
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
    fetchHealth().then(h => setBackendOk(h.geminiAvailable !== undefined)).catch(() => setBackendOk(false));
  }, [loadHistory]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
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

  async function handleAnalyze() {
    if (!file) { setToast({ type: 'error', msg: 'No image selected.' }); return; }
    setRunning(true);
    setLastResult(null);
    try {
      const result = await analyzeImage(file, undefined);
      setLastResult(result);
      setAnalyses(prev => [result, ...prev]);
      const pCount = getPeopleCount(result);
      const vCount = getVehicleCount(result);
      const oCount = getObstacleCount(result);
      const total = result.totalDetections ?? (pCount + vCount + oCount);
      setToast({ type: 'success', msg: `YOLO detected ${total} objects (${pCount} people, ${vCount} vehicles, ${oCount} obstacles).` });
      clearUpload();
      setNotes('');
    } catch (err) {
      setToast({ type: 'error', msg: 'Vision analysis failed. Check if API server is running.' });
    } finally {
      setRunning(false);
    }
  }

  const inputCls = 'bg-[#0B1220] border-2 border-black px-3 py-2 text-white text-xs font-mono placeholder-slate-500 shadow-[3px_3px_0px_#000] focus:outline-none focus:border-[#2563EB]';

  return (
    <div className="space-y-6 font-mono">
      {/* Backend status banner */}
      <div className={cn(
        'flex items-start gap-3 border-2 border-black p-3.5 shadow-[4px_4px_0px_#000]',
        backendOk === false ? 'bg-[#EF4444]/10' : 'bg-[#2563EB]'
      )}>
        {backendOk === false
          ? <WifiOff size={18} className="flex-shrink-0 mt-0.5 text-[#EF4444]" />
          : <Wifi size={18} className="flex-shrink-0 mt-0.5 text-white" />}
        <p className="text-xs font-black uppercase tracking-wider leading-relaxed text-white">
          {backendOk === false
            ? 'API BACKEND OFFLINE — Start the FastAPI server to enable real YOLO inference.'
            : 'REAL-TIME YOLO INFERENCE ACTIVE — Upload an aerial image to run object detection via the backend AI engine.'}
        </p>
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

      {/* Last result quick view */}
      {lastResult && (
        <div className="bg-[#111C2E] border-2 border-[#4ADE80] shadow-[4px_4px_0px_#000] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle size={14} className="text-[#4ADE80]" />
              <h3 className="text-white text-xs font-black uppercase tracking-wider">LAST ANALYSIS RESULT</h3>
              <span className="px-1.5 py-0.5 bg-[#4ADE80] text-black text-[9px] font-black border border-black">LIVE YOLO</span>
            </div>
            <button onClick={() => setDetailAnalysis(lastResult)}
              className="text-[10px] text-[#2563EB] font-black uppercase hover:underline flex items-center gap-1">
              <Eye size={12} /> VIEW FULL
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              ['VICTIMS', getPeopleCount(lastResult), 'bg-[#4ADE80] text-black'],
              ['VEHICLES', getVehicleCount(lastResult), 'bg-[#38BDF8] text-black'],
              ['OBSTACLES', getObstacleCount(lastResult), 'bg-[#EF4444] text-white'],
            ].map(([label, count, cls]) => (
              <div key={String(label)} className={cn('border-2 border-black p-3 text-center shadow-[2px_2px_0px_#000]', String(cls))}>
                <p className="text-2xl font-black">{count}</p>
                <p className="text-[10px] font-black uppercase tracking-wider">{label}</p>
              </div>
            ))}
          </div>
          <p className="text-slate-500 text-[10px] mt-2 uppercase">MODEL: {lastResult.modelName || lastResult.modelUsed || 'YOLOv8s'}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Upload panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#111C2E] border-2 border-black shadow-[6px_6px_0px_#000] p-5">
            <h2 className="text-white font-black text-xs uppercase tracking-wider mb-4 pb-2 border-b-2 border-black">
              INGEST AERIAL SURVEY IMAGE
            </h2>

            {!preview ? (
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'border-2 border-dashed p-8 text-center cursor-pointer transition-all',
                  dragOver ? 'border-[#2563EB] bg-[#2563EB]/15' : 'border-black bg-black/40 hover:bg-black/60 shadow-[4px_4px_0px_#000]'
                )}>
                <Upload size={32} className="mx-auto mb-3 text-[#2563EB] stroke-[2.5]" />
                <p className="text-white text-xs font-black uppercase tracking-wider mb-1">DRAG & DROP DRONE FEED OR CLICK</p>
                <p className="text-slate-400 text-[11px]">JPG, JPEG, PNG · MAX 20 MB</p>
                <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) setFileAndPreview(f); }} />
              </div>
            ) : (
              <div className="relative border-2 border-black shadow-[4px_4px_0px_#000] bg-black p-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Drone Feed Preview" className="w-full h-48 object-cover border border-white/20" />
                <button onClick={clearUpload}
                  className="absolute top-2.5 right-2.5 p-1 border-2 border-black bg-[#EF4444] text-white shadow-[2px_2px_0px_#000] hover:bg-[#DC2626] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all">
                  <X size={14} className="stroke-[3]" />
                </button>
                <div className="mt-2 px-1 pb-1">
                  <p className="text-[#2563EB] text-xs font-black truncate">{file?.name}</p>
                  <p className="text-slate-400 text-[10px]">{file ? (file.size / 1024).toFixed(0) : 0} KB // PAYLOAD READY</p>
                </div>
              </div>
            )}

            <div className="space-y-3 mt-4">
              <div>
                <label className="text-white text-xs font-black uppercase tracking-wider block mb-1">MISSION LOG NOTES</label>
                <textarea className={`w-full ${inputCls} resize-none`} rows={2} value={notes}
                  onChange={e => setNotes(e.target.value)} placeholder="Visual observations or mission context..." />
              </div>
            </div>

            <button onClick={handleAnalyze} disabled={running || !file}
              className="w-full mt-5 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[4px_4px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2">
              {running ? (
                <><Loader2 size={16} className="animate-spin" /> EXECUTING YOLO AI...</>
              ) : (
                <><ScanSearch size={16} className="stroke-[3]" /> RUN YOLO DETECTION</>
              )}
            </button>
            {!file && (
              <p className="text-slate-400 text-[10px] text-center mt-2 uppercase tracking-wider">[UPLOAD AERIAL IMAGE TO PROCEED]</p>
            )}
          </div>
        </div>

        {/* Right: History */}
        <div className="lg:col-span-3">
          <div className="bg-[#111C2E] border-2 border-black shadow-[6px_6px_0px_#000] overflow-hidden">
            <div className="px-5 py-3.5 bg-[#0B1220] border-b-2 border-black flex items-center justify-between">
              <h2 className="text-white font-black text-xs uppercase tracking-wider">PROCESSED AERIAL RECONNAISSANCE</h2>
              <div className="flex items-center gap-3">
                <span className="text-[#2563EB] text-xs font-black">{analyses.length} ARCHIVES</span>
                <button onClick={loadHistory} className="p-1.5 border-2 border-black bg-[#0B1220] text-slate-400 hover:bg-white/10 shadow-[2px_2px_0px_#000] active:shadow-none transition">
                  <RefreshCw size={12} />
                </button>
              </div>
            </div>
            {loadingHistory ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={20} className="animate-spin text-[#2563EB]" />
              </div>
            ) : analyses.length === 0 ? (
              <EmptyState icon={ImageIcon} title="NO AERIAL PASSES PROCESSED"
                description="Upload an image and run YOLO detection to populate recon logs." />
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
                            <span className="px-1.5 py-0.5 bg-[#2563EB] text-white border border-black text-[9px] font-black uppercase">YOLO</span>
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
                          <button onClick={() => setDetailAnalysis(ana)}
                            className="p-1.5 border border-black bg-white/10 hover:bg-[#38BDF8] text-white hover:text-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all">
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
        </div>
      </div>

      {/* Detail Modal */}
      <Modal open={!!detailAnalysis} onClose={() => setDetailAnalysis(null)} title={`AERIAL RECON — ${detailAnalysis?.id ?? detailAnalysis?.analysisId ?? 'RECORD'}`} size="lg">
        {detailAnalysis && (
          <AnalysisDetail analysis={detailAnalysis} onClose={() => setDetailAnalysis(null)} />
        )}
      </Modal>
    </div>
  );
}
