import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success' | 'ghost' | 'meet';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, className, variant = 'primary', size = 'md', isLoading = false, disabled, ...props }, ref) => {
    const baseClasses =
      'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

    const sizeClasses = {
      sm: 'text-xs px-3 py-1.5 gap-1.5 h-8',
      md: 'text-sm px-4 py-2 gap-2 h-10',
      lg: 'text-base px-5 py-2.5 gap-2.5 h-12',
      icon: 'p-2 h-9 w-9 rounded-lg',
    };

    const variantClasses = {
      primary:
        'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm focus:ring-indigo-500',
      secondary:
        'bg-slate-100 hover:bg-slate-200 text-slate-800 focus:ring-slate-400',
      outline:
        'border border-slate-300 hover:bg-slate-50 text-slate-700 focus:ring-indigo-500 bg-white',
      danger:
        'bg-rose-600 hover:bg-rose-700 text-white shadow-sm focus:ring-rose-500',
      success:
        'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm focus:ring-emerald-500',
      ghost:
        'text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:ring-slate-400',
      meet:
        'bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm focus:ring-emerald-500',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={twMerge(clsx(baseClasses, sizeClasses[size], variantClasses[variant], className))}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin text-current" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
