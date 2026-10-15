import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color?: string;
  iconBg?: string;
  subtitle?: string;
}

export default function StatCard({
  label,
  value,
  icon: Icon,
  color = 'text-black',
  iconBg = 'bg-[#F47B20]',
  subtitle,
}: StatCardProps) {
  return (
    <div className="bg-[#111C2E] border-2 border-black shadow-[4px_4px_0px_#000] p-4 transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#F47B20]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-slate-400 text-[11px] font-black uppercase tracking-wider mb-1 font-mono">{label}</p>
          <p className="text-white text-3xl font-black tracking-tight">{value}</p>
          {subtitle && (
            <span className="inline-block mt-2 px-1.5 py-0.5 bg-black border border-white/20 text-slate-300 text-[10px] font-mono uppercase tracking-wider">
              {subtitle}
            </span>
          )}
        </div>
        <div className={cn('w-11 h-11 border-2 border-black shadow-[2px_2px_0px_#000] flex items-center justify-center flex-shrink-0', iconBg)}>
          <Icon size={20} className={color} />
        </div>
      </div>
    </div>
  );
}
