'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Play, Square, Clock, Video, CheckCircle } from 'lucide-react';
import { EnrichedClassSession, ClassSessionStatus } from '../../lib/types/database.types';
import { formatTime12h } from '../../lib/utils/date';

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
  const [subtopic, setSubtopic] = useState('');
  const [homework, setHomework] = useState('');
  const [notes, setNotes] = useState('');
  const [calculatedDuration, setCalculatedDuration] = useState(60);

  useEffect(() => {
    if (session) {
      if (session.actual_start && !session.actual_end) {
        // Timer was already started
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
      setSubtopic(session.notes_record?.subtopic || '');
      setHomework(session.notes_record?.homework || '');
      setNotes(session.notes_record?.notes || '');
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

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    setTimerRunning(true);
    onStartTimer(session.id);
  };

  const handleEnd = () => {
    setTimerRunning(false);
    const duration = Math.max(1, Math.round(elapsedSeconds / 60)) || 60;
    setCalculatedDuration(duration);
    setStep('COMPLETE');
  };

  const handleSubmitCompletion = (e: React.FormEvent) => {
    e.preventDefault();
    onEndTimerAndComplete({
      sessionId: session.id,
      studentId: session.student_id,
      subjectId: session.subject_id,
      status,
      actualDurationMinutes: calculatedDuration,
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
      title={step === 'TIMER' ? 'Live Class Session' : 'Complete Class & Log Attendance'}
      description={`${session.student_name} (${session.student_class}) • ${session.subject_name}`}
      maxWidth="lg"
    >
      {step === 'TIMER' ? (
        <div className="space-y-6 py-2">
          {/* Class Time Info */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Scheduled Time</p>
                <p className="text-sm font-semibold text-slate-900">
                  {formatTime12h(session.scheduled_start)} – {formatTime12h(session.scheduled_end)}
                </p>
              </div>
            </div>

            {session.meet_url && (
              <a
                href={session.meet_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
              >
                <Video className="w-4 h-4" />
                Join Google Meet
              </a>
            )}
          </div>

          {/* Stopwatch Display */}
          <div className="text-center py-8 bg-gradient-to-b from-indigo-50/50 to-transparent rounded-2xl border border-indigo-100/60">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 mb-2">
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
              <Button onClick={handleStart} variant="primary" size="lg" className="w-full">
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
              className="text-xs text-slate-500 hover:text-indigo-600 underline font-medium"
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

          {/* Duration field */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Actual Teaching Duration (Minutes)
            </label>
            <input
              type="number"
              min="1"
              max="300"
              value={calculatedDuration}
              onChange={(e) => setCalculatedDuration(parseInt(e.target.value, 10) || 60)}
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
              <label className="block text-xs font-medium text-slate-700 mb-1">Subtopic / Concepts</label>
              <input
                type="text"
                placeholder="e.g. Variable on both sides"
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
              placeholder="e.g. NCERT Exercise 4.2 Q1 to Q5"
              value={homework}
              onChange={(e) => setHomework(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Tutor Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Tutor Feedback / Notes</label>
            <textarea
              rows={2}
              placeholder="e.g. Needs additional practice on word problems"
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
              <CheckCircle className="w-4 h-4 mr-1.5" />
              Save & Complete Class
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
