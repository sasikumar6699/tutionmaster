'use client';

import React from 'react';
import { AlertTriangle, Sparkles, ArrowRight, Info } from 'lucide-react';
import Link from 'next/link';

interface SmartFeeAlertsProps {
  alerts: {
    message: string;
    severity: 'info' | 'warning' | 'danger' | 'success';
    studentId?: string;
  }[];
}

export function SmartFeeAlerts({ alerts }: SmartFeeAlertsProps) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          Actionable Assistant Insights & Fee Alerts
        </h3>
        <Link
          href="/fees"
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
        >
          <span>Manage Invoices</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {alerts.map((alert, idx) => {
          const isWarning = alert.severity === 'warning';
          const isDanger = alert.severity === 'danger';
          const isInfo = alert.severity === 'info';

          return (
            <div
              key={idx}
              className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
                isWarning
                  ? 'bg-amber-50/70 border-amber-200/80 text-amber-900'
                  : isDanger
                  ? 'bg-rose-50/70 border-rose-200/80 text-rose-900'
                  : 'bg-indigo-50/70 border-indigo-200/80 text-indigo-900'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {isWarning && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                {isDanger && <AlertTriangle className="w-4 h-4 text-rose-600" />}
                {isInfo && <Info className="w-4 h-4 text-indigo-600" />}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium leading-relaxed">{alert.message}</p>
                {alert.studentId && (
                  <Link
                    href={`/students/${alert.studentId}`}
                    className="inline-block text-[11px] font-semibold text-indigo-700 hover:underline mt-1"
                  >
                    View Student Profile &rarr;
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
