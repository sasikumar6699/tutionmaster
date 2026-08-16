'use client';

import React from 'react';
import { Card, CardContent } from '../ui/Card';
import {
  CalendarDays,
  CheckCircle2,
  TrendingUp,
  CreditCard,
  IndianRupee,
  AlertCircle,
} from 'lucide-react';
import { formatINR } from '../../lib/utils/currency';

interface SummaryMetricsProps {
  todayClassesCount: number;
  upcomingCount: number;
  completedThisMonth: number;
  attendancePercentage: number;
  feesExpected: number;
  feesReceived: number;
  feesPending: number;
  teachingHoursThisMonth: string;
}

export function SummaryMetrics({
  todayClassesCount,
  upcomingCount,
  completedThisMonth,
  attendancePercentage,
  feesExpected,
  feesReceived,
  feesPending,
  teachingHoursThisMonth,
}: SummaryMetricsProps) {
  const metrics = [
    {
      label: "Today's Classes",
      value: todayClassesCount,
      subtext: `${upcomingCount} upcoming ahead`,
      icon: CalendarDays,
      iconBg: 'bg-indigo-50 text-indigo-600',
      border: 'border-indigo-100',
    },
    {
      label: 'Completed Classes',
      value: completedThisMonth,
      subtext: `${teachingHoursThisMonth} taught this month`,
      icon: CheckCircle2,
      iconBg: 'bg-emerald-50 text-emerald-600',
      border: 'border-emerald-100',
    },
    {
      label: 'Attendance Rate',
      value: `${attendancePercentage}%`,
      subtext: 'Calculated from completed sessions',
      icon: TrendingUp,
      iconBg: 'bg-sky-50 text-sky-600',
      border: 'border-sky-100',
    },
    {
      label: 'Fees Expected',
      value: formatINR(feesExpected),
      subtext: 'Billed across all students',
      icon: CreditCard,
      iconBg: 'bg-purple-50 text-purple-600',
      border: 'border-purple-100',
    },
    {
      label: 'Fees Received',
      value: formatINR(feesReceived),
      subtext: 'Collected this month',
      icon: IndianRupee,
      iconBg: 'bg-emerald-50 text-emerald-600',
      border: 'border-emerald-100',
    },
    {
      label: 'Fees Pending',
      value: formatINR(feesPending),
      subtext: feesPending > 0 ? 'Action required' : 'All clear',
      icon: AlertCircle,
      iconBg: feesPending > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400',
      border: feesPending > 0 ? 'border-amber-100' : 'border-slate-100',
      alert: feesPending > 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
      {metrics.map((m, idx) => {
        const Icon = m.icon;
        return (
          <Card key={idx} className={`border ${m.border} transition-all hover:scale-[1.02]`}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 truncate">{m.label}</span>
                <div className={`p-2 rounded-lg ${m.iconBg}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  {m.value}
                </div>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">{m.subtext}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
