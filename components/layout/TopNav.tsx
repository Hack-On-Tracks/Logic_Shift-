'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Bell, ChevronDown, User, LogOut, Settings } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatDateTime } from '@/lib/utils';

const PAGE_TITLES: Record<string, { title: string; breadcrumb: string[] }> = {
  '/dashboard': { title: 'COMMAND DASHBOARD', breadcrumb: ['SYSTEM', 'DASHBOARD'] },
  '/incidents': { title: 'INCIDENT LOGS', breadcrumb: ['SYSTEM', 'INCIDENTS'] },
  '/analysis': { title: 'AERIAL AI VISION', breadcrumb: ['SYSTEM', 'AI ANALYSIS'] },
  '/map': { title: 'TACTICAL MAP', breadcrumb: ['SYSTEM', 'RESCUE MAP'] },
  '/tasks': { title: 'RESCUE DIRECTIVES', breadcrumb: ['SYSTEM', 'TASKS'] },
  '/reports': { title: 'AFTER-ACTION REPORTS', breadcrumb: ['SYSTEM', 'REPORTS'] },
  '/settings': { title: 'SYSTEM CONFIG', breadcrumb: ['SYSTEM', 'SETTINGS'] },
};

export default function TopNav() {
  const pathname = usePathname();
  const { notifications, markNotificationRead, clearAllNotifications } = useApp();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentTime(formatDateTime(new Date().toISOString()));
    }, 0);
    const id = setInterval(() => setCurrentTime(formatDateTime(new Date().toISOString())), 60000);
    return () => {
      clearTimeout(timer);
      clearInterval(id);
    };
  }, []);

  const pageInfo = PAGE_TITLES[pathname] ?? { title: 'LIVE TRACK', breadcrumb: ['SYSTEM', 'DASHBOARD'] };
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <header className="h-16 bg-[#0B1220] border-b-3 border-black flex items-center px-6 gap-4 flex-shrink-0 z-10">
      {/* Title & Breadcrumb */}
      <div className="flex-1 min-w-0">
        <h1 className="text-white font-black text-sm uppercase tracking-wider font-mono truncate">{pageInfo.title}</h1>
        <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-mono tracking-widest uppercase">
          {pageInfo.breadcrumb.map((crumb, i) => (
            <span key={crumb} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-[#F47B20] font-black">&gt;</span>}
              <span>{crumb}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Date badge */}
      {currentTime && (
        <span className="bg-[#111C2E] border-2 border-black text-[#F47B20] text-xs font-mono font-bold px-3 py-1 shadow-[2px_2px_0px_#000] hidden lg:block whitespace-nowrap">
          {currentTime}
        </span>
      )}

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
          className="relative p-2 border-2 border-black bg-[#111C2E] hover:bg-[#F47B20] text-white hover:text-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
          aria-label="Notifications"
        >
          <Bell size={18} className="stroke-[2.5]" />
          {unread > 0 && (
            <span className="absolute -top-2 -right-2 px-1.5 py-0.2 bg-[#EF4444] border-2 border-black text-black text-[10px] font-black font-mono shadow-[1px_1px_0px_#000]">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        {notifOpen && (
          <div className="absolute right-0 top-12 w-80 bg-[#111C2E] border-3 border-black shadow-[6px_6px_0px_#000] z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-[#0B1220] border-b-2 border-black">
              <span className="text-white font-black text-xs font-mono uppercase tracking-wider">DISPATCH ALERTS</span>
              <button onClick={clearAllNotifications} className="text-[#F47B20] hover:text-white text-[10px] font-mono uppercase tracking-wider font-bold">
                [CLEAR ALL]
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y-2 divide-black">
              {notifications.length === 0 ? (
                <p className="text-slate-400 text-xs text-center py-6 font-mono uppercase">NO ACTIVE ALERTS</p>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => markNotificationRead(n.id)}
                    className="w-full text-left p-3.5 hover:bg-white/5 transition flex items-start gap-2.5"
                  >
                    <div className={`w-3 h-3 border border-black mt-1 flex-shrink-0 ${
                      n.type === 'error' ? 'bg-[#EF4444]' :
                      n.type === 'success' ? 'bg-[#4ADE80]' :
                      n.type === 'warning' ? 'bg-[#FACC15]' : 'bg-[#38BDF8]'
                    } ${n.read ? 'opacity-30' : ''}`} />
                    <div>
                      <p className={`text-xs font-mono uppercase tracking-wider font-bold ${n.read ? 'text-slate-500' : 'text-white'}`}>{n.title}</p>
                      <p className="text-slate-400 text-xs mt-0.5 leading-snug">{n.message}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Profile */}
      <div className="relative">
        <button
          onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
          className="flex items-center gap-2.5 p-1.5 border-2 border-black bg-[#111C2E] hover:bg-white/10 shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
        >
          <div className="w-8 h-8 bg-[#F47B20] border-2 border-black flex items-center justify-center">
            <User size={16} className="text-black stroke-[3]" />
          </div>
          <div className="hidden md:block text-left pr-1">
            <p className="text-white text-xs font-black font-mono uppercase tracking-wider">COMMANDER</p>
            <p className="text-slate-400 text-[10px] font-mono">SECTOR // DELTA</p>
          </div>
          <ChevronDown size={14} className="text-slate-400 hidden md:block" />
        </button>

        {profileOpen && (
          <div className="absolute right-0 top-12 w-52 bg-[#111C2E] border-3 border-black shadow-[6px_6px_0px_#000] z-50 overflow-hidden divide-y-2 divide-black">
            <div className="px-4 py-3 bg-[#0B1220]">
              <p className="text-white text-xs font-black font-mono uppercase tracking-wider">DEMO RESPONDER</p>
              <p className="text-slate-400 text-[10px] font-mono uppercase">PROTOTYPE MODE</p>
            </div>
            <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-slate-300 hover:text-black hover:bg-[#F47B20] text-xs font-mono font-bold uppercase transition">
              <Settings size={14} /> SYSTEM CONFIG
            </button>
            <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-slate-300 hover:text-black hover:bg-[#EF4444] text-xs font-mono font-bold uppercase transition">
              <LogOut size={14} /> LOGOUT (DEMO)
            </button>
          </div>
        )}
      </div>

      {(notifOpen || profileOpen) && (
        <div className="fixed inset-0 z-40" onClick={() => { setNotifOpen(false); setProfileOpen(false); }} />
      )}
    </header>
  );
}
