'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  Users,
  CreditCard,
  BarChart3,
  Settings,
  GraduationCap,
} from 'lucide-react';
import { clsx } from 'clsx';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Calendar', href: '/calendar', icon: Calendar },
  { label: 'Students', href: '/students', icon: Users },
  { label: 'Fees & Billing', href: '/fees', icon: CreditCard },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200 bg-white min-h-screen fixed left-0 top-0 bottom-0 z-30">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-100">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
          <GraduationCap className="w-6 h-6" />
        </div>
        <div>
          <span className="font-bold text-base tracking-tight text-slate-900 flex items-center gap-1.5">
            TutorPulse
            <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded-md">
              PRO
            </span>
          </span>
          <p className="text-[11px] text-slate-400 font-medium">Smart Tuition Assistant</p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Menu
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              )}
            >
              <Icon
                className={clsx(
                  'w-5 h-5 transition-colors',
                  isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                )}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Tutor Profile Footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-white border border-slate-200/80 shadow-xs">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-400 text-white font-bold flex items-center justify-center text-sm shadow-xs">
            AS
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-semibold text-slate-900 truncate">SN</h4>
            <p className="text-[11px] text-slate-500 truncate">tutor@tutorpulse.io</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
