'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { StatusBadge } from '../../../../components/ui/Badge';
import { Modal } from '../../../../components/ui/Modal';
import { useToast } from '../../../../components/ui/Toast';
import {
  EnrichedStudent,
  EnrichedClassSession,
  EnrichedBillingRecord,
  Payment,
  PaymentMethod,
  BillingType,
} from '../../../../lib/types/database.types';
import {
  Users,
  CreditCard,
  Video,
  Phone,
  Mail,
  Archive,
  Plus,
  ArrowLeft,
  Layers,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { formatINR } from '../../../../lib/utils/currency';
import { formatDate, formatTime12h, getDayName } from '../../../../lib/utils/date';

type StudentTab =
  | 'overview'
  | 'classes'
  | 'attendance'
  | 'topics'
  | 'billing'
  | 'payments'
  | 'schedules'
  | 'settings';

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();

  const studentId = params.id as string;
  const [student, setStudent] = useState<EnrichedStudent | null>(null);
  const [activeTab, setActiveTab] = useState<StudentTab>('overview');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [classes, setClasses] = useState<EnrichedClassSession[]>([]);
  const [invoices, setInvoices] = useState<EnrichedBillingRecord[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  // Payment Modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');

  // Settings Edit State
  const [editName, setEditName] = useState('');
  const [editClass, setEditClass] = useState('');
  const [editParentName, setEditParentName] = useState('');
  const [editParentPhone, setEditParentPhone] = useState('');
  const [editMeetUrl, setEditMeetUrl] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Billing Setting Edit
  const [editBillingType, setEditBillingType] = useState<BillingType>('MONTHLY_FIXED');
  const [editFixedAmount, setEditFixedAmount] = useState<number>(0);
  const [editPerClassAmount, setEditPerClassAmount] = useState<number>(0);
  const [editBatchSize, setEditBatchSize] = useState<number>(8);

  const refreshData = async () => {
    try {
      const res = await fetch(`/api/students/${studentId}`);
      const json = await res.json();
      if (!json.success || !json.data) return;

      const st = json.data;
      setStudent(st);
      setClasses(st.class_sessions || []);
      setInvoices(st.billing_records || []);
      setPayments(st.payments || []);

      // Fill settings inputs
      setEditName(st.name);
      setEditClass(st.class_level);
      setEditParentName(st.parent_name || '');
      setEditParentPhone(st.parent_phone || '');
      setEditMeetUrl(st.meet_url || '');
      setEditNotes(st.notes || '');

      if (st.billing) {
        setEditBillingType(st.billing.billing_type);
        setEditFixedAmount(st.billing.fixed_amount || 0);
        setEditPerClassAmount(st.billing.per_class_amount || 0);
        setEditBatchSize(st.billing.batch_size || 8);
      }
    } catch (err) {
      console.error('Failed to load student:', err);
    }
  };

  useEffect(() => {
    refreshData();
  }, [studentId]);

  if (!student) {
    return (
      <div className="p-12 text-center">
        <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h2 className="text-base font-semibold text-slate-700">Student Not Found</h2>
        <Link href="/students" className="text-xs text-indigo-600 font-medium hover:underline mt-2 inline-block">
          &larr; Back to Students Directory
        </Link>
      </div>
    );
  }

  const handleOpenPaymentModal = (invoiceId?: string, defaultAmt?: number) => {
    setSelectedInvoiceId(invoiceId || '');
    setPaymentAmount(defaultAmt !== undefined ? defaultAmt : student.active_balance || 0);
    setPaymentModalOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentAmount <= 0) {
      toast.error('Invalid Amount', 'Payment amount must be greater than zero');
      return;
    }

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: student.id,
          billing_record_id: selectedInvoiceId || undefined,
          amount: paymentAmount,
          payment_date: paymentDate,
          payment_method: paymentMethod,
          notes: paymentNotes,
        }),
      });

      const json = await res.json();
      if (!json.success || !json.data) {
        throw new Error(json.error || 'Payment failed');
      }

      toast.success(
        'Payment Recorded Successfully!',
        `Recorded ${formatINR(json.data.amount)} via ${json.data.payment_method}. Balance updated.`
      );
      setPaymentModalOpen(false);
      refreshData();
    } catch (err: unknown) {
      toast.error('Payment Error', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleToggleArchive = async () => {
    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toggleArchive: true }),
      });
      const json = await res.json();
      if (json.success) {
        toast.info(
          student.status === 'ARCHIVED' ? 'Student Reactivated' : 'Student Archived',
          `${student.name} status updated.`
        );
        refreshData();
      }
    } catch (err: unknown) {
      toast.error('Archive failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleSaveStudentSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentUpdates: {
            name: editName,
            class_level: editClass,
            parent_name: editParentName,
            parent_phone: editParentPhone,
            meet_url: editMeetUrl,
            notes: editNotes,
          },
          billingUpdates: {
            billing_type: editBillingType,
            fixed_amount: editFixedAmount,
            per_class_amount: editPerClassAmount,
            batch_size: editBatchSize,
          },
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Update failed');
      }

      toast.success('Profile & Billing Updated', 'Changes saved successfully.');
      refreshData();
    } catch (err: unknown) {
      toast.error('Save failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleDeleteStudent = async () => {
    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to delete student');

      toast.success('Student Deleted', `${student.name} was deleted successfully.`);
      router.push('/students');
    } catch (err: unknown) {
      toast.error('Delete failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (confirm('Are you sure you want to delete this recurring schedule slot?')) {
      try {
        const res = await fetch(`/api/schedules/${scheduleId}`, {
          method: 'DELETE',
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Failed to delete schedule');

        toast.success('Schedule Deleted', 'Recurring schedule slot removed.');
        refreshData();
      } catch (err: unknown) {
        toast.error('Delete Failed', err instanceof Error ? err.message : 'Unknown error');
      }
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (confirm('Are you sure you want to delete this class session?')) {
      try {
        const res = await fetch(`/api/classes?id=${sessionId}`, {
          method: 'DELETE',
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Failed to delete session');

        toast.success('Session Deleted', 'Class session removed.');
        refreshData();
      } catch (err: unknown) {
        toast.error('Delete Failed', err instanceof Error ? err.message : 'Unknown error');
      }
    }
  };

  const completedClasses = classes.filter((c) => c.status === 'PRESENT');
  const topicsList = classes.filter((c) => c.notes_record?.topic);

  return (
    <div className="space-y-6">
      {/* Back Link & Header */}
      <div className="flex items-center gap-2">
        <Link
          href="/students"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Students</span>
        </Link>
      </div>

      {/* Hero Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white font-bold flex items-center justify-center text-xl shadow-sm">
            {student.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{student.name}</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100">
                {student.class_level}
              </span>
              <StatusBadge status={student.status} />
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap pt-0.5">
              {student.parent_phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {student.parent_phone}
                </span>
              )}
              {student.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {student.email}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {student.subjects.map((s) => (
                <span
                  key={s.id}
                  className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700"
                >
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center">
          {student.meet_url && (
            <a
              href={student.meet_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
            >
              <Video className="w-4 h-4" />
              <span>Launch Google Meet</span>
            </a>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={() => handleOpenPaymentModal(undefined, student.active_balance)}
            className="text-xs"
          >
            <CreditCard className="w-4 h-4 mr-1.5" />
            Record Payment
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleArchive}
            className="text-xs text-slate-600"
          >
            <Archive className="w-4 h-4 mr-1.5" />
            {student.status === 'ARCHIVED' ? 'Reactivate' : 'Archive'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteConfirmOpen(true)}
            className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-px text-xs font-semibold">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'classes', label: `Classes (${classes.length})` },
          { key: 'attendance', label: 'Attendance' },
          { key: 'topics', label: `Topics Covered (${topicsList.length})` },
          { key: 'billing', label: 'Billing & Invoices' },
          { key: 'payments', label: `Payments (${payments.length})` },
          { key: 'schedules', label: `Schedules (${student.schedules.length})` },
          { key: 'settings', label: 'Edit Settings' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as StudentTab)}
            className={`py-3 px-4 rounded-t-lg transition-all border-b-2 whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-indigo-600 text-indigo-700 bg-white font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT: 1. OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-slate-500 font-medium">Attendance Rate</span>
                <p className="text-2xl font-bold text-slate-900">{student.attendance_percentage}%</p>
                <p className="text-[11px] text-slate-400">
                  {completedClasses.length} of {classes.length} completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-slate-500 font-medium">Teaching Hours</span>
                <p className="text-2xl font-bold text-slate-900">
                  {Math.round(completedClasses.reduce((sum, c) => sum + (c.actual_duration_minutes || 60), 0) / 60)}h
                </p>
                <p className="text-[11px] text-slate-400">Total verified sessions</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-slate-500 font-medium">Pending Balance</span>
                <p
                  className={`text-2xl font-bold ${
                    student.active_balance > 0 ? 'text-amber-600' : 'text-emerald-600'
                  }`}
                >
                  {formatINR(student.active_balance)}
                </p>
                <p className="text-[11px] text-slate-400">Active invoices balance</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-1">
                <span className="text-xs text-slate-500 font-medium">Billing Model</span>
                <p className="text-sm font-bold text-slate-800 truncate mt-1">
                  {student.billing_profile?.billing_type.replace(/_/g, ' ') || 'Fixed'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {student.billing_profile?.fixed_amount
                    ? `${formatINR(student.billing_profile.fixed_amount)}`
                    : `${formatINR(student.billing_profile?.per_class_amount)} / class`}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Batch Progress Bar if CLASS_BATCH */}
          {student.batch_progress && (
            <Card className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white border-0 shadow-md">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-indigo-400" />
                    <h3 className="font-bold text-base">Class Batch Billing Tracker</h3>
                  </div>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/10 text-indigo-200 border border-white/10">
                    {student.batch_progress.completed} / {student.batch_progress.target} Classes Completed
                  </span>
                </div>

                <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all duration-300"
                    style={{ width: `${student.batch_progress.percentage}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-indigo-200">
                  <span>Batch Fee: {formatINR(student.batch_progress.amount)}</span>
                  <span>
                    {student.batch_progress.completed >= student.batch_progress.target
                      ? '✓ Batch Completed — Invoice Generated'
                      : `${student.batch_progress.target - student.batch_progress.completed} classes remaining to complete batch`}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Contact and Next Class Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold">Parent & Student Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Parent Name:</span>
                  <span className="font-semibold text-slate-800">{student.parent_name || '—'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Parent Phone:</span>
                  <span className="font-semibold text-slate-800">{student.parent_phone || '—'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Student Phone:</span>
                  <span className="font-semibold text-slate-800">{student.student_phone || '—'}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-semibold text-slate-800">{student.email || '—'}</span>
                </div>
                {student.notes && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-slate-500 block mb-1">Academic Notes:</span>
                    <p className="p-2.5 rounded-lg bg-slate-50 text-slate-700 italic">{student.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold">Upcoming & Recurring Schedules</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {student.schedules.map((sch) => (
                  <div
                    key={sch.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-800">{getDayName(sch.day_of_week)}</span>
                      <p className="text-slate-500 text-[11px]">
                        {formatTime12h(sch.start_time)} – {formatTime12h(sch.end_time)}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold">
                      {student.subjects.find((s) => s.id === sch.subject_id)?.name || 'General'}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 2. CLASSES HISTORY */}
      {activeTab === 'classes' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold">Class Sessions Ledger ({classes.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 text-xs">
              {classes.map((cls) => (
                <div key={cls.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50">
                  <div className="flex items-center gap-3.5">
                    <div className="p-2.5 rounded-xl bg-slate-50 text-slate-700 font-semibold min-w-[70px] text-center border border-slate-100">
                      {formatDate(cls.class_date, 'dd MMM')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{cls.subject_name}</span>
                        <StatusBadge status={cls.status} />
                      </div>
                      <p className="text-slate-500 text-[11px]">
                        {formatTime12h(cls.scheduled_start)} – {formatTime12h(cls.scheduled_end)}
                        {cls.actual_duration_minutes && ` (${cls.actual_duration_minutes} mins actual)`}
                      </p>
                      {cls.notes_record?.topic && (
                        <p className="text-slate-600 font-medium mt-0.5">
                          Topic: {cls.notes_record.topic}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {cls.meet_url && (
                      <a
                        href={cls.meet_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-700 hover:underline font-semibold"
                      >
                        <Video className="w-3.5 h-3.5" />
                        Meet
                      </a>
                    )}
                    <button
                      onClick={() => handleDeleteSession(cls.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Delete Class Session"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB CONTENT: 3. ATTENDANCE */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-4 text-center">
              <span className="text-xs text-slate-500">Present</span>
              <p className="text-2xl font-bold text-emerald-600">{classes.filter((c) => c.status === 'PRESENT').length}</p>
            </Card>
            <Card className="p-4 text-center">
              <span className="text-xs text-slate-500">Absent</span>
              <p className="text-2xl font-bold text-rose-600">{classes.filter((c) => c.status === 'ABSENT').length}</p>
            </Card>
            <Card className="p-4 text-center">
              <span className="text-xs text-slate-500">Rescheduled</span>
              <p className="text-2xl font-bold text-sky-600">{classes.filter((c) => c.status === 'RESCHEDULED').length}</p>
            </Card>
            <Card className="p-4 text-center">
              <span className="text-xs text-slate-500">Cancelled</span>
              <p className="text-2xl font-bold text-slate-600">{classes.filter((c) => c.status === 'CANCELLED').length}</p>
            </Card>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 4. TOPICS COVERED */}
      {activeTab === 'topics' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Chronological Curriculum & Homework Timeline</h3>
          {topicsList.length === 0 ? (
            <Card className="p-8 text-center text-xs text-slate-400">No topics recorded yet.</Card>
          ) : (
            <div className="relative border-l-2 border-indigo-200 ml-4 space-y-6 pl-6 py-2">
              {topicsList.map((item) => (
                <div key={item.id} className="relative space-y-1.5">
                  <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-indigo-600 ring-4 ring-white" />
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-700">{formatDate(item.class_date, 'dd MMMM yyyy')}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">{item.subject_name}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{item.notes_record?.topic}</h4>
                  {item.notes_record?.subtopic && (
                    <p className="text-xs text-slate-600 font-medium">Concepts: {item.notes_record.subtopic}</p>
                  )}
                  {item.notes_record?.homework && (
                    <p className="text-xs text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-100">
                      <span className="font-semibold">Homework:</span> {item.notes_record.homework}
                    </p>
                  )}
                  {item.notes_record?.notes && (
                    <p className="text-xs text-slate-500 italic">&quot;{item.notes_record.notes}&quot;</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: 5. BILLING & INVOICES */}
      {activeTab === 'billing' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Billing History & Invoices</h3>
            <Button size="sm" onClick={() => handleOpenPaymentModal()} className="text-xs">
              <Plus className="w-4 h-4 mr-1" />
              Record Payment
            </Button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="divide-y divide-slate-100 text-xs">
              {invoices.map((inv) => (
                <div key={inv.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">
                        Period: {formatDate(inv.period_start, 'dd MMM')} – {formatDate(inv.period_end, 'dd MMM yyyy')}
                      </span>
                      <StatusBadge status={inv.status} />
                    </div>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Due: {formatDate(inv.due_date, 'dd MMM yyyy')} • {inv.billing_type.replace(/_/g, ' ')} ({inv.classes_count} classes)
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-slate-900">{formatINR(inv.amount_due)}</p>
                      <p className="text-[11px] text-slate-500">
                        Paid: {formatINR(inv.amount_received)} | Bal: {formatINR(inv.balance)}
                      </p>
                    </div>

                    {inv.balance > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenPaymentModal(inv.id, inv.balance)}
                        className="text-xs"
                      >
                        Pay Invoice
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 6. PAYMENTS */}
      {activeTab === 'payments' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold">Payments Ledger</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 text-xs">
              {payments.map((p) => (
                <div key={p.id} className="p-4 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-emerald-700 text-sm">{formatINR(p.amount)}</span>
                    <span className="ml-2 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">{p.payment_method}</span>
                    <p className="text-slate-400 text-[11px]">{formatDate(p.payment_date, 'dd MMMM yyyy')}</p>
                    {p.notes && <p className="text-slate-600 italic mt-0.5">&quot;{p.notes}&quot;</p>}
                  </div>
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                    Received
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB CONTENT: 7. SCHEDULES */}
      {activeTab === 'schedules' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Active Recurring Timetable</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {student.schedules.map((sch) => (
              <Card key={sch.id} className="p-4 space-y-2 relative">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-base text-slate-900">{getDayName(sch.day_of_week)}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700">
                      {student.subjects.find((s) => s.id === sch.subject_id)?.name}
                    </span>
                    <button
                      onClick={() => handleDeleteSchedule(sch.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete Recurring Schedule Slot"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-600 font-medium">
                  {formatTime12h(sch.start_time)} – {formatTime12h(sch.end_time)}
                </p>
                {sch.meet_url && (
                  <p className="text-[11px] text-emerald-700 truncate">
                    Meet: {sch.meet_url}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: 8. SETTINGS & EDIT */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold">Edit Student & Billing Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveStudentSettings} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Student Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Class Level</label>
                  <input
                    type="text"
                    value={editClass}
                    onChange={(e) => setEditClass(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Parent Name</label>
                  <input
                    type="text"
                    value={editParentName}
                    onChange={(e) => setEditParentName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Parent Phone</label>
                  <input
                    type="text"
                    value={editParentPhone}
                    onChange={(e) => setEditParentPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Google Meet URL</label>
                <input
                  type="url"
                  value={editMeetUrl}
                  onChange={(e) => setEditMeetUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Billing Rate Updates */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-900">Billing Rule Adjustment</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1">Billing Type</label>
                    <select
                      value={editBillingType}
                      onChange={(e) => setEditBillingType(e.target.value as BillingType)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                    >
                      <option value="MONTHLY_FIXED">MONTHLY FIXED</option>
                      <option value="MONTHLY_PER_CLASS">MONTHLY PER CLASS</option>
                      <option value="CLASS_BATCH">CLASS BATCH</option>
                      <option value="PER_CLASS">PER CLASS</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Fixed / Batch Amount (₹)</label>
                    <input
                      type="number"
                      value={editFixedAmount}
                      onChange={(e) => setEditFixedAmount(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Per-Class Rate (₹)</label>
                    <input
                      type="number"
                      value={editPerClassAmount}
                      onChange={(e) => setEditPerClassAmount(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="submit" variant="primary">
                  Save Changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-rose-200 bg-rose-50/30">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-rose-900 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-600" />
              Delete Student Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <p className="text-rose-700">
              Permanently delete <strong>{student.name}</strong>, along with all scheduled classes, attendance records, and billing data.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmOpen(true)}
              className="text-rose-600 border-rose-300 hover:bg-rose-100 whitespace-nowrap font-semibold"
            >
              Delete {student.name}
            </Button>
          </CardContent>
        </Card>
      </div>
      )}

      {/* RECORD PAYMENT MODAL */}
      {paymentModalOpen && (
        <Modal
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          title="Record Received Payment"
          description={`Record tuition fee payment for ${student.name}`}
        >
          <form onSubmit={handleRecordPayment} className="space-y-4 py-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Amount (₹) *
              </label>
              <input
                type="number"
                min="1"
                step="any"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-base font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Date *
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Method *
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="CASH">CASH</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">BANK TRANSFER</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Receipt Note / Reference
              </label>
              <input
                type="text"
                placeholder="e.g. Received in cash after Class 8 session"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setPaymentModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="success">
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Save Payment & Update Balance
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmOpen && (
        <Modal
          isOpen={deleteConfirmOpen}
          onClose={() => setDeleteConfirmOpen(false)}
          title={`Delete Student: ${student.name}`}
          description="Are you sure you want to permanently delete this student?"
        >
          <div className="space-y-4 py-2 text-xs sm:text-sm text-slate-600">
            <p>
              This action will permanently delete <strong>{student.name}</strong> along with all associated schedules, class sessions, attendance logs, invoices, and payments.
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDeleteStudent}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                Yes, Permanently Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
