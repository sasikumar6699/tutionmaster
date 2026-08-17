import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '../components/ui/Toast';

export const metadata: Metadata = {
  title: 'Tuition Master - Smart Tuition Management Platform',
  description: 'Scalable tuition management system for classes, schedules, live timer, attendance, topics, automated billing, and Google Meet.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-50 text-slate-900 selection:bg-purple-500 selection:text-white">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
