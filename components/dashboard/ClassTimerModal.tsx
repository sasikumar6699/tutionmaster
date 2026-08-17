'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Play, Square, CheckCircle, Clock, Video, User, BookOpen, AlertCircle, Calendar } from 'lucide-react';
import { EnrichedClassSession, ClassSessionStatus } from '../../lib/types/database.types';

interface ClassTimerModalProps {
  session: EnrichedClassSession | null;
  isOpen: boolean;
  onClose: () => void;
  onStartTimer: (sessionId: string) => void;
  onEndTimerAndComplete: (data: {
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

export function ClassTimerModal({
  session,
  isOpen,
  onClose,
  onStartTimer,
  onEndTimerAndComplete,
}: ClassTimerModalProps) {
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [step, setStep] = useState<'TIMER' | 'COMPLETE'>('TIMER');

  // Form fields
  const [status, setStatus] = useState<ClassSessionStatus>('PRESENT');
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [absentReason, setAbsentReason] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleStartTime, setRescheduleStartTime] = useState('18:00');
  const [rescheduleEndTime, setRescheduleEndTime] = useState('19:00');
  const [calculatedDuration, setCalculatedDuration] = useState(60);

  useEffect(() => {
    if (session) {
      if (session.actual_start && !session.actual_end) {
        setTimerRunning(true);
        const startTime = new Date(session.actual_start).getTime();
        const now = Date.now();
        setElapsedSeconds(Math.max(0, Math.floor((now - startTime) / 1000)));
      } else {
        setTimerRunning(false);
        setElapsedSeconds(0);
      }
      setStep('TIMER');
      setStatus('PRESENT');
      setTopic(session.notes_record?.topic || '');
      setDescription(session.notes_record?.notes || '');
      setAbsentReason('');
      setRescheduleReason('');
      setRescheduleDate(session.class_date);
      setRescheduleStartTime(session.scheduled_start);
      setRescheduleEndTime(session.scheduled_end);
    }
  }, [session, isOpen]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (timerRunning) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning]);

  if (!session) return null;

  const handleStart = () => {
    onStartTimer(session.id);
    setTimerRunning(true);
  };

  const handleEnd = () => {
    setTimerRunning(false);
    const mins = Math.max(1, Math.round(elapsedSeconds / 60));
    setCalculatedDuration(mins);
    setStep('COMPLETE');
  };

  const handleSubmitCompletion = (e: React.FormEvent) => {
    e.preventDefault();
    let finalNotes = '';

    if (status === 'PRESENT') {
      finalNotes = description;
    } else if (status === 'ABSENT') {
      finalNotes = absentReason ? `Absent Reason: ${absentReason}` : '';
    } else if (status === 'RESCHEDULED') {
      finalNotes = rescheduleReason ? `Rescheduled Reason: ${rescheduleReason}` : '';
    }

    onEndTimerAndComplete({
      sessionId: session.id,
      studentId: session.student_id,
      subjectId: session.subject_id,
      status,
      actualDurationMinutes: status === 'PRESENT' ? calculatedDuration : 0,
      topic: status === 'PRESENT' ? topic : undefined,
      notes: finalNotes,
      rescheduleDate: status === 'RESCHEDULED' ? rescheduleDate : undefined,
      rescheduleStartTime: status === 'RESCHEDULED' ? rescheduleStartTime : undefined,
      rescheduleEndTime: status === 'RESCHEDULED' ? rescheduleEndTime : undefined,
    });
    onClose();
  };

  const formatTimer = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={step === 'TIMER' ? 'Live Tuition Class Session' : 'Complete & Log Class Summary'}
      description={`${session.student_name} (${session.student_class}) • ${session.subject_name}`}
      maxWidth="lg"
    >
      {step === 'TIMER' ? (
        <div className="space-y-6 py-2">
          {/* Quick Context Card */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-purple-50/50 border border-purple-100 text-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white border border-purple-200 text-purple-600">
                <User className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">{session.student_name}</p>
                <p className="text-slate-500">{session.student_class}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white border border-purple-200 text-purple-600">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">{session.subject_name}</p>
                <p className="text-slate-500 font-mono">
                  {session.scheduled_start} - {session.scheduled_end}
                </p>
              </div>
            </div>

            {session.meet_url && (
              <a
                href={session.meet_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                <Video className="w-4 h-4" />
                Join Google Meet
              </a>
            )}
          </div>

          {/* Stopwatch Display */}
          <div className="text-center py-8 bg-gradient-to-b from-purple-50/50 to-transparent rounded-2xl border border-purple-100/60">
            <p className="text-xs font-semibold uppercase tracking-wider text-purple-600 mb-2">
              {timerRunning ? 'Class in Progress' : 'Class Ready to Start'}
            </p>
            <div className="font-mono text-5xl sm:text-6xl font-bold text-slate-900 tracking-tight">
              {formatTimer(elapsedSeconds)}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {timerRunning ? 'Timer is active. Click End Class when finished.' : 'Click Start Class to begin live duration tracking.'}
            </p>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-center gap-4">
            {!timerRunning ? (
              <Button
                onClick={handleStart}
                size="lg"
                className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 hover:from-blue-700 hover:via-purple-700 hover:to-pink-600 text-white font-semibold shadow-sm"
              >
                <Play className="w-5 h-5 fill-current mr-2" />
                Start Class Timer
              </Button>
            ) : (
              <Button onClick={handleEnd} variant="danger" size="lg" className="w-full">
                <Square className="w-5 h-5 fill-current mr-2" />
                End Class & Log Summary
              </Button>
            )}
          </div>

          <div className="text-center">
            <button
              onClick={() => {
                setCalculatedDuration(60);
                setStep('COMPLETE');
              }}
              className="text-xs text-purple-600 hover:text-purple-800 underline font-medium"
            >
              Skip timer and mark attendance directly &rarr;
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmitCompletion} className="space-y-4 py-1">
          {/* Attendance Status Picker */}
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
                  Actual Teaching Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="300"
                  value={calculatedDuration}
                  onChange={(e) => setCalculatedDuration(parseInt(e.target.value, 10) || 60)}
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
              <CheckCircle className="w-4 h-4 mr-1.5" />
              Save & Complete Class
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
