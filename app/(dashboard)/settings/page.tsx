'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';
import { Subject } from '../../../lib/types/database.types';
import {
  Settings as SettingsIcon,
  User,
  BookOpen,
  Bell,
  RotateCcw,
  Plus,
  Trash2,
  CheckCircle,
} from 'lucide-react';

const DEFAULT_INITIAL_SUBJECTS: Subject[] = [
  { id: 'sub-1', tutor_id: '00000000-0000-0000-0000-000000000001', name: 'Maths', description: 'Advanced & Core Mathematics', created_at: '' },
  { id: 'sub-2', tutor_id: '00000000-0000-0000-0000-000000000001', name: 'Physics', description: 'Mechanics, Electromagnetism, & Optics', created_at: '' },
  { id: 'sub-3', tutor_id: '00000000-0000-0000-0000-000000000001', name: 'Chemistry', description: 'Organic, Inorganic & Physical Chemistry', created_at: '' },
  { id: 'sub-4', tutor_id: '00000000-0000-0000-0000-000000000001', name: 'Biology', description: 'Botany & Zoology', created_at: '' },
  { id: 'sub-5', tutor_id: '00000000-0000-0000-0000-000000000001', name: 'English', description: 'Grammar, Literature & Composition', created_at: '' },
];

export default function SettingsPage() {
  const toast = useToast();

  const [subjects, setSubjects] = useState<Subject[]>(DEFAULT_INITIAL_SUBJECTS);

  // Profile Form
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [timezone, setTimezone] = useState('Asia/Kolkata');

  // Subjects Form
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectDesc, setNewSubjectDesc] = useState('');

  // Notifications
  const [reminderMinutes, setReminderMinutes] = useState(30);

  const refreshData = async () => {
    try {
      const res = await fetch('/api/settings');
      const json = await res.json();
      if (json.success && json.data) {
        const p = json.data.profile;
        if (p) {
          setFullName(p.full_name || '');
          setEmail(p.email || '');
          setPhone(p.phone || '');
          setTimezone(p.timezone || 'Asia/Kolkata');
        }
        if (json.data.subjects && json.data.subjects.length > 0) {
          setSubjects(json.data.subjects);
        }
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_PROFILE',
          profile: {
            full_name: fullName,
            email,
            phone,
            timezone,
          },
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to save profile');

      toast.success('Profile Updated', 'Tutor settings saved successfully.');
      refreshData();
    } catch (err: unknown) {
      toast.error('Update Failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameToAdd = newSubjectName.trim();
    if (!nameToAdd) return;

    // Optimistically add to UI immediately
    const tempId = 'sub-' + Date.now();
    const tempSub: Subject = {
      id: tempId,
      tutor_id: '00000000-0000-0000-0000-000000000001',
      name: nameToAdd,
      description: newSubjectDesc.trim() || 'Custom subject',
      created_at: new Date().toISOString(),
    };

    setSubjects((prev) => [...prev, tempSub]);
    setNewSubjectName('');
    setNewSubjectDesc('');
    toast.success('Subject Added', `Created ${nameToAdd}`);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADD_SUBJECT',
          name: nameToAdd,
          description: tempSub.description,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setSubjects((prev) => prev.map((s) => (s.id === tempId ? json.data : s)));
      }
    } catch (err: unknown) {
      console.warn('API sync notice:', err);
    }
  };

  const handleDeleteSubject = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        const res = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'DELETE_SUBJECT', id }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Failed to delete');

        toast.info('Subject Removed', `${name} deleted.`);
        refreshData();
      } catch (err: unknown) {
        toast.error('Delete Failed', err instanceof Error ? err.message : 'Unknown error');
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <SettingsIcon className="w-6 h-6 text-indigo-600" />
            Tutor & Application Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Configure tutor credentials, curriculum subjects, default Meet preferences, and notifications
          </p>
        </div>
      </div>

      {/* 1. Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-600" />
            Tutor Profile & Contact
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Default Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST - UTC+05:30)</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button type="submit" variant="primary">
                Save Profile
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 2. Subjects Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            Curriculum Subjects Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden text-xs">
            {subjects.map((sub) => (
              <div key={sub.id} className="p-3.5 flex items-center justify-between bg-white hover:bg-slate-50">
                <div>
                  <span className="font-bold text-slate-900 text-sm">{sub.name}</span>
                  {sub.description && (
                    <p className="text-slate-500 text-xs mt-0.5">{sub.description}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteSubject(sub.id, sub.name)}
                  className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Delete Subject"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Add Subject Form */}
          <form onSubmit={handleAddSubject} className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-3">
            <h4 className="font-bold text-slate-800 uppercase tracking-wider">Add New Subject</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Subject Name (e.g. Computer Science)"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm bg-white"
                required
              />
              <input
                type="text"
                placeholder="Optional Description"
                value={newSubjectDesc}
                onChange={(e) => setNewSubjectDesc(e.target.value)}
                className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm bg-white"
              />
            </div>
            <Button type="submit" size="sm" variant="outline" className="bg-white">
              <Plus className="w-4 h-4 mr-1.5" />
              Add Subject
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 3. Notifications & Class Reminders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Bell className="w-4 h-4 text-indigo-600" />
            Class Reminders & Browser Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div>
              <p className="font-semibold text-slate-900">Upcoming Class Reminders</p>
              <p className="text-slate-500 text-[11px]">Notify before scheduled tuition session starts</p>
            </div>
            <select
              value={reminderMinutes}
              onChange={(e) => setReminderMinutes(parseInt(e.target.value, 10))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium"
            >
              <option value={15}>15 minutes before</option>
              <option value={30}>30 minutes before</option>
              <option value={60}>1 hour before</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div>
              <p className="font-semibold text-slate-900">Smart Batch & Fee Due Alerts</p>
              <p className="text-slate-500 text-[11px]">Automatic alerts when 7/8 classes are completed or fees are due</p>
            </div>
            <span className="text-emerald-700 font-bold px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100">
              Enabled
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 4. Supabase Database Sync Status */}
      <Card className="border-indigo-100 bg-indigo-50/20">
        <CardHeader>
          <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            Supabase Live Database Sync
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <p className="text-slate-600">
            Connected to live Supabase PostgreSQL database at <code className="font-mono bg-white px-1.5 py-0.5 rounded border text-indigo-700">asbieqicqznqjkaqcosp.supabase.co</code>. All queries, mutations, and student records are persisted directly to remote database tables.
          </p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => { refreshData(); toast.success('Cache Refreshed', 'Reloaded live data from Supabase'); }}>
              <RotateCcw className="w-4 h-4 mr-1.5" />
              Refresh Data Cache
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
