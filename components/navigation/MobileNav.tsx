'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Calendar, Users, CreditCard, BarChart3 } from 'lucide-react';
import { clsx } from 'clsx';

const MOBILE_NAV_ITEMS = [
  { label: 'Home', href: '/', icon: LayoutDashboard },
  { label: 'Calendar', href: '/calendar', icon: Calendar },
  { label: 'Students', href: '/students', icon: Users },
  { label: 'Fees', href: '/fees', icon: CreditCard },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 flex items-center justify-around shadow-lg">
      {MOBILE_NAV_ITEMS.map((item) => {
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
              'flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-xl transition-all duration-150',
              isActive
                ? 'text-indigo-600 font-semibold scale-105'
                : 'text-slate-500 hover:text-slate-800'
            )}
          >
            <Icon className={clsx('w-5 h-5', isActive ? 'stroke-[2.5px]' : 'stroke-2')} />
            <span className="text-[10px] tracking-tight">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
