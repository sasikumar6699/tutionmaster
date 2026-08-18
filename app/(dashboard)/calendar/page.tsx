'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { StatusBadge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../components/ui/Toast';
import {
  EnrichedClassSession,
  Student,
  Subject,
  ClassSessionStatus,
} from '../../../lib/types/database.types';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Video,
  CheckCircle2,
  Filter,
  XCircle,
  RotateCw,
  Trash2,
  Plus,
} from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
} from 'date-fns';
import { formatDate, formatTime12h } from '../../../lib/utils/date';
import { QuickAttendanceModal } from '../../../components/dashboard/QuickAttendanceModal';
import { DayDetailModal } from '../../../components/calendar/DayDetailModal';

type CalendarViewMode = 'MONTH' | 'WEEK' | 'DAY';

export default function CalendarPage() {
  const toast = useToast();

  const [viewMode, setViewMode] = useState<CalendarViewMode>('MONTH');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [sessions, setSessions] = useState<EnrichedClassSession[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // Filters
  const [selectedStudentId, setSelectedStudentId] = useState<string>('ALL');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('ALL');

  // Modals / Drawers
  const [selectedSession, setSelectedSession] = useState<EnrichedClassSession | null>(null);
  const [attendanceModalSession, setAttendanceModalSession] = useState<EnrichedClassSession | null>(null);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [bulkDeleteDate, setBulkDeleteDate] = useState('2026-08-03');
  const [selectedDayForModal, setSelectedDayForModal] = useState<Date | null>(null);
  const [dayDetailModalOpen, setDayDetailModalOpen] = useState(false);

  // Reschedule Form
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleStartTime, setRescheduleStartTime] = useState('19:00');
  const [rescheduleEndTime, setRescheduleEndTime] = useState('20:00');
  const [cancelReason, setCancelReason] = useState('');

  const refreshSessions = async () => {
    // Generate dates for current view range
    let start: Date;
    let end: Date;

    if (viewMode === 'MONTH') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      start = startOfWeek(monthStart);
      end = endOfWeek(monthEnd);
    } else if (viewMode === 'WEEK') {
      start = startOfWeek(currentDate);
      end = endOfWeek(currentDate);
    } else {
      start = currentDate;
      end = currentDate;
    }

    const startIso = format(start, 'yyyy-MM-dd');
    const endIso = format(end, 'yyyy-MM-dd');

    try {
      const [sessRes, studRes, subRes] = await Promise.all([
        fetch(`/api/classes?startDate=${startIso}&endDate=${endIso}`),
        fetch('/api/students?status=ALL'),
        fetch('/api/settings'),
      ]);

      const [sessJson, studJson, subJson] = await Promise.all([
        sessRes.json(),
        studRes.json(),
        subRes.json(),
      ]);

      let loadedSessions = sessJson.success ? sessJson.data : [];
      if (selectedStudentId !== 'ALL') {
        loadedSessions = loadedSessions.filter((s: EnrichedClassSession) => s.student_id === selectedStudentId);
      }
      if (selectedSubjectId !== 'ALL') {
        loadedSessions = loadedSessions.filter((s: EnrichedClassSession) => s.subject_id === selectedSubjectId);
      }

      setSessions(loadedSessions);
      if (studJson.success) setStudents(studJson.data);
      if (subJson.success && subJson.data?.subjects) setSubjects(subJson.data.subjects);
    } catch (err) {
      console.error('Failed to load calendar data:', err);
    }
  };

  useEffect(() => {
    refreshSessions();
  }, [currentDate, viewMode, selectedStudentId, selectedSubjectId]);

  const handlePrev = () => {
    if (viewMode === 'MONTH') setCurrentDate((d) => subMonths(d, 1));
    else if (viewMode === 'WEEK') setCurrentDate((d) => subWeeks(d, 1));
    else setCurrentDate((d) => subDays(d, 1));
  };

  const handleNext = () => {
    if (viewMode === 'MONTH') setCurrentDate((d) => addMonths(d, 1));
    else if (viewMode === 'WEEK') setCurrentDate((d) => addWeeks(d, 1));
    else setCurrentDate((d) => addDays(d, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date('2026-08-14'));
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession || !rescheduleDate) return;

    try {
      const res = await fetch(`/api/classes/${selectedSession.id}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newDate: rescheduleDate,
          newStartTime: rescheduleStartTime,
          newEndTime: rescheduleEndTime,
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Reschedule failed');

      toast.success(
        'Class Rescheduled Successfully',
        `Original marked as RESCHEDULED. New class scheduled for ${rescheduleDate} at ${formatTime12h(rescheduleStartTime)}.`
      );
      setRescheduleModalOpen(false);
      setSelectedSession(null);
      refreshSessions();
    } catch (err: unknown) {
      toast.error('Reschedule failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession) return;

    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CANCEL_CLASS',
          sessionId: selectedSession.id,
          reason: cancelReason,
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Cancel failed');

      toast.info('Class Cancelled', 'Session marked as CANCELLED with reason noted.');
      setCancelModalOpen(false);
      setSelectedSession(null);
      refreshSessions();
    } catch (err: unknown) {
      toast.error('Cancel failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleSaveAttendance = async (data: {
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
        body: JSON.stringify({
          action: 'COMPLETE_CLASS',
          data,
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to complete class');

      toast.success('Attendance Recorded', 'Session completed.');
      setSelectedSession(null);
      refreshSessions();
    } catch (err: unknown) {
      toast.error('Error saving attendance', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleDeleteSingleSession = async () => {
    if (!selectedSession) return;
    if (confirm(`Are you sure you want to permanently delete the class session for ${selectedSession.student_name} on ${selectedSession.class_date}?`)) {
      try {
        const res = await fetch(`/api/classes?id=${selectedSession.id}`, {
          method: 'DELETE',
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Failed to delete');

        toast.success('Session Deleted', 'Class session permanently removed.');
        setSelectedSession(null);
        refreshSessions();
      } catch (err: unknown) {
        toast.error('Delete Failed', err instanceof Error ? err.message : 'Unknown error');
      }
    }
  };

  const handleBulkDeleteSessions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirm(`Are you sure you want to permanently delete all class sessions before ${bulkDeleteDate}?`)) {
      try {
        const res = await fetch(`/api/classes?beforeDate=${bulkDeleteDate}`, {
          method: 'DELETE',
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Failed to delete past sessions');

        toast.success('Past Sessions Cleared', json.message || `Deleted sessions before ${bulkDeleteDate}`);
        setBulkDeleteModalOpen(false);
        refreshSessions();
      } catch (err: unknown) {
        toast.error('Delete Failed', err instanceof Error ? err.message : 'Unknown error');
      }
    }
  };

  // Calendar rendering calculations
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const monthDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = eachDayOfInterval({
    start: startOfWeek(currentDate),
    end: endOfWeek(currentDate),
  });

  return (
    <div className="space-y-6">
      {/* Calendar Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {viewMode === 'MONTH' && format(currentDate, 'MMMM yyyy')}
              {viewMode === 'WEEK' && `Week of ${format(startOfWeek(currentDate), 'dd MMM yyyy')}`}
              {viewMode === 'DAY' && format(currentDate, 'EEEE, dd MMMM yyyy')}
            </h1>
            <p className="text-xs text-slate-500">
              Interactive tuition timetable and session manager
            </p>
          </div>
        </div>

        {/* Navigation & View Switcher */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
            <button
              onClick={handlePrev}
              className="p-2 hover:bg-slate-200 text-slate-700 transition-colors"
              title="Previous"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors border-x border-slate-200"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="p-2 hover:bg-slate-200 text-slate-700 transition-colors"
              title="Next"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs font-semibold">
            {(['MONTH', 'WEEK', 'DAY'] as CalendarViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  viewMode === mode
                    ? 'bg-white text-indigo-700 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode.charAt(0) + mode.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            onClick={() => {
              setSelectedDayForModal(new Date());
              setDayDetailModalOpen(true);
            }}
            className="text-xs bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 text-white font-bold shadow-xs hover:opacity-95"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add a Schedule
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setBulkDeleteModalOpen(true)}
            className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 font-semibold"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1 text-rose-500" />
            Delete Past Sessions
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 font-semibold uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5" />
          <span>Filters:</span>
        </div>

        {/* Student Filter */}
        <select
          value={selectedStudentId}
          onChange={(e) => setSelectedStudentId(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="ALL">All Students</option>
          {students.map((st) => (
            <option key={st.id} value={st.id}>
              {st.name} ({st.class_level})
            </option>
          ))}
        </select>

        {/* Subject Filter */}
        <select
          value={selectedSubjectId}
          onChange={(e) => setSelectedSubjectId(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="ALL">All Subjects</option>
          {subjects.map((sub) => (
            <option key={sub.id} value={sub.id}>
              {sub.name}
            </option>
          ))}
        </select>

        <span className="text-slate-400 ml-auto">
          Showing <span className="font-semibold text-slate-700">{sessions.length}</span> classes
        </span>
      </div>

      {/* 1. MONTH VIEW */}
      {viewMode === 'MONTH' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          {/* Weekday Labels */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center py-2.5 text-xs font-bold text-slate-600">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 min-h-[580px]">
            {monthDays.map((day, idx) => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, new Date('2026-08-14'));
              const daySessions = sessions.filter((s) => s.class_date === dayStr);

              return (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedDayForModal(day);
                    setDayDetailModalOpen(true);
                  }}
                  className={`p-2 min-h-[110px] transition-all flex flex-col justify-between cursor-pointer rounded-xl border border-transparent hover:border-purple-300 hover:bg-purple-50/20 group ${
                    !isCurrentMonth ? 'bg-slate-50/50 text-slate-400' : 'bg-white'
                  } ${isToday ? 'bg-purple-50/30 ring-1 ring-purple-200 font-semibold' : ''}`}
                  title="Click to view details or add schedule for this date"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-semibold rounded-full w-6 h-6 flex items-center justify-center ${
                        isToday
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-xs'
                          : isCurrentMonth
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                    {daySessions.length > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-purple-50 text-purple-700">
                        {daySessions.length}
                      </span>
                    )}
                  </div>

                  {/* Sessions on this day */}
                  <div className="mt-1.5 space-y-1 flex-1">
                    {daySessions.map((session) => {
                      const isPresent = session.status === 'PRESENT';
                      const isUpcoming = session.status === 'UPCOMING';
                      const isRescheduled = session.status === 'RESCHEDULED';

                      return (
                        <button
                          key={session.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSession(session);
                          }}
                          className={`w-full text-left p-1.5 rounded-lg text-[11px] font-medium border transition-all truncate block ${
                            isPresent
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                              : isUpcoming
                              ? 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100 font-semibold'
                              : isRescheduled
                              ? 'bg-sky-50 text-sky-800 border-sky-200 line-through opacity-75'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          <div className="truncate font-semibold">{session.student_name}</div>
                          <div className="text-[10px] opacity-80 truncate">
                            {formatTime12h(session.scheduled_start)} • {session.subject_name}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. WEEK VIEW */}
      {viewMode === 'WEEK' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="grid grid-cols-7 divide-x divide-slate-200 min-h-[500px]">
            {weekDays.map((day, idx) => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const isToday = isSameDay(day, new Date());
              const daySessions = sessions.filter((s) => s.class_date === dayStr);

              return (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedDayForModal(day);
                    setDayDetailModalOpen(true);
                  }}
                  className="flex flex-col cursor-pointer hover:bg-purple-50/20 transition-colors group"
                  title="Click to view details or add schedule for this date"
                >
                  <div
                    className={`p-3 text-center border-b border-slate-200 ${
                      isToday ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' : 'bg-slate-50 text-slate-700'
                    }`}
                  >
                    <p className="text-xs font-semibold">{format(day, 'EEE')}</p>
                    <p className="text-lg font-bold">{format(day, 'd')}</p>
                  </div>

                  <div className="p-2 space-y-2 flex-1 bg-slate-50/20">
                    {daySessions.length === 0 ? (
                      <div className="text-center py-6">
                        <p className="text-[11px] text-slate-400">No classes</p>
                        <span className="text-[10px] text-purple-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                          + Add Schedule
                        </span>
                      </div>
                    ) : (
                      daySessions.map((sess) => (
                        <div
                          key={sess.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSession(sess);
                          }}
                          className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:border-purple-300 cursor-pointer space-y-1.5 transition-all text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{sess.student_name}</span>
                            <StatusBadge status={sess.status} />
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {formatTime12h(sess.scheduled_start)} – {formatTime12h(sess.scheduled_end)}
                          </p>
                          <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-medium">
                            {sess.subject_name}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. DAY VIEW */}
      {viewMode === 'DAY' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center justify-between">
              <span>Sessions on {format(currentDate, 'EEEE, dd MMMM yyyy')}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs font-normal text-slate-500">
                  {sessions.filter((s) => s.class_date === format(currentDate, 'yyyy-MM-dd')).length} classes scheduled
                </span>
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedDayForModal(currentDate);
                    setDayDetailModalOpen(true);
                  }}
                  className="text-xs bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 text-white font-bold shadow-xs hover:opacity-95"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add a Schedule
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sessions.filter((s) => s.class_date === format(currentDate, 'yyyy-MM-dd')).length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                <p>No classes scheduled on this day.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedDayForModal(currentDate);
                    setDayDetailModalOpen(true);
                  }}
                  className="mt-3 text-xs font-semibold text-purple-700 border-purple-200 hover:bg-purple-50"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add a Schedule for this Day
                </Button>
              </div>
            ) : (
              sessions
                .filter((s) => s.class_date === format(currentDate, 'yyyy-MM-dd'))
                .map((sess) => (
                  <div
                    key={sess.id}
                    className="p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white hover:border-purple-300 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-purple-50 text-purple-800 text-center font-bold text-xs min-w-[70px]">
                        {formatTime12h(sess.scheduled_start)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{sess.student_name}</h4>
                        <p className="text-xs text-slate-500">
                          {sess.student_class} • {sess.subject_name}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusBadge status={sess.status} />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedSession(sess)}
                        className="text-xs font-semibold"
                      >
                        Manage Session
                      </Button>
                    </div>
                  </div>
                ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Class Action Drawer / Modal */}
      {selectedSession && (
        <Modal
          isOpen={Boolean(selectedSession)}
          onClose={() => setSelectedSession(null)}
          title="Class Session Details"
          description={`${selectedSession.student_name} • ${selectedSession.subject_name}`}
        >
          <div className="space-y-5 py-2">
            {/* Metadata Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Status</span>
                <StatusBadge status={selectedSession.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Class Date</span>
                <span className="font-semibold text-slate-800">
                  {formatDate(selectedSession.class_date, 'EEEE, dd MMMM yyyy')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Scheduled Time</span>
                <span className="font-semibold text-slate-800">
                  {formatTime12h(selectedSession.scheduled_start)} – {formatTime12h(selectedSession.scheduled_end)}
                </span>
              </div>

              {selectedSession.meet_url && (
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-slate-500">Google Meet URL</span>
                  <a
                    href={selectedSession.meet_url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-emerald-700 hover:underline flex items-center gap-1"
                  >
                    <Video className="w-3.5 h-3.5" />
                    Open Google Meet
                  </a>
                </div>
              )}
            </div>

            {/* If Topic/Homework already recorded */}
            {selectedSession.notes_record?.topic && (
              <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 text-xs space-y-1.5">
                <h4 className="font-semibold text-indigo-950">Topic & Homework Logged</h4>
                <p className="text-slate-700">
                  <span className="font-medium">Topic:</span> {selectedSession.notes_record.topic}
                </p>
                {selectedSession.notes_record.homework && (
                  <p className="text-slate-700">
                    <span className="font-medium">Homework:</span> {selectedSession.notes_record.homework}
                  </p>
                )}
                {selectedSession.notes_record.notes && (
                  <p className="text-slate-500 italic mt-1">&quot;{selectedSession.notes_record.notes}&quot;</p>
                )}
              </div>
            )}

            {/* Actions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              {selectedSession.meet_url && (
                <a
                  href={selectedSession.meet_url}
                  target="_blank"
                  rel="noreferrer"
                  className="sm:col-span-2"
                >
                  <Button variant="meet" className="w-full">
                    <Video className="w-4 h-4 mr-2" />
                    Launch Google Meet
                  </Button>
                </a>
              )}

              <Button
                variant="primary"
                onClick={() => {
                  setAttendanceModalSession(selectedSession);
                }}
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Mark Attendance / Notes
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setRescheduleDate(selectedSession.class_date);
                  setRescheduleStartTime(selectedSession.scheduled_start);
                  setRescheduleEndTime(selectedSession.scheduled_end);
                  setRescheduleModalOpen(true);
                }}
              >
                <RotateCw className="w-4 h-4 mr-1.5 text-sky-600" />
                Reschedule Session
              </Button>

              <Button
                variant="outline"
                className="text-rose-600 hover:bg-rose-50 border-rose-200"
                onClick={() => setCancelModalOpen(true)}
              >
                <XCircle className="w-4 h-4 mr-1.5" />
                Cancel Session
              </Button>

              <Button
                variant="outline"
                className="text-rose-700 hover:bg-rose-100 border-rose-300 font-semibold"
                onClick={handleDeleteSingleSession}
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                Delete Session
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reschedule Modal */}
      {rescheduleModalOpen && selectedSession && (
        <Modal
          isOpen={rescheduleModalOpen}
          onClose={() => setRescheduleModalOpen(false)}
          title="Reschedule Class Session"
          description={`Original: ${formatDate(selectedSession.class_date)} (${formatTime12h(selectedSession.scheduled_start)})`}
        >
          <form onSubmit={handleRescheduleSubmit} className="space-y-4 py-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                New Class Date *
              </label>
              <input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Start Time *
                </label>
                <input
                  type="time"
                  value={rescheduleStartTime}
                  onChange={(e) => setRescheduleStartTime(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  End Time *
                </label>
                <input
                  type="time"
                  value={rescheduleEndTime}
                  onChange={(e) => setRescheduleEndTime(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

            <div className="p-3 rounded-lg bg-sky-50 border border-sky-200 text-xs text-sky-900">
              <p className="font-semibold">Non-destructive reschedule:</p>
              <p className="mt-0.5">
                The original class on {formatDate(selectedSession.class_date)} will be marked as RESCHEDULED for your records, and a new UPCOMING session will be created.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <Button type="button" variant="outline" onClick={() => setRescheduleModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Confirm Reschedule
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Cancel Modal */}
      {cancelModalOpen && selectedSession && (
        <Modal
          isOpen={cancelModalOpen}
          onClose={() => setCancelModalOpen(false)}
          title="Cancel Class Session"
          description={`Cancel session for ${selectedSession.student_name} on ${formatDate(selectedSession.class_date)}`}
        >
          <form onSubmit={handleCancelSubmit} className="space-y-4 py-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for cancellation (optional)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Student illness, public holiday, exam revision"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <Button type="button" variant="outline" onClick={() => setCancelModalOpen(false)}>
                Go Back
              </Button>
              <Button type="submit" variant="danger">
                Confirm Cancellation
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Attendance Modal */}
      <QuickAttendanceModal
        session={attendanceModalSession}
        isOpen={Boolean(attendanceModalSession)}
        onClose={() => setAttendanceModalSession(null)}
        onSave={handleSaveAttendance}
      />

      {/* Bulk Delete Past Sessions Modal */}
      {bulkDeleteModalOpen && (
        <Modal
          isOpen={bulkDeleteModalOpen}
          onClose={() => setBulkDeleteModalOpen(false)}
          title="Delete Past Class Sessions"
          description="Permanently delete all class sessions scheduled before a specific date"
        >
          <form onSubmit={handleBulkDeleteSessions} className="space-y-4 py-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Delete All Sessions Scheduled Before Date *
              </label>
              <input
                type="date"
                value={bulkDeleteDate}
                onChange={(e) => setBulkDeleteDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-rose-500 bg-white"
                required
              />
              <p className="text-xs text-slate-500 mt-1.5">
                For example, enter <strong>2026-08-03</strong> to delete all sessions before August 3, 2026.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setBulkDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-xs">
                <Trash2 className="w-4 h-4 mr-1.5" />
                Delete Sessions Before Date
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Day Details & Add Schedule Modal */}
      <DayDetailModal
        isOpen={dayDetailModalOpen}
        onClose={() => setDayDetailModalOpen(false)}
        selectedDate={selectedDayForModal}
        sessions={sessions}
        students={students}
        subjects={subjects}
        onOpenSession={(sess) => {
          setSelectedSession(sess);
        }}
        onOpenAttendance={(sess) => {
          setAttendanceModalSession(sess);
        }}
        onRefresh={refreshSessions}
      />
    </div>
  );
}
