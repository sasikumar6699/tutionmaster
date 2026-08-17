'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { StatusBadge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/Toast';
import { EnrichedStudent } from '../../../lib/types/database.types';
import {
  Users,
  Search,
  Plus,
  Video,
  ArrowUpRight,
  Layers,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { formatINR } from '../../../lib/utils/currency';
import { formatTime12h } from '../../../lib/utils/date';

export default function StudentsPage() {
  const toast = useToast();
  const [students, setStudents] = useState<EnrichedStudent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ACTIVE');

  const fetchStudents = async () => {
    try {
      const res = await fetch(`/api/students?status=${statusFilter}`);
      const json = await res.json();
      if (json.success && json.data) {
        setStudents(json.data);
      }
    } catch (err) {
      console.error('Failed to load students:', err);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [statusFilter]);

  const handleDeleteStudent = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to permanently delete ${name}? This will remove all linked schedules and invoices.`)) {
      try {
        const res = await fetch(`/api/students/${id}`, {
          method: 'DELETE',
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Failed to delete student');

        toast.success('Student Deleted', `${name} was deleted successfully.`);
        fetchStudents();
      } catch (err: unknown) {
        toast.error('Delete Failed', err instanceof Error ? err.message : 'Unknown error');
      }
    }
  };

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.class_level.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.subjects && s.subjects.some((sub) => sub.name.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-indigo-600" />
            Students Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage tuition students, batch progress, subjects, schedules, and custom billing rules
          </p>
        </div>

        <Link href="/students/new">
          <Button variant="primary" className="shadow-sm">
            <Plus className="w-4 h-4 mr-2" />
            Add New Student
          </Button>
        </Link>
      </div>

      {/* Controls Bar: Search & Status Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search student, class, or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold self-stretch sm:self-auto justify-center">
          {[
            { key: 'ACTIVE', label: 'Active Students' },
            { key: 'ARCHIVED', label: 'Archived' },
            { key: 'ALL', label: 'All' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key as 'ACTIVE' | 'ARCHIVED' | 'ALL')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                statusFilter === tab.key
                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Student Cards Grid */}
      {filteredStudents.length === 0 ? (
        <Card className="p-12 text-center bg-white border-dashed border-2 border-slate-200">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No students found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Your student workspace is clean. Click &quot;Add New Student&quot; to register your first student, set their weekly timetable, and configure their billing model.
          </p>
          <div className="mt-4">
            <Link href="/students/new">
              <Button variant="primary" size="sm">
                <Plus className="w-4 h-4 mr-1.5" />
                Add Your First Student
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredStudents.map((student) => {
            const billingType = student.billing?.billing_type || 'PER_CLASS';
            const bp = student.batch_progress;

            return (
              <Card
                key={student.id}
                className="hover:shadow-md transition-all duration-200 border-slate-200/90 flex flex-col justify-between overflow-hidden"
              >
                <div className="p-5 space-y-4">
                  {/* Top: Student Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-slate-900 tracking-tight hover:text-indigo-600 transition-colors">
                          <Link href={`/students/${student.id}`}>{student.name}</Link>
                        </h2>
                        <StatusBadge status={student.status} />
                      </div>
                      <p className="text-xs font-medium text-slate-500">{student.class_level}</p>
                    </div>

                    <Link href={`/students/${student.id}`}>
                      <Button variant="ghost" size="sm" className="p-1.5 h-auto text-slate-400 hover:text-indigo-600">
                        <ArrowUpRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>

                  {/* Subjects Chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {student.subjects && student.subjects.map((sub) => (
                      <span
                        key={sub.id}
                        className="px-2 py-0.5 text-[11px] font-semibold bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100"
                      >
                        {sub.name}
                      </span>
                    ))}
                  </div>

                  {/* Schedules Summary */}
                  <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-150 space-y-1.5">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Weekly Schedule ({student.schedules?.length || 0} slots)
                    </div>
                    {student.schedules && student.schedules.length === 0 ? (
                      <span className="text-xs text-slate-400 italic">No schedules set</span>
                    ) : (
                      <div className="space-y-1">
                        {student.schedules && student.schedules.slice(0, 2).map((sch) => (
                          <div key={sch.id} className="text-xs text-slate-700 flex items-center justify-between">
                            <span className="font-medium">
                              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][sch.day_of_week]}
                            </span>
                            <span className="text-slate-500 font-mono">
                              {formatTime12h(sch.start_time)} - {formatTime12h(sch.end_time)}
                            </span>
                          </div>
                        ))}
                        {student.schedules && student.schedules.length > 2 && (
                          <div className="text-[11px] text-indigo-600 font-semibold pt-0.5">
                            + {student.schedules.length - 2} more weekly slots
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Billing Details & Batch Tracker */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        Billing Model
                      </span>
                      <span className="font-semibold text-slate-900">
                        {billingType === 'CLASS_BATCH' && `Batch of ${student.billing?.batch_size || 8}`}
                        {billingType === 'MONTHLY_FIXED' && `Monthly (${formatINR(student.billing?.fixed_amount || 0)})`}
                        {billingType === 'MONTHLY_PER_CLASS' && `Monthly (${formatINR(student.billing?.per_class_amount || 0)}/class)`}
                        {billingType === 'PER_CLASS' && `Pay Per Class (${formatINR(student.billing?.per_class_amount || 0)})`}
                      </span>
                    </div>

                    {/* Batch Progress Bar */}
                    {billingType === 'CLASS_BATCH' && bp && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">Batch Progress</span>
                          <span className="font-bold text-indigo-700">
                            {bp.currentBatchCompleted} / {bp.targetBatchSize} Classes
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${
                              bp.isReadyForInvoice ? 'bg-amber-500' : 'bg-indigo-600'
                            }`}
                            style={{
                              width: `${Math.min(100, (bp.currentBatchCompleted / bp.targetBatchSize) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Active Outstanding Balance */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-slate-500">Outstanding Balance</span>
                      <span
                        className={`font-bold ${
                          student.active_balance > 0 ? 'text-amber-600' : 'text-emerald-600'
                        }`}
                      >
                        {student.active_balance > 0 ? formatINR(student.active_balance) : 'All Paid'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="bg-slate-50/90 px-5 py-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  {student.meet_url ? (
                    <a
                      href={student.meet_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900 transition-colors"
                    >
                      <Video className="w-4 h-4 text-indigo-600" />
                      Join Google Meet
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400">No Meet Link</span>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDeleteStudent(student.id, student.name)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title={`Delete ${student.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <Link href={`/students/${student.id}`}>
                      <Button variant="secondary" size="sm" className="text-xs font-semibold h-8">
                        View 360° Profile
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
