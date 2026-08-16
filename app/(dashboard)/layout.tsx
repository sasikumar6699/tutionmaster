import React from 'react';
import { Sidebar } from '../../components/navigation/Sidebar';
import { MobileNav } from '../../components/navigation/MobileNav';
import { Header } from '../../components/navigation/Header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen pb-20 lg:pb-8">
        <Header />
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}
