import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AppProvider } from '@/context/AppContext';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'LIVE TRACK — by Logic Shift | Emergency Response Command Center',
  description:
    'LIVE TRACK by Logic Shift is an emergency response command center for organizing disaster incidents, reviewing drone imagery, managing rescue tasks, and generating incident reports.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0B1220] text-white min-h-screen`}>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
