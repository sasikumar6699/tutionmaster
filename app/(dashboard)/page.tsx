'use client';

import React, { useState, useEffect } from 'react';
import { GreetingBanner } from '../../components/dashboard/GreetingBanner';
import { SummaryMetrics } from '../../components/dashboard/SummaryMetrics';
import { TodayClassCard } from '../../components/dashboard/TodayClassCard';
import { ClassTimerModal } from '../../components/dashboard/ClassTimerModal';
import { QuickAttendanceModal } from '../../components/dashboard/QuickAttendanceModal';
import { SmartFeeAlerts } from '../../components/dashboard/SmartFeeAlerts';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/Toast';
import {
  EnrichedClassSession,
  ClassSessionStatus,
} from '../../lib/types/database.types';
import {
  CalendarDays,
  Sparkles,
  Plus,
  CreditCard,
  Video,
} from 'lucide-react';
import Link from 'next/link';
import { formatDate, formatTime12h } from '../../lib/utils/date';

export default function DashboardPage() {
  const toast = useToast();

  const [todayClasses, setTodayClasses] = useState<EnrichedClassSession[]>([]);
  const [upcomingClasses, setUpcomingClasses] = useState<EnrichedClassSession[]>([]);
  const [completedThisMonth, setCompletedThisMonth] = useState<number>(0);
  const [expectedRevenue, setExpectedRevenue] = useState<number>(0);
  const [receivedRevenue, setReceivedRevenue] = useState<number>(0);
  const [pendingRevenue, setPendingRevenue] = useState<number>(0);
  const [alerts, setAlerts] = useState<{ message: string; severity: 'info' | 'warning' | 'danger' | 'success'; studentId?: string }[]>([]);

  // Modal states
  const [timerModalSession, setTimerModalSession] = useState<EnrichedClassSession | null>(null);
  const [attendanceModalSession, setAttendanceModalSession] = useState<EnrichedClassSession | null>(null);

  const refreshData = async () => {
    try {
      const res = await fetch('/api/dashboard');
      const json = await res.json();
      if (json.success && json.data) {
        setTodayClasses(json.data.todayClasses || []);
        setUpcomingClasses(json.data.upcomingClasses || []);
        setCompletedThisMonth(json.data.completedThisMonth || 0);
        setExpectedRevenue(json.data.expectedRevenue || 0);
        setReceivedRevenue(json.data.receivedRevenue || 0);
        setPendingRevenue(json.data.pendingRevenue || 0);
        setAlerts(json.data.alerts || []);
      }
    } catch (err: unknown) {
      console.error('Failed to load dashboard:', err);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleStartTimer = async (sessionId: string) => {
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'START_TIMER', sessionId }),
      });
      const json = await res.json();
      if (json.success) {
        toast.info('Class timer started', 'Live duration tracking is now active');
        refreshData();
      }
    } catch (e: unknown) {
      toast.error('Error starting timer', e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const handleCompleteClass = async (data: {
    sessionId: string;
    studentId: string;
    subjectId: string;
    status: ClassSessionStatus;
    actualDurationMinutes: number;
    topic?: string;
    subtopic?: string;
    homework?: string;
    notes?: string;
  }) => {
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'COMPLETE_CLASS', data }),
      });
      const json = await res.json();
      if (json.success) {
        if (json.data?.invoiceGenerated) {
          toast.success(
            'Batch Completed & Invoice Generated!',
            `₹${json.data.invoiceGenerated.amount_due.toLocaleString('en-IN')} fee recorded for completed classes.`
          );
        } else {
          toast.success('Class Completed', 'Attendance and session notes saved successfully.');
        }
        refreshData();
      }
    } catch (e: unknown) {
      toast.error('Failed to complete class', e instanceof Error ? e.message : 'Unknown error');
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Top Greeting Banner */}
      <GreetingBanner
        tutorName="Aditya"
        todayClassesCount={todayClasses.length}
      />

      {/* 2. Key Metrics Summary Grid */}
      <SummaryMetrics
        todayClassesCount={todayClasses.length}
        upcomingCount={upcomingClasses.length}
        completedThisMonth={completedThisMonth}
        attendancePercentage={100}
        feesExpected={expectedRevenue}
        feesReceived={receivedRevenue}
        feesPending={pendingRevenue}
        teachingHoursThisMonth={`${completedThisMonth}h`}
      />

      {/* 3. Actionable Fee & Batch Alerts */}
      <SmartFeeAlerts alerts={alerts} />

      {/* 4. Main 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Today's Chronological Schedule */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Today&apos;s Class Schedule</h2>
                <p className="text-xs text-slate-500">Chronological list of classes scheduled for today</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-100/80 text-indigo-800 rounded-full">
              {todayClasses.length} {todayClasses.length === 1 ? 'Class' : 'Classes'}
            </span>
          </div>

          {todayClasses.length === 0 ? (
            <Card className="p-8 text-center bg-slate-50/50 border-dashed">
              <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-700">No classes scheduled for today</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Enjoy your break or check upcoming sessions on the calendar.
              </p>
              <div className="mt-4 flex justify-center gap-3">
                <Link href="/calendar">
                  <Button variant="secondary" size="sm">View Full Calendar</Button>
                </Link>
                <Link href="/students/new">
                  <Button variant="primary" size="sm">
                    <Plus className="w-4 h-4 mr-1.5" />
                    Onboard Student
                  </Button>
                </Link>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {todayClasses.map((session) => (
                <TodayClassCard
                  key={session.id}
                  session={session}
                  onOpenTimer={(s) => setTimerModalSession(s)}
                  onOpenAttendance={(s) => setAttendanceModalSession(s)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Col: Quick Actions & Upcoming Classes */}
        <div className="space-y-6">
          {/* Quick Assistant Actions Card */}
          <Card className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-indigo-200 flex items-center justify-between">
                <span>Quick Assistant Actions</span>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <Link href="/students/new" className="block">
                <Button variant="secondary" className="w-full justify-start text-xs bg-slate-800 hover:bg-slate-700 text-white border-slate-700">
                  <Plus className="w-4 h-4 mr-2 text-indigo-400" />
                  Add New Student (5-Step Wizard)
                </Button>
              </Link>
              <Link href="/fees" className="block">
                <Button variant="secondary" className="w-full justify-start text-xs bg-slate-800 hover:bg-slate-700 text-white border-slate-700">
                  <CreditCard className="w-4 h-4 mr-2 text-emerald-400" />
                  Record Received Payment
                </Button>
              </Link>
              <Link href="/calendar" className="block">
                <Button variant="secondary" className="w-full justify-start text-xs bg-slate-800 hover:bg-slate-700 text-white border-slate-700">
                  <CalendarDays className="w-4 h-4 mr-2 text-sky-400" />
                  Reschedule Upcoming Class
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Upcoming Classes Preview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-800 flex items-center justify-between">
                <span>Upcoming Sessions</span>
                <Link href="/calendar" className="text-xs text-indigo-600 hover:underline font-normal">
                  View all
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-slate-100">
              {upcomingClasses.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No upcoming classes scheduled.
                </div>
              ) : (
                upcomingClasses.map((session) => (
                  <div key={session.id} className="p-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-900">{session.student?.name}</span>
                        <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
                          {session.subject?.name}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <span>{formatDate(session.class_date, 'EEE, dd MMM')}</span>
                        <span>•</span>
                        <span>{formatTime12h(session.scheduled_start)} - {formatTime12h(session.scheduled_end)}</span>
                      </div>
                    </div>
                    {session.meet_url && (
                      <a
                        href={session.meet_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                        title="Join Google Meet"
                      >
                        <Video className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <ClassTimerModal
        session={timerModalSession}
        isOpen={!!timerModalSession}
        onClose={() => setTimerModalSession(null)}
        onStartTimer={(sessionId) => {
          handleStartTimer(sessionId);
        }}
        onEndTimerAndComplete={(data) => {
          handleCompleteClass(data);
          setTimerModalSession(null);
        }}
      />

      <QuickAttendanceModal
        session={attendanceModalSession}
        isOpen={!!attendanceModalSession}
        onClose={() => setAttendanceModalSession(null)}
        onSave={(data) => {
          handleCompleteClass(data);
          setAttendanceModalSession(null);
        }}
      />
    </div>
  );
}
