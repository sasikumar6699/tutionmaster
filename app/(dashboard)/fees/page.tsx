'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { StatusBadge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../components/ui/Toast';
import {
  EnrichedBillingRecord,
  EnrichedStudent,
  PaymentMethod,
} from '../../../lib/types/database.types';
import {
  CreditCard,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  Receipt,
} from 'lucide-react';
import Link from 'next/link';
import { formatINR } from '../../../lib/utils/currency';
import { formatDate } from '../../../lib/utils/date';

export default function FeesPage() {
  const toast = useToast();

  const [invoices, setInvoices] = useState<EnrichedBillingRecord[]>([]);
  const [students, setStudents] = useState<EnrichedStudent[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Payment Modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<EnrichedBillingRecord | null>(null);
  const [targetStudentId, setTargetStudentId] = useState<string>('');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  // Invoice Print Preview Modal
  const [invoicePreview, setInvoicePreview] = useState<EnrichedBillingRecord | null>(null);

  const refreshData = async () => {
    try {
      const [invRes, studRes] = await Promise.all([
        fetch('/api/payments'),
        fetch('/api/students?status=ALL'),
      ]);

      const [invJson, studJson] = await Promise.all([
        invRes.json(),
        studRes.json(),
      ]);

      let records: EnrichedBillingRecord[] = invJson.success ? invJson.data : [];
      if (selectedStudentId !== 'ALL') {
        records = records.filter((r) => r.student_id === selectedStudentId);
      }
      if (selectedStatus !== 'ALL') {
        records = records.filter((r) => r.status === selectedStatus);
      }

      setInvoices(records);
      if (studJson.success) setStudents(studJson.data);
    } catch (err) {
      console.error('Failed to load fees data:', err);
    }
  };

  useEffect(() => {
    refreshData();
  }, [selectedStudentId, selectedStatus]);

  // Aggregate Metrics
  const totalExpected = invoices.reduce((sum, inv) => sum + inv.amount_due, 0);
  const totalReceived = invoices.reduce((sum, inv) => sum + (inv.amount_received || 0), 0);
  const totalPending = invoices.reduce((sum, inv) => sum + Math.max(0, inv.amount_due - (inv.amount_received || 0)), 0);
  const overdueBalance = invoices
    .filter((inv) => (inv.amount_due - (inv.amount_received || 0)) > 0 && inv.due_date < '2026-08-14')
    .reduce((sum, inv) => sum + (inv.amount_due - (inv.amount_received || 0)), 0);

  const filteredInvoices = invoices.filter((inv) => {
    const query = searchQuery.toLowerCase();
    const stName = inv.student?.name || '';
    const stClass = inv.student?.class_level || '';
    return (
      stName.toLowerCase().includes(query) ||
      stClass.toLowerCase().includes(query) ||
      inv.billing_type.toLowerCase().includes(query)
    );
  });

  const handleOpenPayment = (inv?: EnrichedBillingRecord) => {
    if (inv) {
      setSelectedInvoice(inv);
      setTargetStudentId(inv.student_id);
      setPaymentAmount(Math.max(0, inv.amount_due - (inv.amount_received || 0)));
    } else {
      setSelectedInvoice(null);
      setTargetStudentId(students[0]?.id || '');
      setPaymentAmount(1000);
    }
    setPaymentNotes('');
    setPaymentModalOpen(true);
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStudentId || paymentAmount <= 0) {
      toast.error('Invalid Payment', 'Please enter a valid student and positive amount');
      return;
    }

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: targetStudentId,
          billing_record_id: selectedInvoice ? selectedInvoice.id : undefined,
          amount: paymentAmount,
          payment_date: paymentDate,
          payment_method: paymentMethod,
          notes: paymentNotes,
        }),
      });

      const json = await res.json();
      if (!json.success || !json.data) {
        throw new Error(json.error || 'Payment recording failed');
      }

      toast.success(
        'Payment Recorded Successfully!',
        `Logged ${formatINR(json.data.amount)} via ${json.data.payment_method}. Invoices updated.`
      );
      setPaymentModalOpen(false);
      refreshData();
    } catch (err: unknown) {
      toast.error('Payment Failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-indigo-600" />
            Fees & Invoicing Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Automated billing cycles, payment records, outstanding ledger, and receipt generation
          </p>
        </div>

        <Button variant="primary" onClick={() => handleOpenPayment()} className="shadow-sm">
          <Plus className="w-4 h-4 mr-2" />
          Record Payment Received
        </Button>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-indigo-100">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Total Expected</span>
              <CreditCard className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatINR(totalExpected)}</p>
            <p className="text-[11px] text-slate-400">Total generated tuition fees</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-100">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Total Received</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-600">{formatINR(totalReceived)}</p>
            <p className="text-[11px] text-slate-400">Settled and verified payments</p>
          </CardContent>
        </Card>

        <Card className="border-amber-100">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Total Pending</span>
              <AlertCircle className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-amber-600">{formatINR(totalPending)}</p>
            <p className="text-[11px] text-slate-400">Awaiting parent collection</p>
          </CardContent>
        </Card>

        <Card className="border-rose-100">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Overdue Balance</span>
              <Clock className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-2xl font-bold text-rose-600">{formatINR(overdueBalance)}</p>
            <p className="text-[11px] text-slate-400">Past due date</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200/80">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by student name or model..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm bg-slate-50 focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto text-xs">
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Students</option>
            {students.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
          </select>
        </div>
      </div>

      {/* Invoices Ledger Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold flex items-center justify-between">
            <span>Tuition Invoices Ledger</span>
            <span className="text-xs font-normal text-slate-500">
              Showing {filteredInvoices.length} invoices
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-4 pl-6">Student</th>
                  <th className="p-4">Billing Cycle / Period</th>
                  <th className="p-4">Model & Classes</th>
                  <th className="p-4">Amount Due</th>
                  <th className="p-4">Received</th>
                  <th className="p-4">Balance</th>
                  <th className="p-4">Due Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      No invoices found for the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-4 pl-6 font-bold text-slate-900">
                        <Link
                          href={`/students/${inv.student_id}`}
                          className="hover:text-indigo-600 flex items-center gap-1.5"
                        >
                          {inv.student_name}
                          <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {inv.student_class}
                          </span>
                        </Link>
                      </td>
                      <td className="p-4 text-slate-600 font-medium">
                        {formatDate(inv.period_start, 'dd MMM')} – {formatDate(inv.period_end, 'dd MMM yyyy')}
                      </td>
                      <td className="p-4">
                        <span className="font-semibold text-slate-800">
                          {inv.billing_type.replace(/_/g, ' ')}
                        </span>
                        <p className="text-[11px] text-slate-400">
                          {inv.classes_count} completed classes
                        </p>
                      </td>
                      <td className="p-4 font-bold text-slate-900">{formatINR(inv.amount_due)}</td>
                      <td className="p-4 font-semibold text-emerald-600">{formatINR(inv.amount_received)}</td>
                      <td className="p-4 font-bold text-amber-600">
                        {inv.balance > 0 ? formatINR(inv.balance) : '₹0'}
                      </td>
                      <td className="p-4 text-slate-600 font-medium">{formatDate(inv.due_date, 'dd MMM yyyy')}</td>
                      <td className="p-4">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="p-4 pr-6 text-right space-x-2">
                        <button
                          onClick={() => setInvoicePreview(inv)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                          title="View Printable Receipt"
                        >
                          <Receipt className="w-4 h-4" />
                        </button>

                        {inv.balance > 0 && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleOpenPayment(inv)}
                            className="text-[11px] h-7 px-2.5"
                          >
                            Pay
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* RECORD PAYMENT MODAL */}
      {paymentModalOpen && (
        <Modal
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          title="Record Received Payment"
          description={
            selectedInvoice
              ? `Paying invoice for ${selectedInvoice.student_name} (${formatINR(selectedInvoice.balance)} due)`
              : 'Record received cash/UPI fee payment'
          }
        >
          <form onSubmit={handleRecordPaymentSubmit} className="space-y-4 py-1">
            {!selectedInvoice && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Student *
                </label>
                <select
                  value={targetStudentId}
                  onChange={(e) => setTargetStudentId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs font-semibold bg-white focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.class_level}) — Balance: {formatINR(st.active_balance)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Amount Received (₹) *
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
                  Payment Mode *
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
                Receipt Note
              </label>
              <input
                type="text"
                placeholder="e.g. Received in cash, sent receipt to parent"
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
                Record Payment
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* PRINTABLE RECEIPT PREVIEW MODAL */}
      {invoicePreview && (
        <Modal
          isOpen={Boolean(invoicePreview)}
          onClose={() => setInvoicePreview(null)}
          title="Tuition Fee Invoice & Receipt"
          description={`Invoice #${invoicePreview.id.slice(0, 8).toUpperCase()}`}
          maxWidth="lg"
        >
          <div className="space-y-6 py-2">
            <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50 space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">TutorPulse Tuition Receipt</h3>
                  <p className="text-xs text-slate-500">SN Sharma • Smart Tuition Academy</p>
                </div>
                <StatusBadge status={invoicePreview.status} />
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-slate-400 uppercase font-semibold text-[10px]">Billed To</p>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{invoicePreview.student_name}</p>
                  <p className="text-slate-500">{invoicePreview.student_class}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 uppercase font-semibold text-[10px]">Due Date</p>
                  <p className="font-bold text-slate-900 mt-0.5">{formatDate(invoicePreview.due_date)}</p>
                  <p className="text-slate-500">Period: {formatDate(invoicePreview.period_start)} – {formatDate(invoicePreview.period_end)}</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between font-medium text-slate-600">
                  <span>Tuition Model:</span>
                  <span className="font-semibold text-slate-900">{invoicePreview.billing_type.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex justify-between font-medium text-slate-600">
                  <span>Classes Count:</span>
                  <span className="font-semibold text-slate-900">{invoicePreview.classes_count} completed</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 text-sm pt-2 border-t border-slate-100">
                  <span>Total Amount Due:</span>
                  <span>{formatINR(invoicePreview.amount_due)}</span>
                </div>
                <div className="flex justify-between font-semibold text-emerald-600">
                  <span>Amount Paid:</span>
                  <span>{formatINR(invoicePreview.amount_received)}</span>
                </div>
                <div className="flex justify-between font-bold text-amber-600 text-sm pt-2 border-t border-slate-100">
                  <span>Outstanding Balance:</span>
                  <span>{formatINR(invoicePreview.balance)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setInvoicePreview(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  window.print();
                }}
              >
                <Printer className="w-4 h-4 mr-1.5" />
                Print / Save PDF
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
