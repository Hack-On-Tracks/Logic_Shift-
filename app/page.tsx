'use client';
import Link from 'next/link';
import {
  Radio, Target, ScanSearch, Map, ClipboardList, FileText,
  ArrowRight, Zap, Shield, ChevronRight, Terminal,
} from 'lucide-react';

const FEATURES = [
  {
    icon: ScanSearch,
    tag: 'CV // MODEL',
    title: 'AERIAL AI VISION',
    desc: 'Rapidly parse high-resolution drone passes to segment displaced victims, rescue vehicle fleets, and physical debris blockades. Demo detection pipeline fully interactive.',
    color: 'text-black', bg: 'bg-[#38BDF8]', border: 'border-black',
  },
  {
    icon: Map,
    tag: 'GIS // TELEMETRY',
    title: 'TACTICAL DISASTER MAP',
    desc: 'Instant geolocated situational awareness rendered over high-contrast OpenStreetMap tiles. Immediate priority clustering for operational field triage.',
    color: 'text-white', bg: 'bg-[#2563EB]', border: 'border-black',
  },
  {
    icon: ClipboardList,
    tag: 'OPS // DIRECTIVES',
    title: 'TASK DISPATCH BOARD',
    desc: 'Delegate life-critical search missions to Alpha, Bravo, and Charlie response squads. Switch effortlessly between structured audit logs and visual Kanban queues.',
    color: 'text-black', bg: 'bg-[#4ADE80]', border: 'border-black',
  },
  {
    icon: FileText,
    tag: 'EXPORT // COMPLIANCE',
    title: 'AFTER-ACTION INTEL',
    desc: 'Synthesize automated damage tallies and triage histories into field-ready reports. Instant print stylesheets and tabular CSV data extraction built-in.',
    color: 'text-black', bg: 'bg-[#FACC15]', border: 'border-black',
  },
];

