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
  Sparkles,
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
    <aside className="hidden lg:flex flex-col w-64 border-r border-purple-100/70 bg-gradient-to-b from-white via-slate-50/50 to-purple-50/30 min-h-screen fixed left-0 top-0 bottom-0 z-30 shadow-xs">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-purple-100/60 bg-white/70 backdrop-blur-xs">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-md shadow-purple-200">
          <GraduationCap className="w-6 h-6" />
        </div>
        <div>
          <span className="font-bold text-base tracking-tight bg-gradient-to-r from-blue-700 via-purple-700 to-pink-600 bg-clip-text text-transparent flex items-center gap-1.5">
            Tuition Master
          </span>
          <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-pink-500" />
            Smart Tuition Assistant
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-purple-400 uppercase">
          Navigation
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
                  ? 'bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-500/10 text-purple-900 font-bold shadow-xs border border-purple-200/50'
                  : 'text-slate-600 hover:text-purple-900 hover:bg-purple-50/50'
              )}
            >
              <Icon
                className={clsx(
                  'w-5 h-5 transition-colors',
                  isActive ? 'text-purple-600' : 'text-slate-400 group-hover:text-purple-600'
                )}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Tutor Profile Footer */}
      <div className="p-4 border-t border-purple-100/60 bg-white/60 backdrop-blur-xs">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-white border border-purple-100 shadow-2xs">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 via-purple-600 to-pink-500 text-white font-bold flex items-center justify-center text-sm shadow-xs">
            TM
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-slate-900 truncate">Tuition Master</h4>
            <p className="text-[11px] text-slate-500 truncate">admin@tuitionmaster.io</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
