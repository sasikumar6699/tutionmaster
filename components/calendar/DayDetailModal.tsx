'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/Badge';
import { useToast } from '../ui/Toast';
import {
  EnrichedClassSession,
  Student,
  Subject,
  ClassSessionStatus,
} from '../../lib/types/database.types';
import {
  Calendar as CalendarIcon,
  Plus,
  Video,
  CheckCircle2,
  Trash2,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { formatTime12h } from '../../lib/utils/date';
import { format } from 'date-fns';

interface DayDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  sessions: EnrichedClassSession[];
  students: Student[];
  subjects: Subject[];
  onOpenSession?: (session: EnrichedClassSession) => void;
  onOpenAttendance: (session: EnrichedClassSession) => void;
  onRefresh: () => void;
}

export function DayDetailModal({
  isOpen,
  onClose,
  selectedDate,
  sessions,
  students,
  subjects,
  onOpenAttendance,
  onRefresh,
}: DayDetailModalProps) {
  const toast = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [studentId, setStudentId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [classDate, setClassDate] = useState('');
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('19:00');
  const [status, setStatus] = useState<ClassSessionStatus>('PRESENT');
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [meetUrl, setMeetUrl] = useState('');

  // Sync date when opened
  useEffect(() => {
    if (selectedDate) {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      setClassDate(dateStr);
    }
    if (students.length > 0 && !studentId) {
      setStudentId(students[0].id);
    }
    if (subjects.length > 0 && !subjectId) {
      setSubjectId(subjects[0].id);
    }
  }, [selectedDate, students, subjects]);

  // When student changes, prefill student's default subject and meet url
  const handleStudentChange = (newStudId: string) => {
    setStudentId(newStudId);
    const stud = students.find((s) => s.id === newStudId);
    if (stud?.meet_url) {
      setMeetUrl(stud.meet_url);
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) {
      toast.error('Student Required', 'Please select a student.');
      return;
    }
    if (!subjectId) {
      toast.error('Subject Required', 'Please select a subject.');
      return;
    }
    if (!classDate) {
      toast.error('Date Required', 'Please choose a class date.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_MANUAL_CLASS',
          data: {
            student_id: studentId,
            subject_id: subjectId,
            class_date: classDate,
            scheduled_start: startTime,
            scheduled_end: endTime,
            status,
            meet_url: meetUrl || undefined,
            topic: status === 'PRESENT' ? topic : undefined,
            notes: notes || undefined,
            actualDurationMinutes: status === 'PRESENT' ? durationMinutes : undefined,
          },
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to create schedule');

      const studName = students.find((s) => s.id === studentId)?.name || 'Student';
      if (status === 'PRESENT') {
        toast.success(
          'Class Completed & Logged',
          `${studName}'s session recorded. Fees & billing ledger updated.`
        );
      } else {
        toast.success(
          'Schedule Created',
          `New ${status.toLowerCase()} session added for ${studName}.`
        );
      }

      // Reset Form
      setTopic('');
      setNotes('');
      setShowAddForm(false);
      onRefresh();
    } catch (err: unknown) {
      toast.error('Failed to save', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (confirm('Are you sure you want to delete this class session?')) {
      try {
        const res = await fetch(`/api/classes?id=${sessionId}`, { method: 'DELETE' });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Failed to delete');
        toast.success('Session Deleted', 'Class session removed.');
        onRefresh();
      } catch (err: unknown) {
        toast.error('Delete Failed', err instanceof Error ? err.message : 'Unknown error');
      }
    }
  };

  if (!selectedDate) return null;

  const formattedDateTitle = format(selectedDate, 'EEEE, dd MMMM yyyy');
  const dateIso = format(selectedDate, 'yyyy-MM-dd');
  const daySessions = sessions.filter((s) => s.class_date === dateIso);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={formattedDateTitle}
      description={`Daily Schedule & Class Manager (${daySessions.length} sessions)`}
      maxWidth="lg"
    >
      <div className="space-y-5 py-1">
        {/* SECTION 1: Scheduled Classes on this Day */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-purple-600" />
              Scheduled Classes ({daySessions.length})
            </h4>

            {!showAddForm && (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 text-white shadow-xs hover:opacity-95 transition-opacity"
              >
                <Plus className="w-3.5 h-3.5" />
                Add a Schedule
              </button>
            )}
          </div>

          {daySessions.length === 0 ? (
            <div className="text-center py-6 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
              <p className="text-xs text-slate-500 font-medium">
                No classes scheduled for this date.
              </p>
              {!showAddForm && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddForm(true)}
                  className="mt-2 text-xs font-semibold text-purple-700 border-purple-200 hover:bg-purple-50"
                >
                  <Plus className="w-3.5 h-3.5 mr-1 text-purple-600" />
                  Add a Schedule for this date
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {daySessions.map((sess) => (
                <div
                  key={sess.id}
                  className="p-3 rounded-xl border border-slate-200/80 bg-white hover:border-purple-300 shadow-2xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 rounded-lg bg-purple-50 text-purple-700 font-semibold text-center min-w-[64px]">
                      {formatTime12h(sess.scheduled_start)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900">{sess.student_name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                          {sess.subject_name}
                        </span>
                        <StatusBadge status={sess.status} />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {formatTime12h(sess.scheduled_start)} – {formatTime12h(sess.scheduled_end)}
                        {sess.actual_duration_minutes && ` (${sess.actual_duration_minutes} mins)`}
                      </p>
                      {sess.notes_record?.topic && (
                        <p className="text-[11px] text-slate-700 font-medium mt-0.5 flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-purple-500" />
                          Topic: {sess.notes_record.topic}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    {sess.meet_url && (
                      <a
                        href={sess.meet_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        title="Google Meet"
                      >
                        <Video className="w-3 h-3" />
                        Meet
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => onOpenAttendance(sess)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 hover:bg-purple-100"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      Attendance
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSession(sess.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                      title="Delete class session"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 2: Add a Schedule / Log Class Session Form */}
        {showAddForm ? (
          <form
            onSubmit={handleSaveSchedule}
            className="p-4 rounded-xl bg-gradient-to-br from-purple-50/50 via-slate-50 to-pink-50/40 border border-purple-100 space-y-3.5"
          >
            <div className="flex items-center justify-between border-b border-purple-100 pb-2">
              <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                Add Schedule / Log Class Session
              </h4>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-[11px] text-slate-500 hover:text-slate-700 font-semibold"
              >
                Close Form
              </button>
            </div>

            {/* Student & Subject Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Student *
                </label>
                <select
                  value={studentId}
                  onChange={(e) => handleStudentChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs focus:ring-2 focus:ring-purple-500 font-medium"
                  required
                >
                  <option value="" disabled>
                    -- Choose Student --
                  </option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.class_level})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Subject *
                </label>
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs focus:ring-2 focus:ring-purple-500 font-medium"
                  required
                >
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Class Date *
                </label>
                <input
                  type="date"
                  value={classDate}
                  onChange={(e) => setClassDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Start Time *
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  End Time *
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
            </div>

            {/* Attendance / Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Attendance & Session Status *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { value: 'PRESENT', label: 'Present (Held)', desc: 'Counts for fees', color: 'emerald' },
                  { value: 'UPCOMING', label: 'Upcoming', desc: 'Future schedule', color: 'indigo' },
                  { value: 'ABSENT', label: 'Absent', desc: 'Missed class', color: 'amber' },
                  { value: 'CANCELLED', label: 'Cancelled', desc: 'No charge', color: 'rose' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setStatus(opt.value as ClassSessionStatus)}
                    className={`p-2 rounded-xl text-left border transition-all ${
                      status === opt.value
                        ? 'border-purple-600 bg-white shadow-xs ring-1 ring-purple-600'
                        : 'border-slate-200 bg-white/70 hover:bg-white text-slate-600'
                    }`}
                  >
                    <p className="text-xs font-bold text-slate-900">{opt.label}</p>
                    <p className="text-[10px] text-slate-500">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Status Inputs */}
            {status === 'PRESENT' && (
              <div className="space-y-2.5 p-3 rounded-lg bg-emerald-50/60 border border-emerald-200/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-900">
                    Teaching Details (Logged to Student Fees & Batch Progress)
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    Active for Billing
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Topic Covered *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Coordinate Geometry & Distance Formula"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Duration (Mins) *
                    </label>
                    <input
                      type="number"
                      min={15}
                      max={300}
                      step={5}
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 60)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Description / Class Notes (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Practiced 10 numerical problems, homework assigned"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}

            {status === 'ABSENT' && (
              <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-200">
                <label className="block text-xs font-semibold text-amber-900 mb-1">
                  Reason for Absence *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Student unwell / school function"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-purple-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 hover:opacity-95 text-white font-semibold shadow-xs"
              >
                {isSubmitting ? 'Saving...' : 'Save & Update Fees'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="pt-2 flex items-center justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
