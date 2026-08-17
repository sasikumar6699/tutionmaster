'use client';

import React, { useState, useEffect } from 'react';
import { Bell, GraduationCap, AlertTriangle, CheckCircle, ExternalLink, Settings, Sparkles } from 'lucide-react';
import Link from 'next/link';

export function Header() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [insights, setInsights] = useState<{ alerts: { message: string; severity: string; studentId?: string }[] }>({ alerts: [] });
  const [todayStr, setTodayStr] = useState('');

  useEffect(() => {
    async function loadAlerts() {
      try {
        const res = await fetch('/api/dashboard');
        const json = await res.json();
        if (json.success && json.data?.alerts) {
          setInsights({ alerts: json.data.alerts });
        }
      } catch (err) {
        console.error('Failed to load header alerts:', err);
      }
    }
    loadAlerts();

    const now = new Date();
    setTodayStr(
      now.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    );
  }, []);

  return (
    <header className="h-16 border-b border-purple-100/70 bg-white/80 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-8 flex items-center justify-between">
      {/* Mobile Brand / Page Indicator */}
      <div className="flex items-center gap-3">
        <div className="lg:hidden w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-sm">
          <GraduationCap className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
            Tuition Workspace
            <span className="hidden sm:inline-block text-[11px] font-normal text-purple-400 border-l border-purple-200 pl-2">
              {todayStr}
            </span>
          </h2>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Quick Google Meet Launcher */}
        <Link
          href="https://meet.google.com"
          target="_blank"
          rel="noreferrer"
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-50 to-purple-50 text-purple-700 hover:from-blue-100 hover:to-purple-100 border border-purple-200 transition-colors shadow-2xs"
        >
          <ExternalLink className="w-3.5 h-3.5 text-purple-600" />
          <span>New Meet Session</span>
        </Link>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl text-slate-600 hover:text-purple-900 hover:bg-purple-50 transition-colors relative"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {insights.alerts.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-pink-500 ring-2 ring-white animate-pulse" />
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowNotifications(false)}
              />
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-purple-100 p-4 z-50 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between pb-3 border-b border-purple-50">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    Smart Assistant Alerts
                  </h4>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                    {insights.alerts.length} Active
                  </span>
                </div>

                <div className="py-2 space-y-2 max-h-80 overflow-y-auto">
                  {insights.alerts.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                      All classes and billing schedules are up to date!
                    </div>
                  ) : (
                    insights.alerts.map((alert, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 p-3 rounded-xl bg-purple-50/40 border border-purple-100 hover:bg-purple-50/80 transition-colors text-xs"
                      >
                        <AlertTriangle className="w-4 h-4 text-pink-500 shrink-0 mt-0.5" />
                        <div className="flex-1 text-slate-700 leading-relaxed font-medium">
                          {alert.message}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-2 border-t border-purple-50 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Auto-updated from live billing</span>
                  <Link
                    href="/fees"
                    onClick={() => setShowNotifications(false)}
                    className="font-semibold text-purple-600 hover:underline"
                  >
                    View All Invoices &rarr;
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Quick Settings Link */}
        <Link
          href="/settings"
          className="p-2 rounded-xl text-slate-600 hover:text-purple-900 hover:bg-purple-50 transition-colors"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </Link>
      </div>
    </header>
  );
}
