import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center p-6">
      <div className="w-16 h-16 bg-[#F47B20] border-2 border-black shadow-[4px_4px_0px_#000] flex items-center justify-center mb-4">
        <Icon size={28} className="text-black" />
      </div>
      <h3 className="text-white font-black text-base uppercase tracking-wider mb-1 font-mono">{title}</h3>
      {description && <p className="text-slate-400 text-xs max-w-sm font-mono">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 px-5 py-2.5 bg-[#F47B20] hover:bg-[#E06B10] text-black font-black text-xs uppercase tracking-wider border-2 border-black shadow-[3px_3px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
