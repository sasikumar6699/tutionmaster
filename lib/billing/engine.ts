import {
  BillingProfile,
  BillingRecord,
  ClassSession,
  BillingRecordStatus,
} from '../types/database.types';

export interface BatchProgress {
  totalCompleted: number;
  currentBatchCompleted: number;
  targetBatchSize: number;
  batchAmount: number;
  isReadyForInvoice: boolean;
  alertMessage?: string;
}

export interface BillingEvaluationResult {
  shouldGenerateInvoice: boolean;
  newInvoice?: Omit<BillingRecord, 'id' | 'created_at' | 'updated_at'>;
  alert?: {
    type: 'BATCH_THRESHOLD' | 'DUE_DATE' | 'OVERDUE' | 'INVOICE_GENERATED';
    message: string;
    student_id: string;
    severity: 'info' | 'warning' | 'danger' | 'success';
  };
}

/**
 * Calculates current progress for a CLASS_BATCH billing profile
 */
export function calculateBatchProgress(
  profile: BillingProfile,
  completedSessions: ClassSession[],
  existingInvoices: BillingRecord[]
): BatchProgress {
  const batchSize = profile.batch_size || 8;
  const batchAmount = profile.fixed_amount || 0;

  // Filter only PRESENT sessions
  const presentSessions = completedSessions.filter((s) => s.status === 'PRESENT');
  const totalCompleted = presentSessions.length;

  // Count how many classes have already been invoiced under batch billing
  const totalInvoicedClasses = existingInvoices
    .filter((inv) => inv.billing_type === 'CLASS_BATCH')
    .reduce((sum, inv) => sum + (inv.classes_count || 0), 0);

  const currentBatchCompleted = totalCompleted - totalInvoicedClasses;
  const isReadyForInvoice = currentBatchCompleted >= batchSize;

  let alertMessage: string | undefined;
  if (currentBatchCompleted === batchSize - 1) {
    alertMessage = `Completed ${currentBatchCompleted}/${batchSize} classes. Next class will trigger a ₹${batchAmount.toLocaleString('en-IN')} fee.`;
  } else if (currentBatchCompleted >= batchSize) {
    alertMessage = `${batchSize} classes completed — ₹${batchAmount.toLocaleString('en-IN')} fee generated.`;
  }

  return {
    totalCompleted,
    currentBatchCompleted: Math.max(0, currentBatchCompleted),
    targetBatchSize: batchSize,
    batchAmount,
    isReadyForInvoice,
    alertMessage,
  };
}

/**
 * Evaluates whether an invoice should be generated for a student based on billing rules
 */
