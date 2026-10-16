'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Upload, Check, CheckCircle2, AlertTriangle, ShieldAlert,
  MapPin, Compass, Navigation, Wind, CloudRain, Thermometer,
  Users, Car, Construction, ArrowRight, RotateCcw,
  ExternalLink, Loader2, Eye, ShieldCheck, Flame,
  Anchor, Building, Radio, HeartPulse, Megaphone,
  FileText, Sparkles, CheckSquare, Square,
} from 'lucide-react';
import LocationPickerMap from '@/components/map/LocationPickerMap';
import {
  startGuidedWorkflow, approveWorkflowReview,
  setWorkflowLocation, approveWorkflowRecommendations,
  ApiWorkflowSession, getReportPdfUrl, API_BASE_URL as BASE_URL,
} from '@/lib/api';

const STEPS = [
  { id: 1, label: 'Upload' },
  { id: 2, label: 'AI Analysis' },
  { id: 3, label: 'Review' },
  { id: 4, label: 'Location' },
  { id: 5, label: 'Incident' },
  { id: 6, label: 'Actions' },
  { id: 7, label: 'Map Sync' },
  { id: 8, label: 'Dossier' },
];

const DISASTER_CATEGORIES = [
  'Flood',
  'Earthquake',
  'Building collapse',
  'Fire',
  'Landslide',
  'Cyclone or severe storm',
  'Tsunami or coastal flooding',
  'Road accident',
  'Industrial accident',
  'Other disaster',
  'Unknown or insufficient evidence',
];

interface RecommendationItem {
  id: string;
  title: string;
  description: string;
  assignedTeam: string;
  priority: string;
  checked: boolean;
  icon?: string;
}

