'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type, title, message, duration = 4000 }: Omit<Toast, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, type, title, message, duration }]);

      setTimeout(() => {
        removeToast(id);
      }, duration);
    },
    [removeToast]
  );

  const success = useCallback((title: string, message?: string) => showToast({ type: 'success', title, message }), [showToast]);
  const error = useCallback((title: string, message?: string) => showToast({ type: 'error', title, message }), [showToast]);
  const warning = useCallback((title: string, message?: string) => showToast({ type: 'warning', title, message }), [showToast]);
  const info = useCallback((title: string, message?: string) => showToast({ type: 'info', title, message }), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={clsx(
              'pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg bg-white transition-all transform animate-in slide-in-from-bottom-5',
              {
                'border-emerald-200 text-emerald-900 bg-emerald-50/90': toast.type === 'success',
                'border-rose-200 text-rose-900 bg-rose-50/90': toast.type === 'error',
                'border-amber-200 text-amber-900 bg-amber-50/90': toast.type === 'warning',
                'border-sky-200 text-sky-900 bg-sky-50/90': toast.type === 'info',
              }
            )}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600" />}
              {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-sky-600" />}
            </div>
            <div className="flex-1 text-sm">
              <h4 className="font-semibold">{toast.title}</h4>
              {toast.message && <p className="text-xs opacity-90 mt-0.5">{toast.message}</p>}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 text-slate-400 hover:text-slate-600 p-1 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
