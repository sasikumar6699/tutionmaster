import {
  calculateBatchProgress,
  evaluateBilling,
  applyPaymentToInvoice,
  calculateStudentBalance,
} from '../lib/billing/engine';
import { rescheduleSingleSession } from '../lib/scheduling/generator';
import {
  BillingProfile,
  BillingRecord,
  ClassSession,
} from '../lib/types/database.types';

function runTests() {
  console.log('=== RUNNING BILLING & SCHEDULING UNIT TESTS ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. SREESHA CLASS_BATCH (8 classes, ₹6,750)
  const sreeshaProfile: BillingProfile = {
    id: 'bp-sreesha',
    student_id: 'stud-sreesha',
    billing_type: 'CLASS_BATCH',
    batch_size: 8,
    fixed_amount: 6750,
    active: true,
    created_at: '2026-07-01',
    updated_at: '2026-07-01',
  };

  // Test with 7 PRESENT classes + 1 ABSENT + 1 CANCELLED
  const sreeshaSessions7: ClassSession[] = [
    { id: '1', student_id: 'stud-sreesha', subject_id: 'sub-1', class_date: '2026-07-20', scheduled_start: '19:00', scheduled_end: '20:00', status: 'PRESENT', created_at: '', updated_at: '' },
    { id: '2', student_id: 'stud-sreesha', subject_id: 'sub-1', class_date: '2026-07-21', scheduled_start: '19:00', scheduled_end: '20:00', status: 'PRESENT', created_at: '', updated_at: '' },
    { id: '3', student_id: 'stud-sreesha', subject_id: 'sub-1', class_date: '2026-07-27', scheduled_start: '19:00', scheduled_end: '20:00', status: 'PRESENT', created_at: '', updated_at: '' },
    { id: '4', student_id: 'stud-sreesha', subject_id: 'sub-1', class_date: '2026-07-28', scheduled_start: '19:00', scheduled_end: '20:00', status: 'ABSENT', created_at: '', updated_at: '' },
    { id: '5', student_id: 'stud-sreesha', subject_id: 'sub-1', class_date: '2026-08-03', scheduled_start: '19:00', scheduled_end: '20:00', status: 'PRESENT', created_at: '', updated_at: '' },
    { id: '6', student_id: 'stud-sreesha', subject_id: 'sub-1', class_date: '2026-08-04', scheduled_start: '19:00', scheduled_end: '20:00', status: 'PRESENT', created_at: '', updated_at: '' },
    { id: '7', student_id: 'stud-sreesha', subject_id: 'sub-1', class_date: '2026-08-10', scheduled_start: '19:00', scheduled_end: '20:00', status: 'PRESENT', created_at: '', updated_at: '' },
    { id: '8', student_id: 'stud-sreesha', subject_id: 'sub-1', class_date: '2026-08-11', scheduled_start: '19:00', scheduled_end: '20:00', status: 'PRESENT', created_at: '', updated_at: '' },
    { id: '9', student_id: 'stud-sreesha', subject_id: 'sub-1', class_date: '2026-08-12', scheduled_start: '19:00', scheduled_end: '20:00', status: 'CANCELLED', created_at: '', updated_at: '' },
  ];

  const progress7 = calculateBatchProgress(sreeshaProfile, sreeshaSessions7, []);
  assert(progress7.currentBatchCompleted === 7, 'Sreesha: 7 completed PRESENT classes counted (ABSENT & CANCELLED excluded)');
  assert(progress7.isReadyForInvoice === false, 'Sreesha at 7 classes: No invoice generated yet');
  assert(progress7.alertMessage?.includes('7/8'), 'Sreesha at 7 classes: 7/8 threshold alert generated');

  // Add 8th PRESENT class
  const sreeshaSessions8: ClassSession[] = [
    ...sreeshaSessions7,
    { id: '10', student_id: 'stud-sreesha', subject_id: 'sub-1', class_date: '2026-08-17', scheduled_start: '19:00', scheduled_end: '20:00', status: 'PRESENT', created_at: '', updated_at: '' },
  ];

  const eval8 = evaluateBilling('stud-sreesha', sreeshaProfile, sreeshaSessions8, []);
  assert(eval8.shouldGenerateInvoice === true, 'Sreesha at 8 completed classes: Generates invoice');
  assert(eval8.newInvoice?.amount_due === 6750, 'Sreesha at 8 completed classes: Invoice amount is ₹6,750');
  assert(eval8.newInvoice?.classes_count === 8, 'Sreesha: Classes count on invoice is 8');

  // After invoice generated, test that next batch starts at 0
  const existingInvoice: BillingRecord = {
    id: 'inv-sreesha-1',
    student_id: 'stud-sreesha',
    period_start: '2026-07-20',
    period_end: '2026-08-17',
    billing_type: 'CLASS_BATCH',
    classes_count: 8,
    rate: 6750,
    amount_due: 6750,
    amount_received: 6750,
    balance: 0,
    status: 'PAID',
    due_date: '2026-08-17',
    created_at: '',
    updated_at: '',
  };

  const progressAfterBatch1 = calculateBatchProgress(sreeshaProfile, sreeshaSessions8, [existingInvoice]);
  assert(progressAfterBatch1.currentBatchCompleted === 0, 'Sreesha: After 8-class batch is invoiced, next batch counter resets to 0/8');

  // 2. SIVA MONTHLY_FIXED (₹8,500, cycle 3rd to 2nd, due 3rd)
  const sivaProfile: BillingProfile = {
    id: 'bp-siva',
    student_id: 'stud-siva',
    billing_type: 'MONTHLY_FIXED',
    fixed_amount: 8500,
    billing_day: 3,
    billing_cycle_start_day: 3,
    billing_cycle_end_day: 2,
    active: true,
    created_at: '',
    updated_at: '',
  };

  const sivaSessions: ClassSession[] = [
    { id: 'sv-1', student_id: 'stud-siva', subject_id: 'sub-1', class_date: '2026-08-05', scheduled_start: '19:00', scheduled_end: '20:00', status: 'PRESENT', created_at: '', updated_at: '' },
    { id: 'sv-2', student_id: 'stud-siva', subject_id: 'sub-2', class_date: '2026-08-06', scheduled_start: '19:00', scheduled_end: '20:00', status: 'ABSENT', created_at: '', updated_at: '' },
  ];

  const evalSiva = evaluateBilling('stud-siva', sivaProfile, sivaSessions, [], new Date('2026-08-03'));
  assert(evalSiva.shouldGenerateInvoice === true, 'Siva Monthly Fixed: Generates invoice for cycle');
  assert(evalSiva.newInvoice?.amount_due === 8500, 'Siva Monthly Fixed: Amount is ₹8,500 (not modified by attendance)');

  // 3. MRITHIKA MONTHLY_PER_CLASS (Configurable rate, e.g. ₹500/class)
  const mrithikaProfile: BillingProfile = {
    id: 'bp-mrithika',
    student_id: 'stud-mrithika',
    billing_type: 'MONTHLY_PER_CLASS',
    per_class_amount: 500,
    billing_day: 3,
    active: true,
    created_at: '',
    updated_at: '',
  };

  const mrithikaSessions: ClassSession[] = [
    { id: 'm-1', student_id: 'stud-mrithika', subject_id: 'sub-1', class_date: '2026-07-05', scheduled_start: '20:00', scheduled_end: '21:00', status: 'PRESENT', created_at: '', updated_at: '' },
    { id: 'm-2', student_id: 'stud-mrithika', subject_id: 'sub-1', class_date: '2026-07-12', scheduled_start: '20:00', scheduled_end: '21:00', status: 'PRESENT', created_at: '', updated_at: '' },
    { id: 'm-3', student_id: 'stud-mrithika', subject_id: 'sub-1', class_date: '2026-07-19', scheduled_start: '20:00', scheduled_end: '21:00', status: 'ABSENT', created_at: '', updated_at: '' },
    { id: 'm-4', student_id: 'stud-mrithika', subject_id: 'sub-1', class_date: '2026-07-26', scheduled_start: '20:00', scheduled_end: '21:00', status: 'PRESENT', created_at: '', updated_at: '' },
  ];

  const evalMrithika = evaluateBilling('stud-mrithika', mrithikaProfile, mrithikaSessions, [], new Date('2026-08-01'));
  assert(evalMrithika.shouldGenerateInvoice === true, 'Mrithika: Generates monthly per-class invoice');
  assert(evalMrithika.newInvoice?.classes_count === 3, 'Mrithika: Counts 3 PRESENT classes (excluding ABSENT)');
  assert(evalMrithika.newInvoice?.amount_due === 1500, 'Mrithika: Amount is 3 × ₹500 = ₹1,500');

  // 4. PAYMENTS & BALANCE RECONCILIATION
  const testInvoice: BillingRecord = {
    id: 'inv-test',
    student_id: 'stud-siva',
    period_start: '2026-08-03',
    period_end: '2026-09-02',
    billing_type: 'MONTHLY_FIXED',
    classes_count: 16,
    rate: 8500,
    amount_due: 8500,
    amount_received: 0,
    balance: 8500,
    status: 'PENDING',
    due_date: '2026-09-03',
    created_at: '',
    updated_at: '',
  };

  // Partial Payment
  const partialPayment = applyPaymentToInvoice(testInvoice, 3500);
  assert(partialPayment.updatedInvoice.amount_received === 3500, 'Payment: Amount received is 3500');
  assert(partialPayment.updatedInvoice.balance === 5000, 'Payment: Balance reduced to 5000');
  assert(partialPayment.updatedInvoice.status === 'PARTIALLY_PAID', 'Payment: Status marked as PARTIALLY_PAID');

  // Complete remaining Payment
  const fullPayment = applyPaymentToInvoice(partialPayment.updatedInvoice, 5000);
  assert(fullPayment.updatedInvoice.amount_received === 8500, 'Payment: Full amount received 8500');
  assert(fullPayment.updatedInvoice.balance === 0, 'Payment: Balance is 0');
  assert(fullPayment.updatedInvoice.status === 'PAID', 'Payment: Status marked as PAID');

  // 5. RESCHEDULING NON-DESTRUCTIVE CHECK
  const originalSession: ClassSession = {
    id: 'sess-orig',
    student_id: 'stud-siva',
    subject_id: 'sub-2',
    class_date: '2026-08-08',
    scheduled_start: '19:00',
    scheduled_end: '20:00',
    status: 'UPCOMING',
    meet_url: 'https://meet.google.com/sht-cfst-qai',
    created_at: '2026-08-01',
    updated_at: '2026-08-01',
  };

  const { updatedOriginal, newSession } = rescheduleSingleSession(
    originalSession,
    '2026-08-09',
    '18:00',
    '19:00'
  );

  assert(updatedOriginal.status === 'RESCHEDULED', 'Reschedule: Original session status becomes RESCHEDULED');
  assert(newSession.status === 'UPCOMING', 'Reschedule: New session status is UPCOMING');
  assert(newSession.class_date === '2026-08-09', 'Reschedule: New session date is set');
  assert(newSession.rescheduled_from_id === 'sess-orig', 'Reschedule: New session references original session ID');

  console.log(`\n=== TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