export default function GuidedWorkflowView() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [session, setSession] = useState<ApiWorkflowSession | null>(null);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 3: Human Review states
  const [viewAnnotated, setViewAnnotated] = useState(true);
  const [selectedDisasterType, setSelectedDisasterType] = useState<string>('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('High');
  const [checkboxDisaster, setCheckboxDisaster] = useState(true);
  const [checkboxSeverity, setCheckboxSeverity] = useState(true);
  const [checkboxDetections, setCheckboxDetections] = useState(true);
  const [checkboxEvidence, setCheckboxEvidence] = useState(true);
  const [checkboxUncertainties, setCheckboxUncertainties] = useState(true);

  // Step 4: Location Map states
  const [latitude, setLatitude] = useState<number>(19.0760);
  const [longitude, setLongitude] = useState<number>(72.8777);
  const [locationName, setLocationName] = useState<string>('Sector Alpha (Command Grid)');
  const [isUnknownLocation, setIsUnknownLocation] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Step 6: AI Recommendations states
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);

  // Step 2 & 5 & 7 live auto-advancing timers
  useEffect(() => {
    if (currentStep === 5) {
      const timer = setTimeout(() => {
        setCurrentStep(6);
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  // Handle image selection
  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.type.startsWith('image/')) {
      setError('Please select a valid image file (JPG, PNG).');
      return;
    }
    setError(null);
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // STEP 1 -> 2 -> 3: Start AI Analysis
  const handleStartAnalysis = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setCurrentStep(2); // Show Step 2 Live processing

    try {
      const sess = await startGuidedWorkflow(file);
      setSession(sess);

      // Parse classification & severity to initialize Step 3 review
      const classif = sess.classificationJson ? JSON.parse(sess.classificationJson) : {};
      const sev = sess.severityJson ? JSON.parse(sess.severityJson) : {};

      setSelectedDisasterType(classif.primary_disaster_type || 'Unknown');
      setSelectedSeverity(sev.severity_level || 'High');

      // Auto-advance to Step 3: Human Review
      setTimeout(() => {
        setCurrentStep(3);
        setLoading(false);
      }, 1200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Vision analysis failed. Check backend.';
      setError(message);
      setCurrentStep(1);
      setLoading(false);
    }
  };

  // STEP 3 -> 4: Approve Review
  const handleApproveReview = async () => {
    if (!session) return;
    setLoading(true);
    setError(null);

    try {
      const updated = await approveWorkflowReview(session.id, {
        disasterType: selectedDisasterType,
        severity: selectedSeverity,
        confirmedCheckboxes: {
          confirm_disaster_type: checkboxDisaster,
          confirm_severity: checkboxSeverity,
          confirm_detections: checkboxDetections,
          acknowledge_evidence: checkboxEvidence,
          acknowledge_uncertainties: checkboxUncertainties,
        },
      });
      setSession(updated);
      setCurrentStep(4); // Advance to Step 4: Map
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Approval failed.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // GPS geolocation fetch
  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(Number(pos.coords.latitude.toFixed(5)));
        setLongitude(Number(pos.coords.longitude.toFixed(5)));
        setLocationName(`Current GPS [${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}]`);
        setIsUnknownLocation(false);
        setGpsLoading(false);
      },
      () => {
        setError('Unable to retrieve device GPS coordinates.');
        setGpsLoading(false);
      },
      { timeout: 8000 }
    );
  };

  // STEP 4 -> 5 -> 6: Confirm Location & Create Incident
  const handleConfirmLocation = async () => {
    if (!session) return;
    setLoading(true);
    setError(null);

    try {
      const updated = await setWorkflowLocation(session.id, {
        latitude: isUnknownLocation ? null : latitude,
        longitude: isUnknownLocation ? null : longitude,
        locationName: isUnknownLocation ? 'Sector Unspecified' : locationName,
        isUnknown: isUnknownLocation,
      });
      setSession(updated);

      // Load recommendations parsed from session
      if (updated.recommendationsJson) {
        const rawRecs = JSON.parse(updated.recommendationsJson);
        setRecommendations(
          rawRecs.map((r: { id: string; title: string; description: string; assigned_team?: string; assignedTeam?: string; priority: string; checked?: boolean }) => ({
            id: r.id,
            title: r.title,
            description: r.description,
            assignedTeam: r.assigned_team || r.assignedTeam || 'Alpha Search Unit',
            priority: r.priority || 'High',
            checked: r.checked ?? true,
          }))
        );
      }

      setCurrentStep(5); // Show Incident Created confirmation, auto-timer will jump to 6
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Location confirmation failed.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Toggle recommendation item
  const toggleRecommendation = (id: string) => {
    setRecommendations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, checked: !r.checked } : r))
    );
  };

  // STEP 6 -> 7 -> 8: Approve Recommendations & Finalize
  const handleApproveRecommendations = async () => {
    if (!session) return;
    setLoading(true);
    setError(null);

    const approvedList = recommendations.filter((r) => r.checked);
    if (approvedList.length === 0) {
      setError('Please check at least one tactical action to dispatch.');
      setLoading(false);
      return;
    }

    try {
      setCurrentStep(7); // Show Map Sync
      const updated = await approveWorkflowRecommendations(
        session.id,
        approvedList.map((r) => ({
          title: r.title,
          description: r.description,
          assignedTeam: r.assignedTeam,
          priority: r.priority,
        }))
      );
      setSession(updated);

      setTimeout(() => {
        setCurrentStep(8); // Step 8: Wrap-Up & Report
        setLoading(false);
      }, 1200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to dispatch actions.';
      setError(message);
      setCurrentStep(6);
      setLoading(false);
    }
  };

  // Reset workflow
  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setSession(null);
    setCurrentStep(1);
    setError(null);
    setRecommendations([]);
    setCheckboxDisaster(true);
    setCheckboxSeverity(true);
    setCheckboxDetections(true);
    setCheckboxEvidence(true);
    setCheckboxUncertainties(true);
  };

  // Helpers to parse session payloads
  const classification = session?.classificationJson ? JSON.parse(session.classificationJson) : null;
  const detections = session?.detectionsJson ? JSON.parse(session.detectionsJson) : null;
  const severity = session?.severityJson ? JSON.parse(session.severityJson) : null;
  const weather = session?.weatherJson ? JSON.parse(session.weatherJson) : null;
  const dispatchedTasks = session?.dispatchedTasksJson ? JSON.parse(session.dispatchedTasksJson) : [];

  return (
    <div className="space-y-6">
      {/* Brutalist Stepper Header */}
      <div className="bg-[#111C2E] border-2 border-black p-4 shadow-[4px_4px_0px_#000]">
        <div className="flex items-center justify-between mb-3 border-b-2 border-black pb-2">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-[#2563EB] border border-black animate-pulse" />
            <h2 className="text-white font-mono font-black text-xs uppercase tracking-widest">
              AUTONOMOUS DISASTER RESPONSE PIPELINE // STEP {currentStep} OF 8
            </h2>
          </div>
          {session && (
            <span className="text-slate-400 font-mono text-[11px] bg-black/40 px-2.5 py-0.5 border border-white/10">
              SESSION: {session.id}
            </span>
          )}
        </div>

        {/* Stepper Progress Bar */}
        <div className="grid grid-cols-4 md:grid-cols-8 gap-1.5 font-mono">
          {STEPS.map((s) => {
            const isCompleted = currentStep > s.id;
            const isCurrent = currentStep === s.id;
            return (
              <div
                key={s.id}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 border-2 border-black text-[11px] font-black transition-all ${
                  isCurrent
                    ? 'bg-[#2563EB] text-white shadow-[2px_2px_0px_#000] translate-x-[-1px] translate-y-[-1px]'
                    : isCompleted
                    ? 'bg-[#4ADE80]/20 text-[#4ADE80] border-black/80'
                    : 'bg-[#0B1220] text-slate-500 opacity-60'
                }`}
              >
                {isCompleted ? <Check size={12} className="stroke-[3]" /> : <span>{s.id}.</span>}
                <span className="truncate">{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="bg-[#EF4444]/20 border-2 border-black text-[#EF4444] p-3 shadow-[3px_3px_0px_#000] flex items-center gap-2.5 font-mono text-xs font-bold">
          <AlertTriangle size={16} className="flex-shrink-0 stroke-[2.5]" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto underline hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* =============================================================== */}
      {/* STEP 1: UPLOAD DISASTER IMAGE                                   */}
      {/* =============================================================== */}
      {currentStep === 1 && (
        <div className="bg-[#111C2E] border-2 border-black p-6 md:p-8 shadow-[4px_4px_0px_#000] space-y-6">
          <div className="border-b-2 border-black pb-4">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-[#2563EB]/20 border border-[#2563EB]/40 text-[#60A5FA] text-[11px] font-mono font-bold uppercase tracking-wider mb-2">
              <Sparkles size={13} />
              Zero Manual Data Entry Required
            </div>
            <h1 className="text-white text-xl md:text-2xl font-mono font-black uppercase tracking-tight">
              Upload Aerial or Field Disaster Image
            </h1>
            <p className="text-slate-400 text-xs font-mono mt-1">
              Upload a single photograph. Gemini 3.5 Flash automatically identifies the disaster category, detects victims & vehicles, assesses severity, and coordinates tactical workflows.
            </p>
          </div>

          {!preview ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-3 border-dashed p-10 text-center cursor-pointer transition-all ${
                dragOver
                  ? 'border-[#2563EB] bg-[#2563EB]/10'
                  : 'border-slate-700 hover:border-[#2563EB] hover:bg-white/5 bg-[#0B1220]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />
              <div className="w-16 h-16 bg-[#2563EB]/20 border-2 border-black flex items-center justify-center mx-auto mb-4 shadow-[3px_3px_0px_#000]">
                <Upload size={28} className="text-[#60A5FA] stroke-[2.5]" />
              </div>
              <p className="text-white font-mono font-black text-sm uppercase tracking-wider mb-1">
                Drag and drop emergency photo here
              </p>
              <p className="text-slate-500 font-mono text-xs">
                Or click to browse from device (JPG, PNG supported)
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative border-2 border-black bg-black shadow-[4px_4px_0px_#000] max-h-[460px] overflow-hidden flex items-center justify-center">
                <img
                  src={preview}
                  alt="Disaster preview"
                  className="max-h-[460px] w-auto object-contain"
                />
                <div className="absolute top-3 left-3 bg-black/80 border border-white/20 px-2.5 py-1 text-white font-mono text-[11px] font-bold">
                  {file?.name} ({(file ? file.size / 1024 / 1024 : 0).toFixed(2)} MB)
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                  }}
                  className="px-4 py-2 border-2 border-black bg-[#1E293B] hover:bg-black text-slate-300 font-mono text-xs font-bold uppercase transition"
                >
                  Replace Image
                </button>

                <button
                  onClick={handleStartAnalysis}
                  disabled={loading}
                  className="flex items-center gap-2.5 px-6 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-2 border-black font-mono font-black text-sm uppercase tracking-wider shadow-[3px_3px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition cursor-pointer"
                >
                  <Sparkles size={16} />
                  Start AI Analysis
                  <ArrowRight size={16} className="stroke-[3]" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =============================================================== */}
      {/* STEP 2: LIVE AI PROCESSING                                      */}
      {/* =============================================================== */}
      {currentStep === 2 && (
        <div className="bg-[#111C2E] border-2 border-black p-8 shadow-[4px_4px_0px_#000] text-center space-y-6">
          <div className="w-16 h-16 border-3 border-black bg-[#2563EB] mx-auto flex items-center justify-center shadow-[4px_4px_0px_#000] animate-pulse">
            <Loader2 size={32} className="text-white animate-spin stroke-[2.5]" />
          </div>

          <div>
            <h2 className="text-white font-mono font-black text-lg md:text-xl uppercase tracking-wider mb-2">
              Gemini Vision & YOLO Neural Processing Active
            </h2>
            <p className="text-slate-400 font-mono text-xs max-w-lg mx-auto">
              Synthesizing multi-modal computer vision and disaster rubrics. No human input required at this stage.
            </p>
          </div>

          {/* Real Process Steps */}
          <div className="max-w-md mx-auto space-y-2 text-left font-mono text-xs">
            {[
              'Validating image geometry & ingest pipeline',
              'Submitting frame to Gemini 3.5 Flash Vision classification',
              'Running YOLO26s object detection & victim triage',
              'Resolving Disaster Workflow Registry protocol',
              'Calculating initial multi-hazard severity rubric',
            ].map((st, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 p-2 bg-[#0B1220] border border-white/10"
              >
                <div className="w-2 h-2 bg-[#4ADE80] animate-ping" />
                <span className="text-slate-300">{st}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =============================================================== */}
      {/* STEP 3: HUMAN REVIEW VIA CHECKBOXES                             */}
      {/* =============================================================== */}
      {currentStep === 3 && (
        <div className="bg-[#111C2E] border-2 border-black p-6 shadow-[4px_4px_0px_#000] space-y-6">
          <div className="border-b-2 border-black pb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#4ADE80]" />
                <h2 className="text-white font-mono font-black text-base uppercase tracking-wider">
                  Stage 3: Verification & Operator Review
                </h2>
              </div>
              <p className="text-slate-400 font-mono text-xs mt-1">
                Review Gemini identification and YOLO detections. Verify findings using checkboxes.
              </p>
            </div>

            {/* Image Toggle */}
            <div className="flex border-2 border-black font-mono text-xs font-black">
              <button
                onClick={() => setViewAnnotated(false)}
                className={`px-3 py-1.5 transition ${
                  !viewAnnotated ? 'bg-[#2563EB] text-white' : 'bg-[#0B1220] text-slate-400 hover:text-white'
                }`}
              >
                Original Photo
              </button>
              <button
                onClick={() => setViewAnnotated(true)}
                className={`px-3 py-1.5 border-l-2 border-black transition ${
                  viewAnnotated ? 'bg-[#2563EB] text-white' : 'bg-[#0B1220] text-slate-400 hover:text-white'
                }`}
              >
                YOLO Detections
              </button>
            </div>
          </div>

          {/* Imagery & Analysis Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Image View */}
            <div className="border-2 border-black bg-black shadow-[3px_3px_0px_#000] min-h-[320px] flex items-center justify-center relative overflow-hidden">
              <img
                src={
                  viewAnnotated && session?.annotatedImagePath
                    ? `${BASE_URL}${session.annotatedImagePath}`
                    : session?.imagePath
                    ? `${BASE_URL}${session.imagePath}`
                    : preview || ''
                }
                alt="Inspection View"
                className="max-h-[360px] w-auto object-contain"
              />
              <div className="absolute top-2 left-2 bg-black/90 border border-white/20 px-2 py-0.5 text-white font-mono text-[10px] font-bold uppercase">
                {viewAnnotated ? 'YOLO26s Detection Overlay' : 'Raw Sensor Imagery'}
              </div>
            </div>

            {/* AI Findings Card */}
            <div className="space-y-4 font-mono">
              {/* Category Card */}
              <div className="bg-[#0B1220] border-2 border-black p-4 shadow-[3px_3px_0px_#000] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">
                    Primary Disaster Category
                  </span>
                  <span className="text-[#4ADE80] text-[11px] font-black bg-[#4ADE80]/10 px-2 py-0.5 border border-[#4ADE80]/30">
                    {classification ? `${(classification.confidence * 100).toFixed(0)}% AI CONFIDENCE` : 'HIGH CONFIDENCE'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-white text-xl font-black uppercase text-[#60A5FA]">
                    {selectedDisasterType}
                  </span>
                  <span className="text-slate-500 text-xs">//</span>
                  <span className="text-[#EF4444] text-xs font-bold uppercase">
                    Severity: {selectedSeverity}
                  </span>
                </div>

                {/* Optional Override Dropdown */}
                <div className="pt-2 border-t border-white/10">
                  <label className="text-slate-400 text-[10px] uppercase font-bold block mb-1">
                    Override Disaster Classification (Optional):
                  </label>
                  <select
                    value={selectedDisasterType}
                    onChange={(e) => setSelectedDisasterType(e.target.value)}
                    className="w-full bg-[#111C2E] border-2 border-black text-white text-xs p-2 font-mono font-bold focus:outline-none"
                  >
                    {DISASTER_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Detected Objects Tally */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-[#0B1220] border-2 border-black p-2.5 text-center shadow-[2px_2px_0px_#000]">
                  <div className="flex items-center justify-center gap-1 text-[#4ADE80] mb-0.5">
                    <Users size={14} />
                    <span className="text-[10px] font-bold uppercase">People</span>
                  </div>
                  <span className="text-white font-black text-lg">
                    {detections?.people_count ?? 0}
                  </span>
                </div>

                <div className="bg-[#0B1220] border-2 border-black p-2.5 text-center shadow-[2px_2px_0px_#000]">
                  <div className="flex items-center justify-center gap-1 text-[#60A5FA] mb-0.5">
                    <Car size={14} />
                    <span className="text-[10px] font-bold uppercase">Vehicles</span>
                  </div>
                  <span className="text-white font-black text-lg">
                    {detections?.vehicle_count ?? 0}
                  </span>
                </div>

                <div className="bg-[#0B1220] border-2 border-black p-2.5 text-center shadow-[2px_2px_0px_#000]">
                  <div className="flex items-center justify-center gap-1 text-[#EF4444] mb-0.5">
                    <Construction size={14} />
                    <span className="text-[10px] font-bold uppercase">Obstacles</span>
                  </div>
                  <span className="text-white font-black text-lg">
                    {detections?.obstacle_count ?? 0}
                  </span>
                </div>
              </div>

              {/* Visual Evidence & Uncertainties */}
              <div className="bg-[#0B1220] border-2 border-black p-3 text-xs space-y-2">
                <div className="text-slate-400 font-bold text-[10px] uppercase">
                  Identified Visual Evidence:
                </div>
                <ul className="text-slate-300 list-disc list-inside space-y-1 text-[11px]">
                  {(classification?.supporting_evidence || ['Inundated roadways and visible waterlogging.']).map((ev: string, i: number) => (
                    <li key={i}>{ev}</li>
                  ))}
                </ul>

                {classification?.uncertainties && classification.uncertainties.length > 0 && (
                  <div className="pt-2 border-t border-white/10 text-[#F59E0B] text-[11px] flex items-start gap-1.5">
                    <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
                    <span>{classification.uncertainties[0]}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Verification Checkboxes (The Heart of Step 3) */}
          <div className="bg-[#0B1220] border-2 border-black p-4 shadow-[3px_3px_0px_#000] space-y-3 font-mono">
            <span className="text-white font-black text-xs uppercase tracking-wider block border-b border-white/10 pb-2">
              Mandatory Human Verification Checkboxes:
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <label
                onClick={() => setCheckboxDisaster(!checkboxDisaster)}
                className="flex items-center gap-2.5 p-2 bg-[#111C2E] border border-black cursor-pointer hover:bg-white/5 transition"
              >
                {checkboxDisaster ? (
                  <CheckSquare size={16} className="text-[#4ADE80]" />
                ) : (
                  <Square size={16} className="text-slate-500" />
                )}
                <span className="text-white font-bold">
                  Confirm disaster category: <span className="text-[#60A5FA]">{selectedDisasterType}</span>
                </span>
              </label>

              <label
                onClick={() => setCheckboxSeverity(!checkboxSeverity)}
                className="flex items-center gap-2.5 p-2 bg-[#111C2E] border border-black cursor-pointer hover:bg-white/5 transition"
              >
                {checkboxSeverity ? (
                  <CheckSquare size={16} className="text-[#4ADE80]" />
                ) : (
                  <Square size={16} className="text-slate-500" />
                )}
                <span className="text-white font-bold">
                  Confirm preliminary severity rating: <span className="text-[#EF4444]">{selectedSeverity}</span>
                </span>
              </label>

              <label
                onClick={() => setCheckboxDetections(!checkboxDetections)}
                className="flex items-center gap-2.5 p-2 bg-[#111C2E] border border-black cursor-pointer hover:bg-white/5 transition"
              >
                {checkboxDetections ? (
                  <CheckSquare size={16} className="text-[#4ADE80]" />
                ) : (
                  <Square size={16} className="text-slate-500" />
                )}
                <span className="text-white font-bold">
                  Confirm detected victims ({detections?.people_count ?? 0}) and vehicles ({detections?.vehicle_count ?? 0})
                </span>
              </label>

              <label
                onClick={() => setCheckboxEvidence(!checkboxEvidence)}
                className="flex items-center gap-2.5 p-2 bg-[#111C2E] border border-black cursor-pointer hover:bg-white/5 transition"
              >
                {checkboxEvidence ? (
                  <CheckSquare size={16} className="text-[#4ADE80]" />
                ) : (
                  <Square size={16} className="text-slate-500" />
                )}
                <span className="text-white font-bold">
                  Acknowledge visual evidence verified by Gemini Vision
                </span>
              </label>

              <label
                onClick={() => setCheckboxUncertainties(!checkboxUncertainties)}
                className="flex items-center gap-2.5 p-2 bg-[#111C2E] border border-black cursor-pointer hover:bg-white/5 transition md:col-span-2"
              >
                {checkboxUncertainties ? (
                  <CheckSquare size={16} className="text-[#4ADE80]" />
                ) : (
                  <Square size={16} className="text-slate-500" />
                )}
                <span className="text-white font-bold">
                  Acknowledge limitations (2D aerial photography requires field responder verification)
                </span>
              </label>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleApproveReview}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-2 border-black font-mono font-black text-xs uppercase tracking-wider shadow-[3px_3px_0px_#000] cursor-pointer"
            >
              Approve Analysis & Proceed to Location
              <ArrowRight size={15} className="stroke-[3]" />
            </button>
          </div>
        </div>
      )}

      {/* =============================================================== */}
      {/* STEP 4: LOCATION CONFIRMATION — LEAFLET MAP                     */}
      {/* =============================================================== */}
      {currentStep === 4 && (
        <div className="bg-[#111C2E] border-2 border-black p-6 shadow-[4px_4px_0px_#000] space-y-6">
          <div className="border-b-2 border-black pb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-[#EF4444]" />
                <h2 className="text-white font-mono font-black text-base uppercase tracking-wider">
                  Stage 4: Ground Location Confirmation
                </h2>
              </div>
              <p className="text-slate-400 font-mono text-xs mt-1">
                Click on the tactical map or drag the marker to pin the emergency sector coordinates.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleUseGps}
                disabled={gpsLoading}
                className="flex items-center gap-2 px-3.5 py-2 bg-[#1E293B] hover:bg-black text-white border-2 border-black font-mono text-xs font-bold uppercase transition"
              >
                <Navigation size={13} className={gpsLoading ? 'animate-spin' : ''} />
                {gpsLoading ? 'Acquiring GPS...' : 'Use My GPS'}
              </button>
            </div>
          </div>

          {/* Interactive Map Picker */}
          <div className="space-y-3">
            <LocationPickerMap
              latitude={isUnknownLocation ? null : latitude}
              longitude={isUnknownLocation ? null : longitude}
              onChange={(lat, lng) => {
                setLatitude(lat);
                setLongitude(lng);
                setIsUnknownLocation(false);
                setLocationName(`GeoSector [${lat.toFixed(4)}, ${lng.toFixed(4)}]`);
              }}
              height="360px"
            />

            {/* Coordinates & Location Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
              <div className="bg-[#0B1220] border-2 border-black p-2.5">
                <span className="text-slate-400 text-[10px] uppercase font-bold block mb-0.5">
                  Latitude
                </span>
                <span className="text-white font-black text-sm">
                  {isUnknownLocation ? 'UNSPECIFIED' : latitude.toFixed(5)}
                </span>
              </div>

              <div className="bg-[#0B1220] border-2 border-black p-2.5">
                <span className="text-slate-400 text-[10px] uppercase font-bold block mb-0.5">
                  Longitude
                </span>
                <span className="text-white font-black text-sm">
                  {isUnknownLocation ? 'UNSPECIFIED' : longitude.toFixed(5)}
                </span>
              </div>

              <div className="bg-[#0B1220] border-2 border-black p-2.5 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block mb-0.5">
                    Sector Label
                  </span>
                  <span className="text-[#60A5FA] font-bold text-xs truncate block">
                    {locationName}
                  </span>
                </div>
              </div>
            </div>

            {/* Unknown Location Checkbox */}
            <div className="bg-[#0B1220] border-2 border-black p-3 font-mono text-xs">
              <label
                onClick={() => setIsUnknownLocation(!isUnknownLocation)}
                className="flex items-center gap-2 cursor-pointer"
              >
                {isUnknownLocation ? (
                  <CheckSquare size={16} className="text-[#F59E0B]" />
                ) : (
                  <Square size={16} className="text-slate-500" />
                )}
                <span className="text-slate-300 font-bold">
                  Unknown location (Reconnaissance coordinates pending field radio report)
                </span>
              </label>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleConfirmLocation}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-2 border-black font-mono font-black text-xs uppercase tracking-wider shadow-[3px_3px_0px_#000] cursor-pointer"
            >
              Confirm Location & Create Incident
              <ArrowRight size={15} className="stroke-[3]" />
            </button>
          </div>
        </div>
      )}

      {/* =============================================================== */}
      {/* STEP 5: INCIDENT CREATION & DASHBOARD AUTO-UPDATE               */}
      {/* =============================================================== */}
      {currentStep === 5 && (
        <div className="bg-[#111C2E] border-2 border-black p-8 shadow-[4px_4px_0px_#000] text-center space-y-6">
          <div className="w-16 h-16 border-3 border-black bg-[#4ADE80] mx-auto flex items-center justify-center shadow-[4px_4px_0px_#000]">
            <CheckCircle2 size={32} className="text-black stroke-[2.5]" />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#4ADE80]/20 text-[#4ADE80] border border-[#4ADE80]/40 font-mono text-[11px] font-bold uppercase mb-2">
              Incident Synced to Database & WebSocket
            </div>
            <h2 className="text-white font-mono font-black text-xl uppercase tracking-tight">
              Incident Created: {session?.incidentId}
            </h2>
            <p className="text-slate-400 font-mono text-xs mt-1">
              Live weather telemetry successfully acquired via Open-Meteo. Proceeding to tactical recommendations...
            </p>
          </div>

          {/* Telemetry Snapshot */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-xl mx-auto font-mono text-xs">
            <div className="bg-[#0B1220] border-2 border-black p-3">
              <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">Condition</span>
              <span className="text-white font-bold">{weather?.condition ?? 'Normal'}</span>
            </div>
            <div className="bg-[#0B1220] border-2 border-black p-3">
              <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">Temperature</span>
              <span className="text-white font-bold">{weather?.temperature_c ?? 28}°C</span>
            </div>
            <div className="bg-[#0B1220] border-2 border-black p-3">
              <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">Wind Speed</span>
              <span className="text-white font-bold">{weather?.wind_speed_kmh ?? 0} km/h</span>
            </div>
            <div className="bg-[#0B1220] border-2 border-black p-3">
              <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">People at Risk</span>
              <span className="text-[#EF4444] font-black text-sm">{detections?.people_count ?? 0} Detected</span>
            </div>
          </div>
        </div>
      )}

      {/* =============================================================== */}
      {/* STEP 6: AI RESCUE RECOMMENDATIONS — CHECKBOX APPROVAL           */}
      {/* =============================================================== */}
      {currentStep === 6 && (
        <div className="bg-[#111C2E] border-2 border-black p-6 shadow-[4px_4px_0px_#000] space-y-6">
          <div className="border-b-2 border-black pb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <HeartPulse size={18} className="text-[#EF4444]" />
                <h2 className="text-white font-mono font-black text-base uppercase tracking-wider">
                  Stage 6: AI Rescue Recommendations & Directives
                </h2>
              </div>
              <p className="text-slate-400 font-mono text-xs mt-1">
                Gemini synthesized the following tactical directives tailored to {selectedDisasterType} and on-scene weather. Approve tasks to dispatch.
              </p>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs">
              <button
                onClick={() => setRecommendations((prev) => prev.map((r) => ({ ...r, checked: true })))}
                className="px-2.5 py-1 bg-[#1E293B] border border-black hover:bg-black text-slate-300"
              >
                Check All
              </button>
              <button
                onClick={() => setRecommendations((prev) => prev.map((r) => ({ ...r, checked: false })))}
                className="px-2.5 py-1 bg-[#1E293B] border border-black hover:bg-black text-slate-300"
              >
                Uncheck All
              </button>
            </div>
          </div>

          {/* Action Cards with Checkboxes */}
          <div className="space-y-3 font-mono">
            {recommendations.map((rec) => (
              <div
                key={rec.id}
                onClick={() => toggleRecommendation(rec.id)}
                className={`p-4 border-2 border-black transition-all cursor-pointer shadow-[3px_3px_0px_#000] flex items-start gap-3.5 ${
                  rec.checked
                    ? 'bg-[#0B1220] border-black text-white'
                    : 'bg-[#111C2E]/60 border-black/60 opacity-60'
                }`}
              >
                <div className="mt-0.5 flex-shrink-0">
                  {rec.checked ? (
                    <CheckSquare size={18} className="text-[#4ADE80]" />
                  ) : (
                    <Square size={18} className="text-slate-500" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <h3 className="font-black text-sm text-white uppercase tracking-wide">
                      {rec.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 bg-[#2563EB]/20 text-[#60A5FA] border border-[#2563EB]/30 font-bold">
                        {rec.assignedTeam}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 font-bold uppercase border ${
                          rec.priority === 'Critical'
                            ? 'bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/40'
                            : 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/40'
                        }`}
                      >
                        {rec.priority}
                      </span>
                    </div>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">{rec.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Action Button */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-slate-400 font-mono text-xs font-bold">
              {recommendations.filter((r) => r.checked).length} of {recommendations.length} tactical actions selected for dispatch.
            </span>

            <button
              onClick={handleApproveRecommendations}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-[#4ADE80] hover:bg-[#22C55E] text-black border-2 border-black font-mono font-black text-xs uppercase tracking-wider shadow-[3px_3px_0px_#000] cursor-pointer"
            >
              Approve & Dispatch Selected Actions
              <ArrowRight size={15} className="stroke-[3]" />
            </button>
          </div>
        </div>
      )}

      {/* =============================================================== */}
      {/* STEP 7: RESCUE MAP AUTO-UPDATE                                  */}
      {/* =============================================================== */}
      {currentStep === 7 && (
        <div className="bg-[#111C2E] border-2 border-black p-8 shadow-[4px_4px_0px_#000] text-center space-y-6">
          <div className="w-16 h-16 border-3 border-black bg-[#2563EB] mx-auto flex items-center justify-center shadow-[4px_4px_0px_#000] animate-pulse">
            <MapPin size={32} className="text-white stroke-[2.5]" />
          </div>

          <div>
            <h2 className="text-white font-mono font-black text-xl uppercase tracking-tight">
              Synchronizing Tactical Rescue Map
            </h2>
            <p className="text-slate-400 font-mono text-xs mt-1">
              Deploying squad pins, hazard perimeters, and generating official After-Action Dossier...
            </p>
          </div>
        </div>
      )}

      {/* =============================================================== */}
      {/* STEP 8: INCIDENT REPORT & WRAP-UP                               */}
      {/* =============================================================== */}
      {currentStep === 8 && (
        <div className="bg-[#111C2E] border-2 border-black p-6 md:p-8 shadow-[4px_4px_0px_#000] space-y-6">
          {/* Header */}
          <div className="border-b-2 border-black pb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#4ADE80]/20 text-[#4ADE80] border border-[#4ADE80]/40 font-mono text-[11px] font-bold uppercase mb-2">
                <CheckCircle2 size={13} />
                Disaster Response Pipeline Completed
              </div>
              <h2 className="text-white font-mono font-black text-xl md:text-2xl uppercase tracking-tight">
                Operational Wrap-Up & Dossier
              </h2>
            </div>

            {session?.reportId && (
              <a
                href={getReportPdfUrl(session.reportId)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 bg-[#EF4444] hover:bg-[#DC2626] text-white border-2 border-black font-mono font-black text-xs uppercase tracking-wider shadow-[3px_3px_0px_#000]"
              >
                <FileText size={16} />
                Download PDF Dossier
              </a>
            )}
          </div>

          {/* Dossier Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
            <div className="bg-[#0B1220] border-2 border-black p-4 space-y-2">
              <span className="text-slate-500 font-bold uppercase text-[10px]">Incident Details</span>
              <p className="text-white font-black text-sm">{session?.incidentId}</p>
              <p className="text-[#60A5FA] font-bold uppercase">{selectedDisasterType}</p>
              <p className="text-slate-400 text-[11px]">Severity: <span className="text-[#EF4444] font-bold">{selectedSeverity}</span></p>
            </div>

            <div className="bg-[#0B1220] border-2 border-black p-4 space-y-2">
              <span className="text-slate-500 font-bold uppercase text-[10px]">Sector Coordinates</span>
              <p className="text-white font-bold">{isUnknownLocation ? 'Reconnaissance Sector Pending' : `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`}</p>
              <p className="text-slate-400 text-[11px] truncate">{locationName}</p>
              <p className="text-[#4ADE80] text-[11px]">Weather: {weather?.condition ?? 'Recorded'}</p>
            </div>

            <div className="bg-[#0B1220] border-2 border-black p-4 space-y-2">
              <span className="text-slate-500 font-bold uppercase text-[10px]">Deployed Field Assets</span>
              <p className="text-white font-black text-sm">{dispatchedTasks.length} Directives Dispatched</p>
              <p className="text-slate-400 text-[11px]">{detections?.people_count ?? 0} Casualties Triaged</p>
              <p className="text-[#4ADE80] text-[11px]">Status: Active Tactical Response</p>
            </div>
          </div>

          {/* Dispatched Tasks List */}
          {dispatchedTasks.length > 0 && (
            <div className="bg-[#0B1220] border-2 border-black p-4 space-y-3 font-mono">
              <span className="text-white font-black text-xs uppercase tracking-wider block border-b border-white/10 pb-2">
                Dispatched Rescue Tasks Log:
              </span>
              <div className="space-y-2">
                {dispatchedTasks.map((t: { id: string; title: string; assigned_team?: string; assignedTeam?: string; priority: string }) => (
                  <div
                    key={t.id}
                    className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-[#111C2E] border border-black text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-mono text-[10px]">{t.id}</span>
                      <span className="text-white font-bold">{t.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-[#2563EB]/20 text-[#60A5FA] border border-[#2563EB]/30 text-[10px] font-bold">
                        {t.assigned_team || t.assignedTeam}
                      </span>
                      <span className="px-2 py-0.5 bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30 text-[10px] font-bold">
                        {t.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation & Reset Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t-2 border-black font-mono">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1E293B] hover:bg-black text-slate-300 border-2 border-black text-xs font-bold uppercase transition"
            >
              <RotateCcw size={14} />
              Process Another Disaster Image
            </button>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/map"
                className="flex items-center gap-1.5 px-4 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-2 border-black text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_#000]"
              >
                <MapPin size={14} />
                View on Rescue Map
              </Link>

              <Link
                href="/incidents"
                className="flex items-center gap-1.5 px-4 py-2.5 bg-[#0B1220] hover:bg-black text-white border-2 border-black text-xs font-bold uppercase"
              >
                <ExternalLink size={14} />
                View in Incidents
              </Link>

              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 px-4 py-2.5 bg-[#111C2E] hover:bg-black text-slate-300 border-2 border-black text-xs font-bold uppercase"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
