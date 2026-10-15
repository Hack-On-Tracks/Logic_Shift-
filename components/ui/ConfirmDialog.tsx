'use client';
import Modal from './Modal';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'CONFIRM',
  danger = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title="" size="sm">
      <div className="p-6 text-center">
        <div className={`w-14 h-14 border-2 border-black flex items-center justify-center mx-auto mb-4 shadow-[4px_4px_0px_#000] ${danger ? 'bg-[#EF4444]' : 'bg-[#F47B20]'}`}>
          <AlertTriangle size={26} className="text-black" />
        </div>
        <h3 className="text-white font-black text-base uppercase tracking-wider mb-2 font-mono">{title}</h3>
        <p className="text-slate-300 text-sm mb-6 font-mono leading-relaxed">{message}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border-2 border-black bg-white/10 text-white font-black text-xs uppercase tracking-wider shadow-[3px_3px_0px_#000] hover:bg-white/20 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={`px-6 py-2.5 border-2 border-black font-black text-xs uppercase tracking-wider shadow-[3px_3px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all text-black ${danger ? 'bg-[#EF4444] hover:bg-[#DC2626]' : 'bg-[#F47B20] hover:bg-[#E06B10]'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
