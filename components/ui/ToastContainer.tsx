'use client';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { useApp } from '@/context/AppContext';

const ICONS = {
  success: { icon: CheckCircle, bg: 'bg-[#4ADE80]', text: 'text-black' },
  error: { icon: AlertCircle, bg: 'bg-[#EF4444]', text: 'text-black' },
  info: { icon: Info, bg: 'bg-[#38BDF8]', text: 'text-black' },
  warning: { icon: AlertTriangle, bg: 'bg-[#FACC15]', text: 'text-black' },
};

export default function ToastContainer() {
  const { toasts, dismissToast } = useApp();
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2.5 pointer-events-none">
      {toasts.map((toast) => {
        const { icon: Icon, bg, text } = ICONS[toast.type];
        return (
          <div
            key={toast.id}
            className="flex items-start gap-3 bg-[#111C2E] border-2 border-black p-3.5 shadow-[5px_5px_0px_#000] min-w-72 max-w-sm pointer-events-auto"
          >
            <div className={`w-7 h-7 border-2 border-black flex items-center justify-center flex-shrink-0 ${bg} ${text}`}>
              <Icon size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-black uppercase tracking-wider font-mono">{toast.title}</p>
              {toast.message && <p className="text-slate-300 text-xs mt-1 font-mono">{toast.message}</p>}
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="p-1 border border-black hover:bg-[#EF4444] text-slate-400 hover:text-black transition flex-shrink-0"
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