export function evaluateBilling(
  studentId: string,
  profile: BillingProfile,
  sessions: ClassSession[],
  existingInvoices: BillingRecord[],
  currentDate = new Date()
): BillingEvaluationResult {
  const presentSessions = sessions.filter(
    (s) => s.student_id === studentId && s.status === 'PRESENT'
  );

  switch (profile.billing_type) {
    case 'CLASS_BATCH': {
      const batchProgress = calculateBatchProgress(profile, presentSessions, existingInvoices);
      if (batchProgress.isReadyForInvoice) {
        const sortedSessions = [...presentSessions].sort(
          (a, b) => new Date(a.class_date).getTime() - new Date(b.class_date).getTime()
        );
        const latestSession = sortedSessions[sortedSessions.length - 1];
        const periodEnd = latestSession ? latestSession.class_date : currentDate.toISOString().slice(0, 10);
        const periodStart = sortedSessions[sortedSessions.length - batchProgress.targetBatchSize]?.class_date || periodEnd;

        return {
          shouldGenerateInvoice: true,
          newInvoice: {
            student_id: studentId,
            billing_profile_id: profile.id,
            period_start: periodStart,
            period_end: periodEnd,
            billing_type: 'CLASS_BATCH',
            classes_count: batchProgress.targetBatchSize,
            rate: batchProgress.batchAmount,
            amount_due: batchProgress.batchAmount,
            amount_received: 0,
            balance: batchProgress.batchAmount,
            status: 'PENDING',
            due_date: periodEnd,
          },
          alert: {
            type: 'INVOICE_GENERATED',
            message: `${batchProgress.targetBatchSize} classes completed — ₹${batchProgress.batchAmount.toLocaleString('en-IN')} fee due.`,
            student_id: studentId,
            severity: 'warning',
          },
        };
      } else if (batchProgress.alertMessage) {
        return {
          shouldGenerateInvoice: false,
          alert: {
            type: 'BATCH_THRESHOLD',
            message: batchProgress.alertMessage,
            student_id: studentId,
            severity: 'info',
          },
        };
      }
      return { shouldGenerateInvoice: false };
    }

    case 'MONTHLY_FIXED': {
      const fixedAmount = profile.fixed_amount || 0;
      const startDay = profile.billing_cycle_start_day || 1;
      const endDay = profile.billing_cycle_end_day || 28;
      const dueDay = profile.billing_day || startDay;

      // Cycle dates for current month evaluation
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      const periodStart = new Date(year, month, startDay).toISOString().slice(0, 10);
      const periodEnd = new Date(year, month + 1, endDay).toISOString().slice(0, 10);
      const dueDate = new Date(year, month + 1, dueDay).toISOString().slice(0, 10);

      // Check if invoice already generated for this cycle
      const alreadyInvoiced = existingInvoices.some(
        (inv) =>
          inv.student_id === studentId &&
          inv.billing_type === 'MONTHLY_FIXED' &&
          inv.period_start === periodStart
      );

      if (!alreadyInvoiced) {
        return {
          shouldGenerateInvoice: true,
          newInvoice: {
            student_id: studentId,
            billing_profile_id: profile.id,
            period_start: periodStart,
            period_end: periodEnd,
            billing_type: 'MONTHLY_FIXED',
            classes_count: presentSessions.filter(
              (s) => s.class_date >= periodStart && s.class_date <= periodEnd
            ).length,
            rate: fixedAmount,
            amount_due: fixedAmount,
            amount_received: 0,
            balance: fixedAmount,
            status: 'PENDING',
            due_date: dueDate,
          },
          alert: {
            type: 'DUE_DATE',
            message: `Monthly fee of ₹${fixedAmount.toLocaleString('en-IN')} generated, due on ${dueDate}.`,
            student_id: studentId,
            severity: 'warning',
          },
        };
      }
      return { shouldGenerateInvoice: false };
    }

    case 'MONTHLY_PER_CLASS': {
      const perClassRate = profile.per_class_amount || 0;
      const dueDay = profile.billing_day || 3;

      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      const periodStart = new Date(year, month - 1, 1).toISOString().slice(0, 10);
      const periodEnd = new Date(year, month, 0).toISOString().slice(0, 10);
      const dueDate = new Date(year, month, dueDay).toISOString().slice(0, 10);

      const cycleClasses = presentSessions.filter(
        (s) => s.class_date >= periodStart && s.class_date <= periodEnd
      );

      const amountDue = cycleClasses.length * perClassRate;

      const alreadyInvoiced = existingInvoices.some(
        (inv) =>
          inv.student_id === studentId &&
          inv.billing_type === 'MONTHLY_PER_CLASS' &&
          inv.period_start === periodStart
      );

      if (!alreadyInvoiced && cycleClasses.length > 0) {
        return {
          shouldGenerateInvoice: true,
          newInvoice: {
            student_id: studentId,
            billing_profile_id: profile.id,
            period_start: periodStart,
            period_end: periodEnd,
            billing_type: 'MONTHLY_PER_CLASS',
            classes_count: cycleClasses.length,
            rate: perClassRate,
            amount_due: amountDue,
            amount_received: 0,
            balance: amountDue,
            status: 'PENDING',
            due_date: dueDate,
          },
          alert: {
            type: 'DUE_DATE',
            message: `Monthly fee of ₹${amountDue.toLocaleString('en-IN')} for ${cycleClasses.length} classes is due on ${dueDate}.`,
            student_id: studentId,
            severity: 'warning',
          },
        };
      }
      return { shouldGenerateInvoice: false };
    }

    case 'PER_CLASS': {
      return { shouldGenerateInvoice: false };
    }
  }
}

/**
 * Applies a payment to a billing record and recalculates status and balance
 */
export function applyPaymentToInvoice(
  invoice: BillingRecord,
  paymentAmount: number
): {
  updatedInvoice: BillingRecord;
  remainingOverpayment: number;
} {
  const newReceived = Number((invoice.amount_received + paymentAmount).toFixed(2));
  const newBalance = Number((invoice.amount_due - newReceived).toFixed(2));
  const remainingOverpayment = newBalance < 0 ? Math.abs(newBalance) : 0;
  const clampedBalance = Math.max(0, newBalance);

  let newStatus: BillingRecordStatus = 'PENDING';
  if (clampedBalance === 0 && newReceived >= invoice.amount_due) {
    newStatus = 'PAID';
  } else if (newReceived > 0) {
    newStatus = 'PARTIALLY_PAID';
  }

  return {
    updatedInvoice: {
      ...invoice,
      amount_received: newReceived - remainingOverpayment,
      balance: clampedBalance,
      status: newStatus,
      updated_at: new Date().toISOString(),
    },
    remainingOverpayment,
  };
}

/**
 * Evaluates student outstanding balance across all invoices
 */
export function calculateStudentBalance(invoices: BillingRecord[]): {
  totalDue: number;
  totalReceived: number;
  outstandingBalance: number;
  overdueBalance: number;
} {
  const today = new Date().toISOString().slice(0, 10);
  let totalDue = 0;
  let totalReceived = 0;
  let outstandingBalance = 0;
  let overdueBalance = 0;

  for (const inv of invoices) {
    totalDue += inv.amount_due;
    totalReceived += inv.amount_received;
    outstandingBalance += inv.balance;
    if (inv.balance > 0 && inv.due_date < today) {
      overdueBalance += inv.balance;
    }
  }

  return {
    totalDue: Number(totalDue.toFixed(2)),
    totalReceived: Number(totalReceived.toFixed(2)),
    outstandingBalance: Number(outstandingBalance.toFixed(2)),
    overdueBalance: Number(overdueBalance.toFixed(2)),
  };
}
