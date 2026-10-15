'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Radio, LayoutDashboard, AlertTriangle, ScanSearch,
  Map, ClipboardList, FileText, Settings,
  ChevronLeft, ChevronRight, Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'OVERVIEW', icon: LayoutDashboard },
  { href: '/incidents', label: 'INCIDENTS', icon: AlertTriangle },
  { href: '/analysis', label: 'AI ANALYSIS', icon: ScanSearch },
  { href: '/map', label: 'RESCUE MAP', icon: Map },
  { href: '/tasks', label: 'TASKS', icon: ClipboardList },
  { href: '/reports', label: 'REPORTS', icon: FileText },
  { href: '/settings', label: 'SETTINGS', icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'relative flex flex-col bg-[#0B1220] border-r-3 border-black transition-all duration-300 ease-in-out flex-shrink-0 z-20',
        collapsed ? 'w-18' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className={cn('flex items-center gap-3 px-4 py-5 border-b-2 border-black bg-[#070B14]', collapsed && 'justify-center px-2')}>
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 bg-[#F47B20] border-2 border-black flex items-center justify-center shadow-[3px_3px_0px_#000]">
            <Target size={22} className="text-black stroke-[2.5]" />
          </div>
          <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#4ADE80] border-2 border-black animate-pulse" />
        </div>
        {!collapsed && (
          <div>
            <div className="flex items-center gap-1.5">
              <Radio size={13} className="text-[#F47B20]" />
              <span className="text-white font-black text-base tracking-wider font-mono">LIVE TRACK</span>
            </div>
            <span className="text-slate-400 text-[10px] font-mono tracking-widest uppercase">BY LOGIC SHIFT</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'group flex items-center gap-3 px-3.5 py-2.5 transition-all text-xs font-mono tracking-wider',
                collapsed ? 'justify-center px-2' : '',
                active
                  ? 'bg-[#F47B20] text-black font-black border-2 border-black shadow-[3px_3px_0px_#000] translate-x-[-1px] translate-y-[-1px]'
                  : 'text-slate-300 border-2 border-transparent hover:border-black hover:bg-white/5 hover:text-white hover:shadow-[3px_3px_0px_#000]'
              )}
            >
              <Icon size={18} className={cn('flex-shrink-0 stroke-[2.5]', active ? 'text-black' : 'text-slate-400 group-hover:text-white')} />
              {!collapsed && <span className="flex-1 truncate">{label}</span>}
              {!collapsed && active && <div className="w-2 h-2 bg-black flex-shrink-0" />}
            </Link>
          );
        })}
      </nav>

      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="absolute -right-3.5 top-20 w-7 h-7 bg-[#F47B20] border-2 border-black flex items-center justify-center text-black font-black shadow-[2px_2px_0px_#000] hover:bg-[#FFA154] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all z-30"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={14} className="stroke-[3]" /> : <ChevronLeft size={14} className="stroke-[3]" />}
      </button>

      {/* Bottom info */}
      {!collapsed && (
        <div className="p-4 border-t-2 border-black bg-[#070B14]">
          <div className="flex items-center gap-2 mb-1 border border-black bg-[#111C2E] p-2 shadow-[2px_2px_0px_#000]">
            <div className="w-2.5 h-2.5 bg-[#4ADE80] border border-black animate-ping" />
            <span className="text-[#4ADE80] text-[11px] font-mono font-bold uppercase tracking-wider">SYSTEM ACTIVE</span>
          </div>
          <p className="text-slate-500 text-[10px] font-mono uppercase tracking-wider mt-2">TACTICAL CMD // V1.0</p>
        </div>
      )}
    </aside>
  );
}
