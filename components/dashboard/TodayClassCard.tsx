'use client';

import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/Badge';
import { Video, Clock, CheckCircle2, Play, Square, BookOpen } from 'lucide-react';
import { EnrichedClassSession } from '../../lib/types/database.types';
import { formatTime12h } from '../../lib/utils/date';

interface TodayClassCardProps {
  session: EnrichedClassSession;
  onOpenTimer: (session: EnrichedClassSession) => void;
  onOpenAttendance: (session: EnrichedClassSession) => void;
}

export function TodayClassCard({
  session,
  onOpenTimer,
  onOpenAttendance,
}: TodayClassCardProps) {
  const isTimerRunning = Boolean(session.actual_start && !session.actual_end);
  const isCompleted = session.status === 'PRESENT' || session.status === 'ABSENT';

  return (
    <Card className="hover:border-indigo-200 transition-all">
      <CardContent className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Class Time & Details */}
          <div className="flex items-start gap-3.5">
            {/* Time Slot Badge */}
            <div className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-900 min-w-[72px] shrink-0">
              <span className="text-xs font-bold tracking-tight">
                {formatTime12h(session.scheduled_start)}
              </span>
              <span className="text-[10px] text-indigo-600 font-medium">
                {formatTime12h(session.scheduled_end)}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-semibold text-slate-900">
                  {session.student_name}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                  {session.student_class}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-medium">
                  {session.subject_name}
                </span>
                <StatusBadge status={session.status} />

                {isTimerRunning && (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    IN PROGRESS
                  </span>
                )}
              </div>

              {/* Notes / Homework / Duration Summary if already logged */}
              {session.actual_duration_minutes && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium pt-0.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Actual Duration: {session.actual_duration_minutes} mins</span>
                </div>
              )}

              {session.notes_record?.topic && (
                <div className="flex items-center gap-1.5 text-xs text-slate-600 pt-0.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="font-semibold text-slate-700">Topic:</span>
                  <span>{session.notes_record.topic}</span>
                  {session.notes_record.homework && (
                    <span className="text-slate-400 font-normal">
                      • HW: {session.notes_record.homework}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            {/* Join Google Meet */}
            {session.meet_url && (
              <a
                href={session.meet_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
                title="Open Google Meet in new tab"
              >
                <Video className="w-4 h-4" />
                <span>Join Google Meet</span>
              </a>
            )}

            {/* Timer Button */}
            {!isCompleted && (
              <Button
                variant={isTimerRunning ? 'danger' : 'outline'}
                size="sm"
                onClick={() => onOpenTimer(session)}
                className="text-xs"
              >
                {isTimerRunning ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current mr-1.5 text-white" />
                    End Class
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                    Start Timer
                  </>
                )}
              </Button>
            )}

            {/* Attendance & Topic Form */}
            <Button
              variant={isCompleted ? 'secondary' : 'primary'}
              size="sm"
              onClick={() => onOpenAttendance(session)}
              className="text-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              {isCompleted ? 'Edit Notes / Attendance' : 'Mark Attendance'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
