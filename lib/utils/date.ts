import { format, parseISO, isValid } from 'date-fns';

export function formatDate(dateString: string | Date | undefined, formatStr = 'dd MMM yyyy'): string {
  if (!dateString) return '—';
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    if (!isValid(date)) return '—';
    return format(date, formatStr);
  } catch {
    return '—';
  }
}

export function formatTime12h(timeStr: string | undefined): string {
  if (!timeStr) return '—';
  try {
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    const hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  } catch {
    return timeStr;
  }
}

export function formatTimeRange(start: string, end: string): string {
  return `${formatTime12h(start)} – ${formatTime12h(end)}`;
}

export function getDayName(dayIndex: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayIndex % 7] || '';
}

export function getDayShortName(dayIndex: number): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[dayIndex % 7] || '';
}

export function calculateDurationMinutes(start: string | Date, end: string | Date): number {
  const startTime = typeof start === 'string' ? new Date(start).getTime() : start.getTime();
  const endTime = typeof end === 'string' ? new Date(end).getTime() : end.getTime();
  const diffMs = Math.max(0, endTime - startTime);
  return Math.round(diffMs / (1000 * 60));
}

export function formatDuration(minutes: number | undefined): string {
  if (!minutes && minutes !== 0) return '—';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}
