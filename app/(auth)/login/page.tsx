'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';
import { GraduationCap, Sparkles, LogIn, Lock, Mail } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();

  const [email, setEmail] = useState('tutor@tutorpulse.io');
  const [password, setPassword] = useState('••••••••••••');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success('Welcome back, SN!', 'Logged in to TutorPulse workspace');
      router.push('/');
    }, 600);
  };

  const handleDemoLogin = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success('Signed in as Demo Tutor', 'Loaded workspace with Sreesha, Siva, and Mrithika');
      router.push('/');
    }, 400);
  };

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Brand */}
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-indigo-500/30">
          <GraduationCap className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">TutorPulse</h1>
        <p className="text-xs text-slate-400">Smart Tuition & Automated Billing Assistant</p>
      </div>

      <Card className="border-slate-800 bg-slate-900 text-white shadow-2xl">
        <CardContent className="p-6 sm:p-8 space-y-5">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold text-white">Tutor Account Sign In</h2>
            <p className="text-xs text-slate-400">Enter your credentials or use the 1-click demo login</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-700 bg-slate-800 text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border border-slate-700 bg-slate-800 text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            <Button type="submit" variant="primary" className="w-full h-11 text-sm font-semibold" isLoading={loading}>
              <LogIn className="w-4 h-4 mr-2" />
              Sign In to Workspace
            </Button>
          </form>

          <div className="relative flex items-center justify-center py-2">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-slate-900 px-3 text-[11px] text-slate-500 font-semibold uppercase">Or</span>
          </div>

          {/* 1-Click Demo Login */}
          <Button
            type="button"
            variant="secondary"
            onClick={handleDemoLogin}
            className="w-full h-11 text-xs bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-800/80 font-bold"
          >
            <Sparkles className="w-4 h-4 mr-2 text-amber-400" />
            1-Click Instant Demo Tutor Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
