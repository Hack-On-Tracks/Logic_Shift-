'use client';
import { useState, useRef, useCallback, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Upload, X, ScanSearch, Image as ImageIcon,
  Users, Car, Construction, Info, Trash2, Eye,
} from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { formatDateTime, timeAgo } from '@/lib/utils';
import { ImageAnalysis } from '@/lib/types';
import { SAMPLE_DETECTIONS } from '@/lib/mockData';

const DEMO_NOTE = 'DEMO VISION PIPELINE // RESULTS SHOWN ARE DERIVED FROM CALIBRATED SIMULATION SEEDS. NO LIVE NEURAL MODEL CONNECTED IN PHASE 1.';

type FilterClass = 'All' | 'Person' | 'Vehicle' | 'Obstacle';

function AnalysisDetail({ analysis, incidentTitle, onClose }: {
  analysis: ImageAnalysis;
  incidentTitle: string;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState<FilterClass>('All');
  const detections = analysis.detections.filter(d => filter === 'All' || d.className === filter);

  return (
    <div className="p-6 space-y-4 font-mono">
      {analysis.isDemoResult && (
        <div className="flex items-start gap-2 bg-[#FACC15] text-black border-2 border-black p-3 shadow-[3px_3px_0px_#000]">
          <Info size={16} className="mt-0.5 flex-shrink-0" />
          <p className="text-xs font-black leading-snug">{DEMO_NOTE}</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="border-2 border-black bg-black/40 p-3 shadow-[2px_2px_0px_#000]">
          <p className="text-slate-400 text-[10px] font-black uppercase mb-0.5">LINKED INCIDENT</p>
          <p className="text-white text-xs font-black">{incidentTitle}</p>
        </div>
        <div className="border-2 border-black bg-black/40 p-3 shadow-[2px_2px_0px_#000]">
          <p className="text-slate-400 text-[10px] font-black uppercase mb-0.5">TIMESTAMP</p>
          <p className="text-white text-xs font-black">{formatDateTime(analysis.uploadedAt)}</p>
        </div>
        <div className="border-2 border-black bg-black/40 p-3 shadow-[2px_2px_0px_#000]">
          <p className="text-slate-400 text-[10px] font-black uppercase mb-0.5">PAYLOAD FILENAME</p>
          <p className="text-[#F47B20] text-xs font-black">{analysis.fileName}</p>
        </div>
        <div className="border-2 border-black bg-black/40 p-3 shadow-[2px_2px_0px_#000]">
          <p className="text-slate-400 text-[10px] font-black uppercase mb-0.5">TARGET ZONE</p>
          <p className="text-white text-xs font-black">{analysis.location || '—'}</p>
        </div>
      </div>

      {/* Detection summary blocks */}
      <div className="grid grid-cols-3 gap-3">
        {([['VICTIMS', 'Person', 'text-black', 'bg-[#4ADE80]'], ['VEHICLES', 'Vehicle', 'text-black', 'bg-[#38BDF8]'], ['OBSTACLES', 'Obstacle', 'text-black', 'bg-[#FACC15]']] as const).map(([label, cls, color, bg]) => (
          <div key={cls} className={`${bg} border-2 border-black p-3 text-center shadow-[3px_3px_0px_#000]`}>
            <p className={`text-2xl font-black ${color}`}>{analysis.detections.filter(d => d.className === cls).length}</p>
            <p className="text-black text-[10px] font-black uppercase tracking-wider">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['All', 'Person', 'Vehicle', 'Obstacle'] as FilterClass[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-black transition-all shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${filter === f ? 'bg-[#F47B20] text-black' : 'bg-black text-slate-300 hover:text-white'}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Detection list */}
      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {detections.length === 0 ? (
          <p className="text-slate-400 text-xs text-center py-4 uppercase">NO DETECTIONS FOR THIS CLASS FILTER.</p>
        ) : detections.map(d => (
          <div key={d.id} className="flex items-center justify-between bg-black/60 border-2 border-black px-3.5 py-2 shadow-[2px_2px_0px_#000]">
            <div className="flex items-center gap-2.5">
              {d.className === 'Person' && <Users size={14} className="text-[#4ADE80]" />}
              {d.className === 'Vehicle' && <Car size={14} className="text-[#38BDF8]" />}
              {d.className === 'Obstacle' && <Construction size={14} className="text-[#FACC15]" />}
              <span className="text-white text-xs font-black uppercase tracking-wider">{d.className}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-20 h-2.5 bg-black border border-white/20 overflow-hidden">
                <div className="h-full bg-[#F47B20]" style={{ width: `${d.confidence * 100}%` }} />
              </div>
              <span className="text-[#F47B20] text-xs font-black w-8 text-right">{Math.round(d.confidence * 100)}%</span>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onClose}
        className="w-full py-2.5 border-2 border-black bg-white/10 text-white font-black text-xs uppercase tracking-wider shadow-[3px_3px_0px_#000] hover:bg-white/20 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
      >
        CLOSE WINDOW
      </button>
    </div>
  );
}

export default function AnalysisPage() {
  const { incidents, analyses, addAnalysis, deleteAnalysis, showToast } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [running, setRunning] = useState(false);
  const [detailAnalysis, setDetailAnalysis] = useState<ImageAnalysis | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const setFileAndPreview = useCallback((f: File) => {
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(f.type)) {
      showToast({ type: 'error', title: 'INVALID FORMAT', message: 'Supported aerial images: JPG, JPEG, PNG.' });
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      showToast({ type: 'error', title: 'PAYLOAD TOO LARGE', message: 'Maximum file ceiling is 20 MB.' });
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }, [preview, showToast]);

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
    if (!file) { showToast({ type: 'error', title: 'NO IMAGE SELECTED' }); return; }
    if (!selectedIncident) { showToast({ type: 'error', title: 'NO INCIDENT LINKED' }); return; }
    setRunning(true);
    await new Promise(r => setTimeout(r, 1600));
    addAnalysis({
      incidentId: selectedIncident,
      fileName: file.name,
      originalImagePreview: preview ?? undefined,
      uploadedAt: new Date().toISOString(),
      analysisStatus: 'completed',
      isDemoResult: true,
      detections: SAMPLE_DETECTIONS.slice(0, Math.floor(Math.random() * 4) + 2),
      location: location || undefined,
      notes: notes || undefined,
    });
    setRunning(false);
    clearUpload();
    setSelectedIncident(''); setLocation(''); setNotes('');
    showToast({ type: 'success', title: 'SIMULATED VISION COMPLETE', message: 'Sample detection bounding vectors generated.' });
  }

  function handleDelete() {
    if (!deleteId) return;
    deleteAnalysis(deleteId);
    showToast({ type: 'success', title: 'ANALYSIS EXPUNGED' });
    setDeleteId(null);
  }

  const incidentMap = useMemo(() => Object.fromEntries(incidents.map(i => [i.id, i.title])), [incidents]);

  const inputCls = 'bg-[#0B1220] border-2 border-black px-3 py-2 text-white text-xs font-mono placeholder-slate-500 shadow-[3px_3px_0px_#000] focus:outline-none focus:border-[#F47B20]';

  return (
    <div className="space-y-6 font-mono">
      {/* Demo disclaimer banner */}
      <div className="flex items-start gap-3 bg-[#FACC15] text-black border-2 border-black p-3.5 shadow-[4px_4px_0px_#000]">
        <Info size={18} className="flex-shrink-0 mt-0.5 stroke-[2.5]" />
        <p className="text-xs font-black uppercase tracking-wider leading-relaxed">
          PHASE 1 TACTICAL INTERFACE // AERIAL VISION INFERENCE SIMULATED WITH CALIBRATED DEMO VECTORS. NO LIVE TENSOR BACKEND ATTACHED.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Upload panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#111C2E] border-3 border-black shadow-[6px_6px_0px_#000] p-5">
            <h2 className="text-white font-black text-xs uppercase tracking-wider mb-4 pb-2 border-b-2 border-black">
              INGEST AERIAL SURVEY IMAGE
            </h2>

            {/* Drop zone */}
            {!preview ? (
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-3 border-dashed p-8 text-center cursor-pointer transition-all ${dragOver ? 'border-[#F47B20] bg-[#F47B20]/15' : 'border-black bg-black/40 hover:bg-black/60 shadow-[4px_4px_0px_#000]'}`}
              >
                <Upload size={32} className="mx-auto mb-3 text-[#F47B20] stroke-[2.5]" />
                <p className="text-white text-xs font-black uppercase tracking-wider mb-1">DRAG & DROP DRONE FEED OR CLICK</p>
                <p className="text-slate-400 text-[11px]">JPG, JPEG, PNG · MAX CEILING 20 MB</p>
                <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) setFileAndPreview(f); }} />
              </div>
            ) : (
              <div className="relative border-2 border-black shadow-[4px_4px_0px_#000] bg-black p-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Drone Feed Preview" className="w-full h-48 object-cover border border-white/20" />
                <button
                  onClick={clearUpload}
                  className="absolute top-2.5 right-2.5 p-1 border-2 border-black bg-[#EF4444] text-black shadow-[2px_2px_0px_#000] hover:bg-[#DC2626] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
                >
                  <X size={14} className="stroke-[3]" />
                </button>
                <div className="mt-2 px-1 pb-1">
                  <p className="text-[#F47B20] text-xs font-black truncate">{file?.name}</p>
                  <p className="text-slate-400 text-[10px]">{file ? (file.size / 1024).toFixed(0) : 0} KB // PAYLOAD READY</p>
                </div>
              </div>
            )}

            {/* Config fields */}
            <div className="space-y-3 mt-4">
              <div>
                <label className="text-white text-xs font-black uppercase tracking-wider block mb-1">ASSOCIATED INCIDENT *</label>
                <select className={`w-full ${inputCls}`} value={selectedIncident} onChange={e => setSelectedIncident(e.target.value)}>
                  <option value="">[SELECT ACTIVE TARGET INCIDENT]</option>
                  {incidents.map(i => <option key={i.id} value={i.id}>{`${i.id} // ${i.title}`}</option>)}
                </select>
              </div>
              <div>
                <label className="text-white text-xs font-black uppercase tracking-wider block mb-1">GRID COORDINATES // ZONE</label>
                <input className={`w-full ${inputCls}`} value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Sector 4, North Zone" />
              </div>
              <div>
                <label className="text-white text-xs font-black uppercase tracking-wider block mb-1">MISSION LOG NOTES</label>
                <textarea className={`w-full ${inputCls} resize-none`} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Visual observations or mission context..." />
              </div>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={running || !file || !selectedIncident}
              className="w-full mt-5 py-3 bg-[#F47B20] hover:bg-[#FFA154] disabled:opacity-40 disabled:cursor-not-allowed text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-[4px_4px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2"
            >
              {running ? (
                <><div className="w-4 h-4 border-2 border-black border-t-transparent animate-spin" /> EXECUTING COMPUTER VISION...</>
              ) : (
                <><ScanSearch size={16} className="stroke-[3]" /> RUN COMPUTER VISION PASS</>
              )}
            </button>
            {(!file || !selectedIncident) && (
              <p className="text-slate-400 text-[10px] text-center mt-2 uppercase tracking-wider">
                {!file ? '[UPLOAD AERIAL IMAGE TO PROCEED]' : '[LINK TO AN INCIDENT TO PROCEED]'}
              </p>
            )}
          </div>
        </div>

        {/* Right: History */}
        <div className="lg:col-span-3">
          <div className="bg-[#111C2E] border-3 border-black shadow-[6px_6px_0px_#000] overflow-hidden">
            <div className="px-5 py-3.5 bg-[#0B1220] border-b-2 border-black flex items-center justify-between">
              <h2 className="text-white font-black text-xs uppercase tracking-wider">PROCESSED AERIAL RECONNAISSANCE</h2>
              <span className="text-[#F47B20] text-xs font-black">{analyses.length} ARCHIVES</span>
            </div>
            {analyses.length === 0 ? (
              <EmptyState icon={ImageIcon} title="NO AERIAL PASSES PROCESSED" description="INGEST AN IMAGE PAYLOAD AND EXECUTE THE VISION PASS TO POPULATE RECON LOGS." />
            ) : (
              <div className="divide-y-2 divide-black">
                {analyses.map(ana => {
                  const people = ana.detections.filter(d => d.className === 'Person').length;
                  const vehicles = ana.detections.filter(d => d.className === 'Vehicle').length;
                  const obstacles = ana.detections.filter(d => d.className === 'Obstacle').length;
                  return (
                    <div key={ana.id} className="p-4 hover:bg-white/5 transition">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-white text-xs font-black truncate">{ana.fileName}</p>
                            {ana.isDemoResult && (
                              <span className="px-1.5 py-0.2 bg-[#FACC15] text-black border border-black text-[9px] font-black uppercase">DEMO</span>
                            )}
                          </div>
                          <p className="text-slate-400 text-[11px]">{incidentMap[ana.incidentId] || ana.incidentId} · {timeAgo(ana.uploadedAt)}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-[#4ADE80] text-black font-black text-[10px] border border-black shadow-[1px_1px_0px_#000]"><Users size={12} />{people} VICTIMS</span>
                            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-[#38BDF8] text-black font-black text-[10px] border border-black shadow-[1px_1px_0px_#000]"><Car size={12} />{vehicles} VEHICLES</span>
                            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-[#FACC15] text-black font-black text-[10px] border border-black shadow-[1px_1px_0px_#000]"><Construction size={12} />{obstacles} DEBRIS</span>
                          </div>
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                          <button onClick={() => setDetailAnalysis(ana)} className="p-1.5 border border-black bg-white/10 hover:bg-[#38BDF8] text-white hover:text-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"><Eye size={14} /></button>
                          <button onClick={() => setDeleteId(ana.id)} className="p-1.5 border border-black bg-white/10 hover:bg-[#EF4444] text-white hover:text-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"><Trash2 size={14} /></button>
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

      {/* Modal */}
      <Modal open={!!detailAnalysis} onClose={() => setDetailAnalysis(null)} title={detailAnalysis?.fileName ?? 'AERIAL RECON AUDIT'} size="lg">
        {detailAnalysis && (
          <AnalysisDetail
            analysis={detailAnalysis}
            incidentTitle={incidentMap[detailAnalysis.incidentId] || detailAnalysis.incidentId}
            onClose={() => setDetailAnalysis(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="PURGE AERIAL ANALYSIS"
        message="Permanently purge this aerial survey dataset? This will invalidate linked reporting summaries."
        confirmLabel="PURGE"
        danger
      />
    </div>
  );
}
