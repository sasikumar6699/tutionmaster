'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { CheckCircle2, Clock, Calendar, AlertCircle } from 'lucide-react';
import { EnrichedClassSession, ClassSessionStatus } from '../../lib/types/database.types';

interface QuickAttendanceModalProps {
  session: EnrichedClassSession | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    sessionId: string;
    studentId: string;
    subjectId: string;
    status: ClassSessionStatus;
    actualDurationMinutes: number;
    topic?: string;
    subtopic?: string;
    homework?: string;
    notes?: string;
    rescheduleDate?: string;
    rescheduleStartTime?: string;
    rescheduleEndTime?: string;
  }) => void;
}

export function QuickAttendanceModal({
  session,
  isOpen,
  onClose,
  onSave,
}: QuickAttendanceModalProps) {
  const [status, setStatus] = useState<ClassSessionStatus>('PRESENT');
  const [duration, setDuration] = useState<number>(60);
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [absentReason, setAbsentReason] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleStartTime, setRescheduleStartTime] = useState('18:00');
  const [rescheduleEndTime, setRescheduleEndTime] = useState('19:00');

  useEffect(() => {
    if (session) {
      setStatus(session.status === 'UPCOMING' ? 'PRESENT' : session.status);
      setDuration(session.actual_duration_minutes || 60);
      setTopic(session.notes_record?.topic || '');
      setDescription(session.notes_record?.notes || '');
      setAbsentReason('');
      setRescheduleReason('');
      setRescheduleDate(session.class_date);
      setRescheduleStartTime(session.scheduled_start);
      setRescheduleEndTime(session.scheduled_end);
    }
  }, [session, isOpen]);

  if (!session) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let finalNotes = '';

    if (status === 'PRESENT') {
      finalNotes = description;
    } else if (status === 'ABSENT') {
      finalNotes = absentReason ? `Absent Reason: ${absentReason}` : '';
    } else if (status === 'RESCHEDULED') {
      finalNotes = rescheduleReason ? `Rescheduled Reason: ${rescheduleReason}` : '';
    }

    onSave({
      sessionId: session.id,
      studentId: session.student_id,
      subjectId: session.subject_id,
      status,
      actualDurationMinutes: status === 'PRESENT' ? duration : 0,
      topic: status === 'PRESENT' ? topic : undefined,
      notes: finalNotes,
      rescheduleDate: status === 'RESCHEDULED' ? rescheduleDate : undefined,
      rescheduleStartTime: status === 'RESCHEDULED' ? rescheduleStartTime : undefined,
      rescheduleEndTime: status === 'RESCHEDULED' ? rescheduleEndTime : undefined,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Class Attendance & Log"
      description={`${session.student_name} (${session.student_class}) • ${session.subject_name} • ${session.class_date}`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-1">
        {/* Attendance Status Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Attendance Status *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { val: 'PRESENT', label: 'Present', color: 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/20' },
              { val: 'ABSENT', label: 'Absent', color: 'border-rose-500 bg-rose-50 text-rose-700 ring-2 ring-rose-500/20' },
              { val: 'RESCHEDULED', label: 'Rescheduled', color: 'border-purple-500 bg-purple-50 text-purple-700 ring-2 ring-purple-500/20' },
              { val: 'CANCELLED', label: 'Cancelled', color: 'border-slate-500 bg-slate-100 text-slate-700 ring-2 ring-slate-500/20' },
            ].map((opt) => (
              <button
                type="button"
                key={opt.val}
                onClick={() => setStatus(opt.val as ClassSessionStatus)}
                className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                  status === opt.val
                    ? `${opt.color} font-bold shadow-xs`
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Fields for PRESENT */}
        {status === 'PRESENT' && (
          <div className="space-y-3 bg-emerald-50/40 p-4 rounded-xl border border-emerald-100/80">
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1">
                Topic Covered *
              </label>
              <input
                type="text"
                placeholder="e.g. Linear Equations / Chemical Bonding"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1">
                Description / Notes
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Completed Chapter 4 theory and numerical exercises."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-600" />
                Teaching Duration (Minutes)
              </label>
              <input
                type="number"
                min="1"
                max="300"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value, 10) || 60)}
                className="w-full sm:w-48 px-3.5 py-1.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                required
              />
            </div>
          </div>
        )}

        {/* Dynamic Fields for ABSENT */}
        {status === 'ABSENT' && (
          <div className="space-y-3 bg-rose-50/40 p-4 rounded-xl border border-rose-100/80">
            <div>
              <label className="block text-xs font-semibold text-rose-900 mb-1">
                Reason for Absence *
              </label>
              <input
                type="text"
                placeholder="e.g. Student unwell / School exams / Family function"
                value={absentReason}
                onChange={(e) => setAbsentReason(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                required
              />
            </div>
          </div>
        )}

        {/* Dynamic Fields for RESCHEDULED */}
        {status === 'RESCHEDULED' && (
          <div className="space-y-3 bg-purple-50/40 p-4 rounded-xl border border-purple-100/80">
            <div>
              <label className="block text-xs font-semibold text-purple-900 mb-1">
                Reason for Rescheduling *
              </label>
              <input
                type="text"
                placeholder="e.g. Power cut / Schedule conflict / Mutual request"
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-purple-900 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-purple-600" />
                  Alternate Date *
                </label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-purple-900 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-purple-600" />
                  Start Time *
                </label>
                <input
                  type="time"
                  value={rescheduleStartTime}
                  onChange={(e) => setRescheduleStartTime(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-purple-900 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-purple-600" />
                  End Time *
                </label>
                <input
                  type="time"
                  value={rescheduleEndTime}
                  onChange={(e) => setRescheduleEndTime(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Notice for CANCELLED */}
        {status === 'CANCELLED' && (
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs">
            <AlertCircle className="w-4 h-4 text-slate-500 shrink-0" />
            <span>This class session will be marked as Cancelled. No notes or teaching duration are required.</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 hover:from-blue-700 hover:via-purple-700 hover:to-pink-600 text-white font-semibold shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            Save Attendance
          </Button>
        </div>
      </form>
    </Modal>
  );
}
