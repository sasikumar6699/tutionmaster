'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardFooter } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { useToast } from '../../../../components/ui/Toast';
import { Subject, BillingType } from '../../../../lib/types/database.types';
import {
  UserPlus,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Plus,
  Trash2,
} from 'lucide-react';
import { getDayName, formatTime12h } from '../../../../lib/utils/date';
import { formatINR } from '../../../../lib/utils/currency';

export default function NewStudentPage() {
  const router = useRouter();
  const toast = useToast();

  const [step, setStep] = useState<number>(1);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // Step 1: Basic Info
  const [name, setName] = useState('');
  const [classLevel, setClassLevel] = useState('Class 8');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [meetUrl, setMeetUrl] = useState('https://meet.google.com/');

  // Step 2: Subjects
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [newSubjectName, setNewSubjectName] = useState('');

  // Step 3: Schedules
  const [schedules, setSchedules] = useState<
    { day_of_week: number; start_time: string; end_time: string; subject_id: string; meet_url?: string }[]
  >([
    { day_of_week: 1, start_time: '19:00', end_time: '20:00', subject_id: '', meet_url: '' },
  ]);

  // Step 4: Billing
  const [billingType, setBillingType] = useState<BillingType>('MONTHLY_FIXED');
  const [fixedAmount, setFixedAmount] = useState<number>(8500);
  const [perClassAmount, setPerClassAmount] = useState<number>(500);
  const [batchSize, setBatchSize] = useState<number>(8);
  const [billingDay, setBillingDay] = useState<number>(3);
  const [cycleStartDay, setCycleStartDay] = useState<number>(3);
  const [cycleEndDay, setCycleEndDay] = useState<number>(2);

  useEffect(() => {
    async function loadSubs() {
      try {
        const res = await fetch('/api/settings');
        const json = await res.json();
        if (json.success && json.data?.subjects) {
          setSubjects(json.data.subjects);
          if (json.data.subjects.length > 0) {
            setSelectedSubjectIds([json.data.subjects[0].id]);
            setSchedules([{ day_of_week: 1, start_time: '19:00', end_time: '20:00', subject_id: json.data.subjects[0].id, meet_url: '' }]);
          }
        }
      } catch (err) {
        console.error('Failed to load subjects:', err);
      }
    }
    loadSubs();
  }, []);

  const handleToggleSubject = (subId: string) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(subId) ? prev.filter((id) => id !== subId) : [...prev, subId]
    );
  };

  const handleCreateNewSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ADD_SUBJECT', name: newSubjectName.trim() }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setSubjects((prev) => [...prev, json.data]);
        setSelectedSubjectIds((prev) => [...prev, json.data.id]);
        setNewSubjectName('');
        toast.success('Subject Added', `Created ${json.data.name}`);
      }
    } catch (err: unknown) {
      toast.error('Add failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleAddScheduleSlot = () => {
    setSchedules((prev) => [
      ...prev,
      {
        day_of_week: 1,
        start_time: '19:00',
        end_time: '20:00',
        subject_id: selectedSubjectIds[0] || (subjects[0]?.id ?? ''),
        meet_url: meetUrl,
      },
    ]);
  };

  const handleRemoveScheduleSlot = (index: number) => {
    setSchedules((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateScheduleSlot = (index: number, key: string, val: string | number) => {
    setSchedules((prev) =>
      prev.map((s, idx) => (idx === index ? { ...s, [key]: val } : s))
    );
  };

  const handleFinalSubmit = async () => {
    if (!name.trim()) {
      toast.error('Name required', 'Please enter student full name');
      setStep(1);
      return;
    }

    if (selectedSubjectIds.length === 0) {
      toast.error('Subjects required', 'Please select at least one subject');
      setStep(2);
      return;
    }

    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          class_level: classLevel,
          parent_name: parentName,
          parent_phone: parentPhone,
          student_phone: studentPhone,
          email,
          notes,
          meet_url: meetUrl,
          subject_ids: selectedSubjectIds,
          schedules: schedules.filter((s) => s.subject_id),
          billing: {
            billing_type: billingType,
            fixed_amount: fixedAmount,
            per_class_amount: perClassAmount,
            batch_size: batchSize,
            billing_day: billingDay,
            billing_cycle_start_day: cycleStartDay,
            billing_cycle_end_day: cycleEndDay,
          },
        }),
      });

      const json = await res.json();
      if (!json.success || !json.data) {
        throw new Error(json.error || 'Failed to onboard student');
      }

      toast.success(
        'Student Onboarded Successfully!',
        `${json.data.name} is now registered with active schedules and billing rules.`
      );
      router.push(`/students/${json.data.id}`);
    } catch (err: unknown) {
      toast.error('Registration failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-indigo-600" />
            Add New Student Wizard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure student credentials, subjects, recurring schedules, and automated billing
          </p>
        </div>
      </div>

      {/* Progress Stepper Bar */}
      <div className="grid grid-cols-5 gap-2 bg-white p-3 rounded-xl border border-slate-200 text-center text-xs font-semibold">
        {[
          { num: 1, label: 'Basic Info' },
          { num: 2, label: 'Subjects' },
          { num: 3, label: 'Schedules' },
          { num: 4, label: 'Billing' },
          { num: 5, label: 'Review' },
        ].map((s) => (
          <button
            key={s.num}
            onClick={() => setStep(s.num)}
            className={`py-2 px-1 rounded-lg transition-all flex flex-col items-center gap-1 ${
              step === s.num
                ? 'bg-indigo-600 text-white shadow-xs font-bold'
                : step > s.num
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-400 hover:bg-slate-50'
            }`}
          >
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-white/20 border">
              {step > s.num ? '✓' : s.num}
            </span>
            <span className="text-[11px] truncate">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Wizard Form Card */}
      <Card>
        <CardContent className="p-6 sm:p-8">
          {/* STEP 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">Step 1: Student & Parent Profile</h3>
                <p className="text-xs text-slate-500">Enter personal details and contact points</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Student Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aditi Rao"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Class / Standard *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Class 8, Class 10, Class 12"
                    value={classLevel}
                    onChange={(e) => setClassLevel(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Parent / Guardian Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Raghavendra Rao"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Parent Contact Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98400 11223"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Student Phone / WhatsApp</label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98400 11224"
                    value={studentPhone}
                    onChange={(e) => setStudentPhone(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. student@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Default Google Meet Link</label>
                <input
                  type="url"
                  placeholder="https://meet.google.com/xyz-abcd-uvw"
                  value={meetUrl}
                  onChange={(e) => setMeetUrl(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Academic Notes / Goals</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Focus on foundation math, trigonometry, and weekly test revisions"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Subjects */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">Step 2: Assign Subjects</h3>
                <p className="text-xs text-slate-500">Select all subjects this student will take tuition for</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {subjects.map((sub) => {
                  const isSelected = selectedSubjectIds.includes(sub.id);
                  return (
                    <button
                      type="button"
                      key={sub.id}
                      onClick={() => handleToggleSubject(sub.id)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-950 ring-2 ring-indigo-500/20 shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">{sub.name}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                      </div>
                      {sub.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">{sub.description}</p>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Quick Add Custom Subject */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Add New Subject To Tutor System
                </h4>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Computer Science / Social Studies"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    className="flex-1 px-3.5 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                  <Button type="button" size="sm" onClick={handleCreateNewSubject}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Subject
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Recurring Schedules */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Step 3: Recurring Class Schedules</h3>
                  <p className="text-xs text-slate-500">Define weekly schedule days and time slots</p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={handleAddScheduleSlot}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Time Slot
                </Button>
              </div>

              <div className="space-y-3">
                {schedules.map((sch, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center gap-3"
                  >
                    {/* Day */}
                    <div className="w-full sm:w-36">
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Day of Week</label>
                      <select
                        value={sch.day_of_week}
                        onChange={(e) => handleUpdateScheduleSlot(idx, 'day_of_week', parseInt(e.target.value, 10))}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                      >
                        {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                          <option key={d} value={d}>
                            {getDayName(d)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Start Time */}
                    <div className="w-full sm:w-28">
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Start Time</label>
                      <input
                        type="time"
                        value={sch.start_time}
                        onChange={(e) => handleUpdateScheduleSlot(idx, 'start_time', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    {/* End Time */}
                    <div className="w-full sm:w-28">
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">End Time</label>
                      <input
                        type="time"
                        value={sch.end_time}
                        onChange={(e) => handleUpdateScheduleSlot(idx, 'end_time', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Subject */}
                    <div className="w-full sm:w-36">
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Subject</label>
                      <select
                        value={sch.subject_id}
                        onChange={(e) => handleUpdateScheduleSlot(idx, 'subject_id', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                      >
                        {subjects
                          .filter((sub) => selectedSubjectIds.includes(sub.id))
                          .map((sub) => (
                            <option key={sub.id} value={sub.id}>
                              {sub.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Delete Slot */}
                    {schedules.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveScheduleSlot(idx)}
                        className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg sm:mt-5 transition-colors self-end sm:self-auto"
                        title="Remove Slot"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: Billing Configuration */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">Step 4: Automated Billing Configuration</h3>
                <p className="text-xs text-slate-500">
                  Select the billing model for this student. The system will automatically calculate invoices and due dates.
                </p>
              </div>

              {/* Billing Model Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    type: 'CLASS_BATCH',
                    title: 'Class Batch Billing',
                    desc: 'e.g. Sreesha: 8 completed classes triggers fee',
                    badge: 'Progress Counter',
                  },
                  {
                    type: 'MONTHLY_FIXED',
                    title: 'Monthly Fixed Billing',
                    desc: 'e.g. Siva: ₹8,500 monthly fixed cycle (3rd to 2nd)',
                    badge: 'Fixed Cycle',
                  },
                  {
                    type: 'MONTHLY_PER_CLASS',
                    title: 'Monthly Per-Class Billing',
                    desc: 'e.g. Mrithika: classes attended × configurable fee',
                    badge: 'Dynamic Attendance',
                  },
                  {
                    type: 'PER_CLASS',
                    title: 'Direct Per-Class Billing',
                    desc: 'Instant fee calculated per individual session',
                    badge: 'Pay As You Go',
                  },
                ].map((item) => (
                  <button
                    type="button"
                    key={item.type}
                    onClick={() => setBillingType(item.type as BillingType)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      billingType === item.type
                        ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">{item.title}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                  </button>
                ))}
              </div>

              {/* Model specific configuration fields */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                {billingType === 'CLASS_BATCH' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Batch Size (Number of Classes) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={batchSize}
                        onChange={(e) => setBatchSize(parseInt(e.target.value, 10) || 8)}
                        className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                        required
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Invoice triggers once {batchSize} PRESENT classes are completed.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Batch Fee Amount (₹) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={fixedAmount}
                        onChange={(e) => setFixedAmount(parseFloat(e.target.value) || 0)}
                        className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                        required
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Total fee due when batch is complete (e.g. ₹6,750).
                      </p>
                    </div>
                  </div>
                )}

                {billingType === 'MONTHLY_FIXED' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Monthly Fixed Fee (₹) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={fixedAmount}
                        onChange={(e) => setFixedAmount(parseFloat(e.target.value) || 0)}
                        className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Billing Cycle (Start Day &rarr; End Day)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={cycleStartDay}
                          onChange={(e) => setCycleStartDay(parseInt(e.target.value, 10) || 1)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                          title="Cycle Start Day"
                        />
                        <span>to</span>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={cycleEndDay}
                          onChange={(e) => setCycleEndDay(parseInt(e.target.value, 10) || 28)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
                          title="Cycle End Day"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Due Date Day of Month *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={billingDay}
                        onChange={(e) => setBillingDay(parseInt(e.target.value, 10) || 3)}
                        className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                        required
                      />
                    </div>
                  </div>
                )}

                {billingType === 'MONTHLY_PER_CLASS' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Fee Per Completed Class (₹) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={perClassAmount}
                        onChange={(e) => setPerClassAmount(parseFloat(e.target.value) || 0)}
                        className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                        required
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Total fee = Completed PRESENT sessions × configured rate.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Due Date (Day of Month) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={billingDay}
                        onChange={(e) => setBillingDay(parseInt(e.target.value, 10) || 3)}
                        className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                        required
                      />
                    </div>
                  </div>
                )}

                {billingType === 'PER_CLASS' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Rate Per Class (₹) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={perClassAmount}
                      onChange={(e) => setPerClassAmount(parseFloat(e.target.value) || 0)}
                      className="w-full sm:w-1/2 px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                      required
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 5: Review & Confirm */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">Step 5: Review Registration</h3>
                <p className="text-xs text-slate-500">Confirm all details before activating the student</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Personal Card */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                  <h4 className="font-bold text-slate-900 text-sm">Personal Info</h4>
                  <p><span className="text-slate-500">Name:</span> <span className="font-semibold">{name || '—'}</span></p>
                  <p><span className="text-slate-500">Class:</span> <span className="font-semibold">{classLevel}</span></p>
                  <p><span className="text-slate-500">Parent:</span> <span className="font-semibold">{parentName || '—'} ({parentPhone || '—'})</span></p>
                  <p><span className="text-slate-500">Meet URL:</span> <span className="font-semibold text-emerald-700">{meetUrl}</span></p>
                </div>

                {/* Billing Summary Card */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                  <h4 className="font-bold text-slate-900 text-sm">Billing Model</h4>
                  <p><span className="text-slate-500">Type:</span> <span className="font-semibold">{billingType.replace(/_/g, ' ')}</span></p>
                  {billingType === 'CLASS_BATCH' && (
                    <p><span className="text-slate-500">Batch Rate:</span> <span className="font-semibold">{formatINR(fixedAmount)} every {batchSize} classes</span></p>
                  )}
                  {billingType === 'MONTHLY_FIXED' && (
                    <p><span className="text-slate-500">Monthly Rate:</span> <span className="font-semibold">{formatINR(fixedAmount)} (due on day {billingDay})</span></p>
                  )}
                  {billingType === 'MONTHLY_PER_CLASS' && (
                    <p><span className="text-slate-500">Rate:</span> <span className="font-semibold">{formatINR(perClassAmount)} / completed class</span></p>
                  )}
                </div>
              </div>

              {/* Schedules Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Configured Recurring Schedules ({schedules.length})
                </h4>
                <div className="bg-slate-50 rounded-xl border border-slate-200 divide-y divide-slate-200 text-xs">
                  {schedules.map((sch, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between">
                      <span className="font-semibold text-slate-800">{getDayName(sch.day_of_week)}</span>
                      <span className="text-slate-600 font-medium">
                        {formatTime12h(sch.start_time)} – {formatTime12h(sch.end_time)}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-semibold">
                        {subjects.find((s) => s.id === sch.subject_id)?.name || 'General'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>

        {/* Wizard Footer Navigation */}
        <CardFooter className="flex items-center justify-between p-4 px-6 bg-slate-50 border-t border-slate-200">
          {step > 1 ? (
            <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Previous Step
            </Button>
          ) : (
            <div />
          )}

          {step < 5 ? (
            <Button type="button" variant="primary" onClick={() => setStep((s) => s + 1)}>
              <span>Next Step</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          ) : (
            <Button type="button" variant="success" onClick={handleFinalSubmit}>
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Create & Activate Student
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
