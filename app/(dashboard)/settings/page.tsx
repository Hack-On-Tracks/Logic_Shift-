'use client';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Target, Radio, Bell, RotateCcw, Database, Info,
  Moon, Sun, Save,
} from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

function Switch({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <div className="flex items-center justify-between border-2 border-black p-3 bg-black/40 shadow-[2px_2px_0px_#000]">
      <span className="text-white text-xs font-black uppercase tracking-wider font-mono">{label}</span>
      <button
        onClick={onToggle}
        className={`w-12 h-6 border-2 border-black transition-colors relative shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none ${on ? 'bg-[#F47B20]' : 'bg-slate-700'}`}
        aria-label={label}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-black border border-white/40 transition-transform ${on ? 'translate-x-6 bg-black' : ''}`} />
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const { settings, updateSettings, resetDemoData, showToast } = useApp();
  const [resetOpen, setResetOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    showToast({ type: 'success', title: 'CONFIG COMMITTED', message: 'Preferences synced to local storage.' });
    setTimeout(() => setSaved(false), 2000);
  }

  const toggle = (key: keyof typeof settings) => () =>
    updateSettings({ [key]: !settings[key] });

  return (
    <div className="max-w-2xl space-y-6 font-mono">
      {/* Brand Card */}
      <div className="bg-[#111C2E] border-3 border-black shadow-[6px_6px_0px_#000] p-6">
        <div className="flex items-center gap-4 mb-4 pb-4 border-b-2 border-black">
          <div className="w-14 h-14 bg-[#F47B20] border-2 border-black flex items-center justify-center shadow-[3px_3px_0px_#000]">
            <Target size={28} className="text-black stroke-[3]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Radio size={14} className="text-[#F47B20]" />
              <span className="text-white font-black text-lg tracking-wider">LIVE TRACK // OPS</span>
            </div>
            <p className="text-slate-400 text-xs uppercase tracking-widest">BY LOGIC SHIFT</p>
          </div>
        </div>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between border-b border-black/40 pb-1.5"><span className="text-slate-400 uppercase">SYSTEM ARCHITECTURE</span><span className="text-white font-black">PHASE 1 TACTICAL FRONTEND</span></div>
          <div className="flex justify-between border-b border-black/40 pb-1.5"><span className="text-slate-400 uppercase">PROJECT SPEC</span><span className="text-[#F47B20] font-black">RESCUEVISION AI</span></div>
          <div className="flex justify-between border-b border-black/40 pb-1.5"><span className="text-slate-400 uppercase">UI THEME AESTHETIC</span><span className="text-[#FACC15] font-black">NEO-BRUTALISM // TACTICAL</span></div>
          <div className="flex justify-between"><span className="text-slate-400 uppercase">COMPILER ENGINE</span><span className="text-white font-black">NEXT.JS 16 // TURBOPACK</span></div>
        </div>
      </div>

      {/* Theme */}
      <div className="bg-[#111C2E] border-3 border-black shadow-[6px_6px_0px_#000] p-6">
        <h2 className="text-white font-black text-xs uppercase tracking-wider mb-3 pb-2 border-b-2 border-black">
          THEME OVERRIDE
        </h2>
        <div>
          <div className="flex gap-3">
            <button
              onClick={() => updateSettings({ theme: 'dark' })}
              className={`flex items-center gap-2 px-5 py-2.5 border-2 border-black text-xs font-black uppercase tracking-wider shadow-[3px_3px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all ${settings.theme === 'dark' ? 'bg-[#F47B20] text-black' : 'bg-black text-slate-300 hover:text-white'}`}
            >
              <Moon size={15} className="stroke-[3]" /> BRUTALIST DARK (ACTIVE)
            </button>
            <button
              onClick={() => updateSettings({ theme: 'light' })}
              className={`flex items-center gap-2 px-5 py-2.5 border-2 border-black text-xs font-black uppercase tracking-wider shadow-[3px_3px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all ${settings.theme === 'light' ? 'bg-[#F47B20] text-black' : 'bg-black text-slate-300 hover:text-white'}`}
            >
              <Sun size={15} /> LIGHT (PROTOTYPE)
            </button>
          </div>
        </div>
      </div>

      {/* Notifications Switchboard */}
      <div className="bg-[#111C2E] border-3 border-black shadow-[6px_6px_0px_#000] p-6">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b-2 border-black">
          <Bell size={16} className="text-[#F47B20] stroke-[2.5]" />
          <h2 className="text-white font-black text-xs uppercase tracking-wider">DISPATCH TELEMETRY SWITCHBOARD</h2>
        </div>
        <div className="space-y-3">
          <Switch on={settings.notificationsEnabled} onToggle={toggle('notificationsEnabled')} label="DISPATCH AUDIBLE NOTIFICATIONS" />
          <Switch on={settings.soundEnabled} onToggle={toggle('soundEnabled')} label="FIELD SIREN ALERTS (SOUND)" />
          <Switch on={settings.autoSaveEnabled} onToggle={toggle('autoSaveEnabled')} label="AUTOMATIC DOSSIER COMMIT" />
        </div>
        <button
          onClick={handleSave}
          className="mt-5 flex items-center gap-2 px-5 py-2.5 bg-[#F47B20] hover:bg-[#FFA154] text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
        >
          <Save size={15} className="stroke-[3]" /> {saved ? 'SAVED TO LOCAL REPO!' : 'COMMIT PREFERENCES'}
        </button>
      </div>

      {/* Local storage info */}
      <div className="bg-[#111C2E] border-3 border-black shadow-[6px_6px_0px_#000] p-6">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-black">
          <Database size={16} className="text-[#38BDF8] stroke-[2.5]" />
          <h2 className="text-white font-black text-xs uppercase tracking-wider">LOCAL REPOSITORY CACHE</h2>
        </div>
        <div className="flex items-start gap-2 bg-[#38BDF8] text-black border-2 border-black p-3.5 shadow-[3px_3px_0px_#000] mb-4">
          <Info size={16} className="mt-0.5 flex-shrink-0 stroke-[2.5]" />
          <p className="text-xs font-black leading-relaxed">
            PROTOTYPE STORAGE DIRECTIVE // ALL RECORDS ARE PERSISTED LOCALLY WITHIN BROWSER LOCALSTORAGE STREAMS. ZERO EXTERNAL SERVERS ATTACHED IN PHASE 1.
          </p>
        </div>
        <p className="text-slate-400 text-[10px] uppercase tracking-wider">
          ACTIVE KEYS: lt_incidents, lt_tasks, lt_analyses, lt_reports, lt_notifications, lt_settings
        </p>
      </div>

      {/* Danger Purge Block */}
      <div className="bg-[#111C2E] border-3 border-black shadow-[6px_6px_0px_#000] p-6">
        <div className="flex items-center gap-2 mb-2 pb-2 border-b-2 border-black">
          <RotateCcw size={16} className="text-[#EF4444] stroke-[3]" />
          <h2 className="text-[#EF4444] font-black text-xs uppercase tracking-wider">FACTORY RESET PROTOTYPE DATA</h2>
        </div>
        <p className="text-slate-300 text-xs mb-4 uppercase leading-relaxed">
          PURGE ALL MODIFIED INCIDENTS, DIRECTIVES, AERIAL VISION ARCHIVES, AND AUDIT REPORTS BACK TO ORIGINAL SEED VALUES.
        </p>
        <button
          onClick={() => setResetOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#EF4444] hover:bg-[#DC2626] text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-[4px_4px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
        >
          <RotateCcw size={15} className="stroke-[3]" /> RESET TO SEED DEMO DATA
        </button>
      </div>

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={() => { resetDemoData(); setResetOpen(false); }}
        title="EXECUTE FACTORY PURGE"
        message="This will overwrite all active incident records with the default demonstration seeds. Operation cannot be cancelled once executed."
        confirmLabel="EXECUTE PURGE"
        danger
      />
    </div>
  );
}