const WORKFLOW = [
  { num: '01', title: 'LOG CRITICAL INCIDENT', desc: 'Register geo-coordinates, disaster taxonomy, and initial threat severity.' },
  { num: '02', title: 'ANALYZE DRONE AERIALS', desc: 'Upload survey imagery into the simulated computer vision detection suite.' },
  { num: '03', title: 'CONFIRM MAP COORDINATES', desc: 'Pinpoint tactical rendezvous hubs directly onto the interactive map canvas.' },
  { num: '04', title: 'DISPATCH RESCUE TASKS', desc: 'Assign mission tickets to emergency response units with hard deadlines.' },
  { num: '05', title: 'GENERATE SITUATION REPORTS', desc: 'Compile complete aftermath statistics and export clean tabular CSV audits.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#070B14] brutal-grid text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b-3 border-black bg-[#0B1220]/95 backdrop-blur-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#2563EB] border-2 border-black flex items-center justify-center shadow-[3px_3px_0px_#000]">
              <Target size={20} className="text-white stroke-[3]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <Radio size={12} className="text-[#2563EB]" />
                <span className="text-white font-black text-sm tracking-wider font-mono">LIVE TRACK</span>
              </div>
              <span className="text-slate-400 text-[10px] font-mono tracking-widest uppercase">BY LOGIC SHIFT</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6 text-xs font-mono uppercase tracking-wider text-slate-300">
            <a href="#features" className="hover:text-[#2563EB] transition font-bold">[FEATURES]</a>
            <a href="#workflow" className="hover:text-[#2563EB] transition font-bold">[WORKFLOW]</a>
            <a href="#about" className="hover:text-[#2563EB] transition font-bold">[CONCEPT]</a>
          </div>

          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-black text-xs uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all font-mono"
          >
            LAUNCH DASHBOARD <ArrowRight size={14} className="stroke-[3]" />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#111C2E] border-2 border-black text-[#2563EB] text-xs font-mono font-black uppercase tracking-widest shadow-[3px_3px_0px_#000] mb-6">
              <Terminal size={13} className="text-[#2563EB]" />
              RESCUEVISION AI // TACTICAL CMD PROTOCOL
            </div>

            <h1 className="text-4xl sm:text-6xl font-black text-white leading-tight mb-6 uppercase tracking-tight font-mono">
              SEE THE SITUATION.<br />
              <span className="bg-[#EF4444] text-white px-2 inline-block border-2 border-black shadow-[5px_5px_0px_#000] mt-1">
                COORDINATE THE RESPONSE.
              </span>
            </h1>

            <p className="text-slate-300 text-base sm:text-lg leading-relaxed mb-8 font-mono border-l-4 border-[#2563EB] pl-4 bg-black/40 py-2">
              LIVE TRACK provides emergency response corps with an unyielding command hub to log critical disasters,
              inspect drone aerial surveillance, monitor casualties and debris clusters, and execute rapid tactical task dispatch.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-7 py-3.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-black text-sm uppercase tracking-wider border-3 border-black shadow-[5px_5px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all font-mono"
              >
                <Zap size={18} className="stroke-[3]" /> LAUNCH COMMAND CONSOLE
              </Link>
              <a
                href="#features"
                className="flex items-center gap-2 px-6 py-3.5 bg-[#111C2E] hover:bg-white/10 text-white font-black text-sm uppercase tracking-wider border-3 border-black shadow-[5px_5px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all font-mono"
              >
                EXPLORE SPECS <ChevronRight size={18} className="stroke-[3]" />
              </a>
            </div>
          </div>

          {/* Brutalist Dashboard Preview Frame */}
          <div className="border-3 border-black bg-[#0B1220] shadow-[8px_8px_0px_#000] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#111C2E] border-b-3 border-black">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 bg-[#EF4444] border border-black" />
                <div className="w-3.5 h-3.5 bg-[#FACC15] border border-black" />
                <div className="w-3.5 h-3.5 bg-[#4ADE80] border border-black" />
                <span className="ml-3 text-white text-xs font-mono font-black uppercase tracking-wider">LIVE_TRACK_SYS // PRIMARY_DISPLAY</span>
              </div>
              <span className="text-[#4ADE80] text-[11px] font-mono font-bold tracking-widest">[ONLINE // 60 FPS]</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-[#070B14]">
              {[
                { label: 'TOTAL INCIDENTS', value: '7', bg: 'bg-[#2563EB]', text: 'text-white' },
                { label: 'CRITICAL ACTIVE', value: '5', bg: 'bg-[#EF4444]', text: 'text-white' },
                { label: 'DISPATCH TASKS', value: '8', bg: 'bg-[#38BDF8]', text: 'text-black' },
                { label: 'PEOPLE DETECTED', value: '11', bg: 'bg-white', text: 'text-black' },
              ].map(s => (
                <div key={s.label} className="bg-[#111C2E] border-2 border-black p-3 shadow-[3px_3px_0px_#000]">
                  <p className="text-slate-400 text-[10px] font-mono font-black uppercase tracking-wider mb-1">{s.label}</p>
                  <p className="text-white text-2xl font-black font-mono">{s.value}</p>
                </div>
              ))}
            </div>

            <div className="mx-4 mb-4 h-48 bg-[#0B1220] border-2 border-black flex items-center justify-center relative overflow-hidden shadow-[3px_3px_0px_#000]">
              <div className="absolute inset-0 brutal-grid opacity-30" />
              {[
                { x: '18%', y: '35%', color: 'bg-[#EF4444]', label: 'INC-001 [CRITICAL]' },
                { x: '42%', y: '55%', color: 'bg-[#EF4444]', label: 'INC-002 [CRITICAL]' },
                { x: '68%', y: '30%', color: 'bg-[#2563EB]', label: 'INC-003 [HIGH]' },
                { x: '78%', y: '65%', color: 'bg-white', label: 'INC-004 [MED]' },
              ].map((m, i) => (
                <div key={i} className="absolute flex items-center gap-1.5" style={{ left: m.x, top: m.y }}>
                  <div className={`w-3.5 h-3.5 ${m.color} border-2 border-black shadow-[2px_2px_0px_#000]`} />
                  <span className="hidden sm:inline-block px-1.5 py-0.5 bg-black border border-white/20 text-white text-[9px] font-mono font-black tracking-wider">
                    {m.label}
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-2 text-white bg-black/80 px-4 py-2 border-2 border-black shadow-[3px_3px_0px_#2563EB] text-xs font-mono font-black z-10 uppercase tracking-wider">
                <Map size={16} className="text-[#2563EB]" />
                <span>TACTICAL RESCUE MAP // TELEMETRY ACTIVE</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-4 sm:px-6 border-t-3 border-black bg-[#0B1220]">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <span className="px-3 py-1 bg-[#2563EB] text-white border-2 border-black font-mono font-black text-xs uppercase tracking-widest shadow-[3px_3px_0px_#000] inline-block mb-3">
              TACTICAL CAPABILITIES
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white font-mono uppercase tracking-tight">EVERY DIRECTIVE AT YOUR FINGERTIPS</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-[#111C2E] border-3 border-black p-6 shadow-[5px_5px_0px_#000] hover:shadow-[7px_7px_0px_#2563EB] transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 ${f.bg} border-2 border-black flex items-center justify-center shadow-[3px_3px_0px_#000]`}>
                    <f.icon size={24} className={f.color} />
                  </div>
                  <span className="font-mono text-[11px] font-black uppercase tracking-wider bg-black px-2 py-1 border border-white/20 text-slate-300">
                    {f.tag}
                  </span>
                </div>
                <h3 className="text-white font-black text-lg mb-2 font-mono uppercase tracking-wider">{f.title}</h3>
                <p className="text-slate-300 text-sm leading-relaxed font-mono">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section id="workflow" className="py-20 px-4 sm:px-6 border-t-3 border-black bg-[#070B14]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <span className="px-3 py-1 bg-white text-black border-2 border-black font-mono font-black text-xs uppercase tracking-widest shadow-[3px_3px_0px_#000] inline-block mb-3">
              OPERATIONAL PROTOCOL
            </span>
            <h2 className="text-3xl font-black text-white font-mono uppercase">FROM DISPATCH TO RESOLUTION</h2>
          </div>

          <div className="space-y-4">
            {WORKFLOW.map((step) => (
              <div key={step.num} className="flex gap-4 items-center bg-[#111C2E] border-3 border-black p-4 sm:p-5 shadow-[4px_4px_0px_#000]">
                <div className="w-12 h-12 bg-[#2563EB] border-2 border-black flex items-center justify-center text-white font-black text-base font-mono shadow-[2px_2px_0px_#000] flex-shrink-0">
                  {step.num}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-black text-sm uppercase tracking-wider font-mono mb-0.5">{step.title}</h3>
                  <p className="text-slate-400 text-xs font-mono leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Concept */}
      <section id="about" className="py-20 px-4 sm:px-6 border-t-3 border-black bg-[#0B1220]">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#111C2E] border-3 border-black p-8 sm:p-10 shadow-[8px_8px_0px_#2563EB]">
            <div className="w-14 h-14 bg-[#2563EB] border-2 border-black flex items-center justify-center mb-6 shadow-[3px_3px_0px_#000]">
              <Shield size={28} className="text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white font-mono uppercase mb-4">ABOUT RESCUEVISION AI</h2>
            <p className="text-slate-300 font-mono text-sm leading-relaxed mb-6">
              LIVE TRACK is founded upon the RescueVision AI conceptual framework — an automated emergency
              coordination system crafted to assist first-responder units with aerial image processing, real-time
              spatial incident mapping, and systematic directive tracking. This Phase 1 release delivers a complete,
              fully-functional frontend prototype. Subsequent iterations will bridge live edge inference, multi-drone RTSP
              telemetry, and production database nodes.
            </p>
            <div className="flex flex-wrap gap-2 font-mono">
              {['NEXT.JS 16', 'TYPESCRIPT', 'TAILWIND V4', 'LEAFLET GIS', 'RECHARTS', 'TACTICAL BRUTALISM'].map(t => (
                <span key={t} className="px-3 py-1 bg-black text-[#2563EB] border border-black font-black text-xs shadow-[2px_2px_0px_#000]">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-3 border-black py-8 px-4 sm:px-6 bg-[#070B14]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#2563EB] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000]">
              <Target size={16} className="text-white" />
            </div>
            <div>
              <p className="text-white text-xs font-black tracking-wider uppercase">LIVE TRACK // DISASTER OPS</p>
              <p className="text-slate-400 text-[10px] uppercase">BY LOGIC SHIFT</p>
            </div>
          </div>
          <p className="text-slate-500 text-[11px] text-center uppercase tracking-wider">
            PHASE 1 FRONTEND PROTOTYPE // DEMO REPOSITORIES ONLY
          </p>
          <p className="text-slate-400 text-[11px] font-black uppercase">© 2026 LOGIC SHIFT</p>
        </div>
      </footer>
    </div>
  );
}
