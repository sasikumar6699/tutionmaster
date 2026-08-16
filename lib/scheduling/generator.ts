import {
  RecurringSchedule,
  ClassSession,
  Student,
  Subject,
} from '../types/database.types';
import { addDays, format, parseISO, getDay, isBefore, isAfter, isEqual } from 'date-fns';

/**
 * Generates class sessions from active recurring schedules within a date range
 */
export function generateSessionsForRange(
  schedules: RecurringSchedule[],
  students: Student[],
  subjects: Subject[],
  existingSessions: ClassSession[],
  startDate: Date,
  endDate: Date
): ClassSession[] {
  const generated: ClassSession[] = [];
  const existingMap = new Map<string, ClassSession>();

  // Index existing sessions by studentId_date_time to avoid duplicate generation
  existingSessions.forEach((s) => {
    existingMap.set(`${s.student_id}_${s.class_date}_${s.scheduled_start}`, s);
  });

  const studentMap = new Map(students.map((s) => [s.id, s]));

  for (const sched of schedules) {
    if (!sched.active) continue;

    const student = studentMap.get(sched.student_id);
    if (!student || student.status === 'ARCHIVED') continue;

    const schedStart = parseISO(sched.effective_from);
    const schedEnd = sched.effective_until ? parseISO(sched.effective_until) : null;

    let curr = new Date(startDate);
    while (curr <= endDate) {
      const dayOfWeek = getDay(curr); // 0=Sun, 1=Mon, ..., 6=Sat

      if (dayOfWeek === sched.day_of_week) {
        const isAfterOrEqualStart = isEqual(curr, schedStart) || isAfter(curr, schedStart);
        const isBeforeOrEqualEnd = !schedEnd || isEqual(curr, schedEnd) || isBefore(curr, schedEnd);

        if (isAfterOrEqualStart && isBeforeOrEqualEnd) {
          const dateStr = format(curr, 'yyyy-MM-dd');
          const key = `${sched.student_id}_${dateStr}_${sched.start_time}`;

          if (!existingMap.has(key)) {
            const newSession: ClassSession = {
              id: `gen-${sched.id}-${dateStr}`,
              student_id: sched.student_id,
              subject_id: sched.subject_id,
              schedule_id: sched.id,
              class_date: dateStr,
              scheduled_start: sched.start_time,
              scheduled_end: sched.end_time,
              status: 'UPCOMING',
              meet_url: sched.meet_url || student.meet_url || '',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            generated.push(newSession);
          }
        }
      }
      curr = addDays(curr, 1);
    }
  }

  return [...existingSessions, ...generated];
}

/**
 * Reschedules a single class session non-destructively:
 * Marks old session as RESCHEDULED and creates a new UPCOMING session linked via rescheduled_from_id
 */
export function rescheduleSingleSession(
  originalSession: ClassSession,
  newDate: string,
  newStartTime: string,
  newEndTime: string,
  customMeetUrl?: string
): {
  updatedOriginal: ClassSession;
  newSession: ClassSession;
} {
  const updatedOriginal: ClassSession = {
    ...originalSession,
    status: 'RESCHEDULED',
    updated_at: new Date().toISOString(),
  };

  const newSession: ClassSession = {
    id: `resched-${Date.now()}`,
    student_id: originalSession.student_id,
    subject_id: originalSession.subject_id,
    schedule_id: originalSession.schedule_id,
    class_date: newDate,
    scheduled_start: newStartTime,
    scheduled_end: newEndTime,
    status: 'UPCOMING',
    meet_url: customMeetUrl || originalSession.meet_url,
    rescheduled_from_id: originalSession.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return { updatedOriginal, newSession };
}
