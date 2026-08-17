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

export function GreetingBanner({ tutorName = 'Tutor', todayClassesCount }: GreetingBannerProps) {
  const greeting = getGreeting();

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-purple-700 to-pink-600 p-6 sm:p-8 text-white shadow-xl shadow-purple-900/10">
      {/* Decorative gradient orbs */}
      <div className="absolute top-0 right-0 -mt-12 -mr-12 w-72 h-72 rounded-full bg-pink-400/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 rounded-full bg-blue-400/20 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-pink-100 border border-white/20 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-pink-300 animate-pulse" />
            <span>Smart Personal Tuition Assistant</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-xs">
            {greeting}, {tutorName} 👋
          </h1>

          <p className="text-sm text-purple-100/90 max-w-xl leading-relaxed">
            {todayClassesCount > 0
              ? `You have ${todayClassesCount} scheduled class${todayClassesCount > 1 ? 'es' : ''} today. Join your Google Meet sessions and track attendance effortlessly.`
              : 'No scheduled classes for today. You can review student progress, check fee reports, or configure student timetables.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link href="/students/new">
            <Button
              variant="secondary"
              className="bg-white text-purple-950 hover:bg-purple-50 font-bold shadow-md border-0"
            >
              <Plus className="w-4 h-4 mr-1.5 text-purple-600" />
              Add Student
            </Button>
          </Link>
          <Link href="/calendar">
            <Button
              variant="outline"
              className="bg-white/15 hover:bg-white/25 text-white border-white/30 hover:border-white/40 backdrop-blur-md font-semibold"
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
