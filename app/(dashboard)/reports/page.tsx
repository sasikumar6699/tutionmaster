'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';
import { MonthlyReportSummary } from '../../../lib/types/database.types';
import Link from 'next/link';
import {
  BarChart3,
  Download,
  Calendar,
  FileSpreadsheet,
} from 'lucide-react';
import { formatINR } from '../../../lib/utils/currency';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export default function ReportsPage() {
  const toast = useToast();
  const [selectedMonth, setSelectedMonth] = useState<string>('2026-08');
  const [report, setReport] = useState<MonthlyReportSummary | null>(null);

  useEffect(() => {
    async function loadReport() {
      try {
        const res = await fetch(`/api/reports?month=${selectedMonth}`);
        const json = await res.json();
        if (json.success && json.data) {
          setReport(json.data);
        }
      } catch (err) {
        console.error('Failed to load report:', err);
      }
    }
    loadReport();
  }, [selectedMonth]);

  if (!report) return null;

  // Revenue chart data
  const revenueChartData = [
    {
      name: report.month_label,
      Expected: report.expected_fees,
      Received: report.received_fees,
      Pending: report.pending_fees,
    },
  ];

  // Attendance breakdown data
  const attendanceChartData = [
    { name: 'Completed (Present)', value: report.completed_classes, color: '#10b981' },
    { name: 'Absent', value: report.absent_classes, color: '#f43f5e' },
    { name: 'Rescheduled', value: report.rescheduled_classes, color: '#0ea5e9' },
    { name: 'Cancelled', value: report.cancelled_classes, color: '#94a3b8' },
  ].filter((d) => d.value > 0);

  // --- CSV Exporters ---
  const downloadCSV = (filename: string, csvContent: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Export Successful', `Downloaded ${filename}`);
  };

  const exportMonthlyReportCSV = () => {
    let csv = `TutorPulse Monthly Summary Report - ${report.month_label}\n\n`;
    csv += `Total Students,${report.total_students}\n`;
    csv += `Total Classes,${report.total_classes}\n`;
    csv += `Completed Classes,${report.completed_classes}\n`;
    csv += `Absent Classes,${report.absent_classes}\n`;
    csv += `Attendance Rate,${report.attendance_rate}%\n`;
    csv += `Total Teaching Hours,${report.total_teaching_hours}\n`;
    csv += `Expected Fees,INR ${report.expected_fees}\n`;
    csv += `Received Fees,INR ${report.received_fees}\n`;
    csv += `Pending Fees,INR ${report.pending_fees}\n\n`;

    csv += `Student-Wise Breakdown\n`;
    csv += `Student Name,Class,Subjects,Classes Held,Attended,Absent,Teaching Hours,Billing Model,Amount Due,Amount Paid,Balance\n`;

    report.student_breakdown.forEach((st) => {
      csv += `"${st.student_name}","${st.class_level}","${st.subjects.join('; ')}",${st.classes_held},${st.attended},${st.absent},"${st.teaching_hours}","${st.billing_type}",${st.amount_due},${st.amount_paid},${st.balance}\n`;
    });

    downloadCSV(`Monthly_Report_${report.month}.csv`, csv);
  };

  const exportAttendanceCSV = async () => {
    try {
      const res = await fetch(`/api/classes`);
      const json = await res.json();
      const sessions = json.success ? json.data : [];
      let csv = `Class Session Attendance Ledger\n`;
      csv += `Date,Student Name,Class,Subject,Scheduled Time,Actual Duration (Mins),Status,Meet URL,Topic,Homework\n`;

      sessions.forEach((s: any) => {
        csv += `"${s.class_date}","${s.student_name}","${s.student_class}","${s.subject_name}","${s.scheduled_start} - ${s.scheduled_end}",${s.actual_duration_minutes || ''},"${s.status}","${s.meet_url || ''}","${s.notes_record?.topic || ''}","${s.notes_record?.homework || ''}"\n`;
      });

      downloadCSV(`Attendance_Ledger_${report?.month || 'latest'}.csv`, csv);
    } catch {
      toast.error('Export Failed', 'Could not export attendance data');
    }
  };

  const exportPaymentsCSV = async () => {
    try {
      const res = await fetch('/api/fees');
      const json = await res.json();
      const payments = json.success ? json.data?.payments || [] : [];
      let csv = `Tuition Payments Ledger\n`;
      csv += `Payment ID,Student ID,Date,Amount (INR),Payment Method,Notes\n`;

      payments.forEach((p: any) => {
        csv += `"${p.id}","${p.student_id}","${p.payment_date}",${p.amount},"${p.payment_method}","${p.notes || ''}"\n`;
      });

      downloadCSV(`Payments_Ledger_${report?.month || 'latest'}.csv`, csv);
    } catch {
      toast.error('Export Failed', 'Could not export payments data');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            Monthly Tuition Analytics & Reporting
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Performance analytics, attendance distributions, revenue charts, and verified CSV exports
          </p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 bg-slate-50 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="2026-08">August 2026</option>
            <option value="2026-07">July 2026</option>
            <option value="2026-06">June 2026</option>
          </select>
        </div>
      </div>

      {/* Export Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-indigo-50/70 p-4 rounded-xl border border-indigo-100">
        <div className="flex items-center gap-2 text-xs text-indigo-950 font-semibold">
          <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
          <span>Export Data Reports for Accounting & Record-keeping</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportMonthlyReportCSV} className="text-xs bg-white">
            <Download className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
            Export Monthly Summary CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportAttendanceCSV} className="text-xs bg-white">
            <Download className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
            Export Attendance CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportPaymentsCSV} className="text-xs bg-white">
            <Download className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
            Export Payments CSV
          </Button>
        </div>
      </div>

      {/* Metric Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card className="p-3 text-center">
          <span className="text-[11px] text-slate-500 font-medium">Students</span>
          <p className="text-xl font-bold text-slate-900 mt-0.5">{report.total_students}</p>
        </Card>
        <Card className="p-3 text-center">
          <span className="text-[11px] text-slate-500 font-medium">Classes Held</span>
          <p className="text-xl font-bold text-slate-900 mt-0.5">{report.total_classes}</p>
        </Card>
        <Card className="p-3 text-center">
          <span className="text-[11px] text-slate-500 font-medium">Completed</span>
          <p className="text-xl font-bold text-emerald-600 mt-0.5">{report.completed_classes}</p>
        </Card>
        <Card className="p-3 text-center">
          <span className="text-[11px] text-slate-500 font-medium">Attendance %</span>
          <p className="text-xl font-bold text-sky-600 mt-0.5">{report.attendance_rate}%</p>
        </Card>
        <Card className="p-3 text-center">
          <span className="text-[11px] text-slate-500 font-medium">Teaching Time</span>
          <p className="text-xl font-bold text-indigo-600 mt-0.5">{report.total_teaching_hours}</p>
        </Card>
        <Card className="p-3 text-center">
          <span className="text-[11px] text-slate-500 font-medium">Expected</span>
          <p className="text-xl font-bold text-slate-900 mt-0.5">{formatINR(report.expected_fees)}</p>
        </Card>
        <Card className="p-3 text-center">
          <span className="text-[11px] text-slate-500 font-medium">Received</span>
          <p className="text-xl font-bold text-emerald-600 mt-0.5">{formatINR(report.received_fees)}</p>
        </Card>
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Breakdown Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center justify-between">
              <span>Tuition Fee Collections Breakdown</span>
              <span className="text-xs font-normal text-slate-500">{report.month_label}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(val) => `₹${val}`} />
                <Tooltip formatter={(value: unknown) => formatINR(Number(value))} />
                <Legend />
                <Bar dataKey="Expected" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Received" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Attendance Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center justify-between">
              <span>Session Attendance Distribution</span>
              <span className="text-xs font-normal text-slate-500">Total: {report.total_classes}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72 flex items-center justify-center">
            {attendanceChartData.length === 0 ? (
              <p className="text-xs text-slate-400">No session data for this month</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={attendanceChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {attendanceChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Student-wise Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold">Student-Wise Performance Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-4 pl-6">Student</th>
                  <th className="p-4">Subjects</th>
                  <th className="p-4 text-center">Classes</th>
                  <th className="p-4 text-center">Attended</th>
                  <th className="p-4 text-center">Absent</th>
                  <th className="p-4">Teaching Time</th>
                  <th className="p-4">Billing Model</th>
                  <th className="p-4">Expected</th>
                  <th className="p-4">Paid</th>
                  <th className="p-4 pr-6">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.student_breakdown.map((st) => (
                  <tr key={st.student_id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-4 pl-6 font-bold text-slate-900">
                      <Link href={`/students/${st.student_id}`} className="hover:text-indigo-600">
                        {st.student_name}
                      </Link>
                      <span className="text-[10px] text-slate-400 font-normal block">{st.class_level}</span>
                    </td>
                    <td className="p-4 text-slate-700">
                      {st.subjects.join(', ') || 'General'}
                    </td>
                    <td className="p-4 text-center font-semibold text-slate-800">{st.classes_held}</td>
                    <td className="p-4 text-center font-bold text-emerald-600">{st.attended}</td>
                    <td className="p-4 text-center font-bold text-rose-600">{st.absent}</td>
                    <td className="p-4 text-slate-700 font-medium">{st.teaching_hours}</td>
                    <td className="p-4 font-medium text-slate-600">{st.billing_type.replace(/_/g, ' ')}</td>
                    <td className="p-4 font-bold text-slate-900">{formatINR(st.amount_due)}</td>
                    <td className="p-4 font-semibold text-emerald-600">{formatINR(st.amount_paid)}</td>
                    <td className="p-4 pr-6 font-bold text-amber-600">
                      {st.balance > 0 ? formatINR(st.balance) : '₹0'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
