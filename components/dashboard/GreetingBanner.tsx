'use client';

import React from 'react';
import { getGreeting } from '../../lib/utils/date';
import { Sparkles, Calendar, Plus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '../ui/Button';

interface GreetingBannerProps {
  tutorName?: string;
  todayClassesCount: number;
}

export function GreetingBanner({ tutorName = 'Aditya', todayClassesCount }: GreetingBannerProps) {
  const greeting = getGreeting();

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-6 sm:p-8 text-white shadow-lg">
      {/* Subtle decorative background pattern */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 -mb-8 w-48 h-48 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-xs font-medium text-indigo-200 border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Smart Personal Tuition Assistant</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            {greeting}, {tutorName} 👋
          </h1>

          <p className="text-sm text-indigo-100/80 max-w-xl">
            {todayClassesCount > 0
              ? `You have ${todayClassesCount} scheduled class${todayClassesCount > 1 ? 'es' : ''} today. Join your Google Meet sessions and track attendance effortlessly.`
              : 'No scheduled classes for today. You can review student progress, check fee reports, or prepare homework assignments.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link href="/students/new">
            <Button
              variant="secondary"
              className="bg-white text-indigo-950 hover:bg-indigo-50 font-semibold shadow-sm border-0"
            >
              <Plus className="w-4 h-4 mr-1.5 text-indigo-600" />
              Add Student
            </Button>
          </Link>
          <Link href="/calendar">
            <Button
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 hover:border-white/30 backdrop-blur-xs"
            >
              <Calendar className="w-4 h-4 mr-1.5" />
              Full Calendar
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
