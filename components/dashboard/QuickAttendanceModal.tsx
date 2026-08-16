'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { CheckCircle2 } from 'lucide-react';
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
  const [subtopic, setSubtopic] = useState('');
  const [homework, setHomework] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (session) {
      setStatus(session.status === 'UPCOMING' ? 'PRESENT' : session.status);
      setDuration(session.actual_duration_minutes || 60);
      setTopic(session.notes_record?.topic || '');
      setSubtopic(session.notes_record?.subtopic || '');
      setHomework(session.notes_record?.homework || '');
      setNotes(session.notes_record?.notes || '');
    }
  }, [session, isOpen]);

  if (!session) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      sessionId: session.id,
      studentId: session.student_id,
      subjectId: session.subject_id,
      status,
      actualDurationMinutes: duration,
      topic,
      subtopic,
      homework,
      notes,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Class Completion & Attendance"
      description={`${session.student_name} (${session.student_class}) • ${session.subject_name} • ${session.class_date}`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-1">
        {/* Attendance Status Picker */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Attendance Status *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { val: 'PRESENT', label: 'Present', color: 'border-emerald-500 bg-emerald-50 text-emerald-700' },
              { val: 'ABSENT', label: 'Absent', color: 'border-rose-500 bg-rose-50 text-rose-700' },
              { val: 'RESCHEDULED', label: 'Rescheduled', color: 'border-sky-500 bg-sky-50 text-sky-700' },
              { val: 'CANCELLED', label: 'Cancelled', color: 'border-slate-500 bg-slate-100 text-slate-700' },
            ].map((opt) => (
              <button
                type="button"
                key={opt.val}
                onClick={() => setStatus(opt.val as ClassSessionStatus)}
                className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                  status === opt.val
                    ? `${opt.color} ring-2 ring-indigo-500/20 shadow-xs font-bold`
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Teaching Duration (Minutes)
          </label>
          <input
            type="number"
            min="1"
            max="300"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value, 10) || 60)}
            className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
        </div>

        {/* Topic & Subtopic */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Topic Covered</label>
            <input
              type="text"
              placeholder="e.g. Linear Equations"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Subtopic / Details</label>
            <input
              type="text"
              placeholder="e.g. Word problems on numbers"
              value={subtopic}
              onChange={(e) => setSubtopic(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Homework */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Homework Assigned</label>
          <input
            type="text"
            placeholder="e.g. Exercise 4.2 Questions 1-5"
            value={homework}
            onChange={(e) => setHomework(e.target.value)}
            className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Tutor Feedback / Notes</label>
          <textarea
            rows={2}
            placeholder="e.g. Needs additional practice on sign conventions"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
