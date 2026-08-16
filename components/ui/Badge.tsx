import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'outline' | 'purple';
  size?: 'sm' | 'md' | 'lg';
}

export function Badge({
  children,
  className,
  variant = 'default',
  size = 'md',
  ...props
}: BadgeProps) {
  const baseClasses = 'inline-flex items-center font-medium rounded-full transition-colors';

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  const variantClasses = {
    default: 'bg-indigo-50 text-indigo-700 border border-indigo-200/60',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200/60',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200/60',
    info: 'bg-sky-50 text-sky-700 border border-sky-200/60',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200',
    outline: 'bg-transparent text-slate-700 border border-slate-300',
    purple: 'bg-purple-50 text-purple-700 border border-purple-200/60',
  };

  return (
    <span
      className={twMerge(clsx(baseClasses, sizeClasses[size], variantClasses[variant], className))}
      {...props}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'PRESENT':
    case 'PAID':
    case 'ACTIVE':
      return <Badge variant="success">{status}</Badge>;
    case 'ABSENT':
    case 'OVERDUE':
      return <Badge variant="danger">{status}</Badge>;
    case 'RESCHEDULED':
      return <Badge variant="info">RESCHEDULED</Badge>;
    case 'CANCELLED':
    case 'ARCHIVED':
      return <Badge variant="neutral">{status}</Badge>;
    case 'UPCOMING':
      return <Badge variant="default">UPCOMING</Badge>;
    case 'PARTIALLY_PAID':
    case 'PENDING':
      return <Badge variant="warning">{status.replace('_', ' ')}</Badge>;
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
}
