'use client';
import { useState, ReactNode } from 'react';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import ToastContainer from '@/components/ui/ToastContainer';

export default function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-[#070B14] overflow-hidden brutal-grid text-white">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="flex flex-col flex-1 min-w-0">
        <TopNav />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
