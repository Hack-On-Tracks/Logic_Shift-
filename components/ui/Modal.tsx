'use client';
import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export default function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-xs" onClick={onClose} />
      <div className={`relative w-full ${sizeClasses[size]} bg-[#111C2E] border-3 border-black shadow-[8px_8px_0px_#000]`}>
        {title && (
          <div className="flex items-center justify-between px-6 py-3.5 bg-[#0B1220] border-b-2 border-black">
            <h2 className="text-white font-black text-sm uppercase tracking-wider font-mono">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 border-2 border-black bg-white/10 hover:bg-[#EF4444] text-white hover:text-black shadow-[2px_2px_0px_#000] transition active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>
        )}
        <div className="overflow-y-auto max-h-[85vh]">{children}</div>
      </div>
    </div>
  );
}
