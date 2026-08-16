import {
  Profile,
  Subject,
  Student,
  StudentSubject,
  RecurringSchedule,
  ClassSession,
  AttendanceRecord,
  ClassNote,
  BillingProfile,
  BillingRecord,
  Payment,
  AppSetting,
  EnrichedStudent,
  EnrichedClassSession,
  EnrichedBillingRecord,
  MonthlyReportSummary,
  ClassSessionStatus,
  PaymentMethod,
} from '../types/database.types';
import { calculateBatchProgress, evaluateBilling, applyPaymentToInvoice } from '../billing/engine';
import { generateSessionsForRange, rescheduleSingleSession } from '../scheduling/generator';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { formatDuration } from '../utils/date';

// Initial Seed Data IDs
const DEMO_TUTOR_ID = '00000000-0000-0000-0000-000000000001';

const INITIAL_PROFILE: Profile = {
  id: DEMO_TUTOR_ID,
  user_id: '00000000-0000-0000-0000-000000000001',
  full_name: 'Aditya Sharma',
  email: 'tutor@tutorpulse.io',
  phone: '+91 98765 43210',
  timezone: 'Asia/Kolkata',
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-08-14T00:00:00Z',
};

const INITIAL_SUBJECTS: Subject[] = [
  { id: 'sub-1', tutor_id: DEMO_TUTOR_ID, name: 'Maths', description: 'Advanced & Core Mathematics', created_at: '2026-07-01T00:00:00Z' },
  { id: 'sub-2', tutor_id: DEMO_TUTOR_ID, name: 'Physics', description: 'Mechanics, Electromagnetism, & Optics', created_at: '2026-07-01T00:00:00Z' },
  { id: 'sub-3', tutor_id: DEMO_TUTOR_ID, name: 'Chemistry', description: 'Organic, Inorganic & Physical Chemistry', created_at: '2026-07-01T00:00:00Z' },
  { id: 'sub-4', tutor_id: DEMO_TUTOR_ID, name: 'Biology', description: 'Botany & Zoology', created_at: '2026-07-01T00:00:00Z' },
  { id: 'sub-5', tutor_id: DEMO_TUTOR_ID, name: 'English', description: 'Grammar, Literature & Composition', created_at: '2026-07-01T00:00:00Z' },
];

const INITIAL_STUDENTS: Student[] = [
  {
    id: 'stud-1',
    tutor_id: DEMO_TUTOR_ID,
    name: 'Sreesha',
    class_level: 'Class 8',
    parent_name: 'Ramesh Kumar',
    parent_phone: '+91 98401 23456',
    student_phone: '+91 98401 23457',
    email: 'sreesha.parent@gmail.com',
    notes: 'Focus on algebraic factorization and linear geometry',
    meet_url: 'https://meet.google.com/bwb-gduo-ukn',
    status: 'ACTIVE',
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-08-14T00:00:00Z',
  },
  {
    id: 'stud-2',
    tutor_id: DEMO_TUTOR_ID,
    name: 'Siva',
    class_level: 'Class 16',
    parent_name: 'Dr. Sundaram',
    parent_phone: '+91 98402 34567',
    student_phone: '+91 98402 34568',
    email: 'siva.prep@gmail.com',
    notes: 'Competitive physics numericals and calculus integration',
    meet_url: 'https://meet.google.com/sht-cfst-qai',
    status: 'ACTIVE',
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-08-14T00:00:00Z',
  },
  {
    id: 'stud-3',
    tutor_id: DEMO_TUTOR_ID,
    name: 'Mrithika',
    class_level: 'Class 8',
    parent_name: 'Priya Lakshmi',
    parent_phone: '+91 98403 45678',
    student_phone: '+91 98403 45679',
    email: 'mrithika.maths@gmail.com',
    notes: 'Quick learner, needs thorough revision on word problems',
    meet_url: 'https://meet.google.com/sht-cfst-qai',
    status: 'ACTIVE',
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-08-14T00:00:00Z',
  },
];

const INITIAL_STUDENT_SUBJECTS: StudentSubject[] = [
  { id: 'ss-1', student_id: 'stud-1', subject_id: 'sub-1', created_at: '2026-07-01T00:00:00Z' },
  { id: 'ss-2', student_id: 'stud-2', subject_id: 'sub-1', created_at: '2026-07-01T00:00:00Z' },
  { id: 'ss-3', student_id: 'stud-2', subject_id: 'sub-2', created_at: '2026-07-01T00:00:00Z' },
  { id: 'ss-4', student_id: 'stud-3', subject_id: 'sub-1', created_at: '2026-07-01T00:00:00Z' },
];

const INITIAL_SCHEDULES: RecurringSchedule[] = [
  // Sreesha: Mon 7-8 PM, Tue 7-8 PM
  { id: 'sch-1', student_id: 'stud-1', subject_id: 'sub-1', day_of_week: 1, start_time: '19:00', end_time: '20:00', effective_from: '2026-07-01', meet_url: 'https://meet.google.com/bwb-gduo-ukn', active: true, created_at: '2026-07-01T00:00:00Z', updated_at: '2026-07-01T00:00:00Z' },
  { id: 'sch-2', student_id: 'stud-1', subject_id: 'sub-1', day_of_week: 2, start_time: '19:00', end_time: '20:00', effective_from: '2026-07-01', meet_url: 'https://meet.google.com/bwb-gduo-ukn', active: true, created_at: '2026-07-01T00:00:00Z', updated_at: '2026-07-01T00:00:00Z' },
  // Siva: Wed 7-8 PM, Thu 7-8 PM, Fri 7-8 PM, Sat 7-8 PM
  { id: 'sch-3', student_id: 'stud-2', subject_id: 'sub-1', day_of_week: 3, start_time: '19:00', end_time: '20:00', effective_from: '2026-07-01', meet_url: 'https://meet.google.com/sht-cfst-qai', active: true, created_at: '2026-07-01T00:00:00Z', updated_at: '2026-07-01T00:00:00Z' },
  { id: 'sch-4', student_id: 'stud-2', subject_id: 'sub-2', day_of_week: 4, start_time: '19:00', end_time: '20:00', effective_from: '2026-07-01', meet_url: 'https://meet.google.com/sht-cfst-qai', active: true, created_at: '2026-07-01T00:00:00Z', updated_at: '2026-07-01T00:00:00Z' },
  { id: 'sch-5', student_id: 'stud-2', subject_id: 'sub-1', day_of_week: 5, start_time: '19:00', end_time: '20:00', effective_from: '2026-07-01', meet_url: 'https://meet.google.com/sht-cfst-qai', active: true, created_at: '2026-07-01T00:00:00Z', updated_at: '2026-07-01T00:00:00Z' },
  { id: 'sch-6', student_id: 'stud-2', subject_id: 'sub-2', day_of_week: 6, start_time: '19:00', end_time: '20:00', effective_from: '2026-07-01', meet_url: 'https://meet.google.com/sht-cfst-qai', active: true, created_at: '2026-07-01T00:00:00Z', updated_at: '2026-07-01T00:00:00Z' },
  // Mrithika: Mon 8-9 PM, Tue 8-9 PM
  { id: 'sch-7', student_id: 'stud-3', subject_id: 'sub-1', day_of_week: 1, start_time: '20:00', end_time: '21:00', effective_from: '2026-07-01', meet_url: 'https://meet.google.com/sht-cfst-qai', active: true, created_at: '2026-07-01T00:00:00Z', updated_at: '2026-07-01T00:00:00Z' },
  { id: 'sch-8', student_id: 'stud-3', subject_id: 'sub-1', day_of_week: 2, start_time: '20:00', end_time: '21:00', effective_from: '2026-07-01', meet_url: 'https://meet.google.com/sht-cfst-qai', active: true, created_at: '2026-07-01T00:00:00Z', updated_at: '2026-07-01T00:00:00Z' },
];

const INITIAL_BILLING_PROFILES: BillingProfile[] = [
  {
    id: 'bp-1',
    student_id: 'stud-1',
    billing_type: 'CLASS_BATCH',
    batch_size: 8,
    fixed_amount: 6750,
    active: true,
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
  },
  {
    id: 'bp-2',
    student_id: 'stud-2',
    billing_type: 'MONTHLY_FIXED',
    fixed_amount: 8500,
    billing_day: 3,
    billing_cycle_start_day: 3,
    billing_cycle_end_day: 2,
    active: true,
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
  },
  {
    id: 'bp-3',
    student_id: 'stud-3',
    billing_type: 'MONTHLY_PER_CLASS',
    per_class_amount: 388.88,
    fixed_amount: 3111, // Reference monthly value
    billing_day: 3,
    active: true,
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-01T00:00:00Z',
  },
];

const INITIAL_BILLING_RECORDS: BillingRecord[] = [
  // Siva: July 3 - Aug 2 (Paid)
  {
    id: 'inv-1',
    student_id: 'stud-2',
    billing_profile_id: 'bp-2',
    period_start: '2026-07-03',
    period_end: '2026-08-02',
    billing_type: 'MONTHLY_FIXED',
    classes_count: 16,
    rate: 8500,
    amount_due: 8500,
    amount_received: 8500,
    balance: 0,
    status: 'PAID',
    due_date: '2026-07-03',
    created_at: '2026-07-03T00:00:00Z',
    updated_at: '2026-07-05T00:00:00Z',
  },
  // Siva: Aug 3 - Sep 2 (Pending ₹8,500 due Sep 3)
  {
    id: 'inv-2',
    student_id: 'stud-2',
    billing_profile_id: 'bp-2',
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
    created_at: '2026-08-03T00:00:00Z',
    updated_at: '2026-08-03T00:00:00Z',
  },
  // Mrithika: July cycle (Paid ₹3,111)
  {
    id: 'inv-3',
    student_id: 'stud-3',
    billing_profile_id: 'bp-3',
    period_start: '2026-07-01',
    period_end: '2026-07-31',
    billing_type: 'MONTHLY_PER_CLASS',
    classes_count: 8,
    rate: 388.88,
    amount_due: 3111,
    amount_received: 3111,
    balance: 0,
    status: 'PAID',
    due_date: '2026-08-03',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-03T00:00:00Z',
  },
];

const INITIAL_PAYMENTS: Payment[] = [
  {
    id: 'pay-1',
    student_id: 'stud-2',
    billing_record_id: 'inv-1',
    amount: 8500,
    payment_date: '2026-07-05',
    payment_method: 'CASH',
    notes: 'Received full monthly fee for July cycle in cash',
    created_at: '2026-07-05T10:00:00Z',
  },
  {
    id: 'pay-2',
    student_id: 'stud-3',
    billing_record_id: 'inv-3',
    amount: 3111,
    payment_date: '2026-08-03',
    payment_method: 'CASH',
    notes: 'Cash payment for July tuition sessions',
    created_at: '2026-08-03T11:00:00Z',
  },
];

// Historical classes + Topics + Attendance across July & August 2026
// Note: Sreesha has 7 completed PRESENT classes in batch (1 away from 8 batch completion)
const INITIAL_CLASSES: ClassSession[] = [
  // Sreesha (7 completed PRESENT classes)
  { id: 'cls-sr-1', student_id: 'stud-1', subject_id: 'sub-1', schedule_id: 'sch-1', class_date: '2026-07-20', scheduled_start: '19:00', scheduled_end: '20:00', actual_start: '2026-07-20T19:02:00Z', actual_end: '2026-07-20T19:58:00Z', actual_duration_minutes: 56, status: 'PRESENT', meet_url: 'https://meet.google.com/bwb-gduo-ukn', created_at: '2026-07-20T00:00:00Z', updated_at: '2026-07-20T20:00:00Z' },
  { id: 'cls-sr-2', student_id: 'stud-1', subject_id: 'sub-1', schedule_id: 'sch-2', class_date: '2026-07-21', scheduled_start: '19:00', scheduled_end: '20:00', actual_start: '2026-07-21T19:00:00Z', actual_end: '2026-07-21T20:00:00Z', actual_duration_minutes: 60, status: 'PRESENT', meet_url: 'https://meet.google.com/bwb-gduo-ukn', created_at: '2026-07-21T00:00:00Z', updated_at: '2026-07-21T20:00:00Z' },
  { id: 'cls-sr-3', student_id: 'stud-1', subject_id: 'sub-1', schedule_id: 'sch-1', class_date: '2026-07-27', scheduled_start: '19:00', scheduled_end: '20:00', actual_start: '2026-07-27T19:05:00Z', actual_end: '2026-07-27T19:55:00Z', actual_duration_minutes: 50, status: 'PRESENT', meet_url: 'https://meet.google.com/bwb-gduo-ukn', created_at: '2026-07-27T00:00:00Z', updated_at: '2026-07-27T20:00:00Z' },
  { id: 'cls-sr-4', student_id: 'stud-1', subject_id: 'sub-1', schedule_id: 'sch-2', class_date: '2026-07-28', scheduled_start: '19:00', scheduled_end: '20:00', status: 'ABSENT', meet_url: 'https://meet.google.com/bwb-gduo-ukn', created_at: '2026-07-28T00:00:00Z', updated_at: '2026-07-28T20:00:00Z' },
  { id: 'cls-sr-5', student_id: 'stud-1', subject_id: 'sub-1', schedule_id: 'sch-1', class_date: '2026-08-03', scheduled_start: '19:00', scheduled_end: '20:00', actual_start: '2026-08-03T19:00:00Z', actual_end: '2026-08-03T19:58:00Z', actual_duration_minutes: 58, status: 'PRESENT', meet_url: 'https://meet.google.com/bwb-gduo-ukn', created_at: '2026-08-03T00:00:00Z', updated_at: '2026-08-03T20:00:00Z' },
  { id: 'cls-sr-6', student_id: 'stud-1', subject_id: 'sub-1', schedule_id: 'sch-2', class_date: '2026-08-04', scheduled_start: '19:00', scheduled_end: '20:00', actual_start: '2026-08-04T19:01:00Z', actual_end: '2026-08-04T20:01:00Z', actual_duration_minutes: 60, status: 'PRESENT', meet_url: 'https://meet.google.com/bwb-gduo-ukn', created_at: '2026-08-04T00:00:00Z', updated_at: '2026-08-04T20:00:00Z' },
  { id: 'cls-sr-7', student_id: 'stud-1', subject_id: 'sub-1', schedule_id: 'sch-1', class_date: '2026-08-10', scheduled_start: '19:00', scheduled_end: '20:00', actual_start: '2026-08-10T19:00:00Z', actual_end: '2026-08-10T19:52:00Z', actual_duration_minutes: 52, status: 'PRESENT', meet_url: 'https://meet.google.com/bwb-gduo-ukn', created_at: '2026-08-10T00:00:00Z', updated_at: '2026-08-10T20:00:00Z' },
  { id: 'cls-sr-8', student_id: 'stud-1', subject_id: 'sub-1', schedule_id: 'sch-2', class_date: '2026-08-11', scheduled_start: '19:00', scheduled_end: '20:00', actual_start: '2026-08-11T19:03:00Z', actual_end: '2026-08-11T19:57:00Z', actual_duration_minutes: 54, status: 'PRESENT', meet_url: 'https://meet.google.com/bwb-gduo-ukn', created_at: '2026-08-11T00:00:00Z', updated_at: '2026-08-11T20:00:00Z' },
  // Upcoming class for Sreesha (This 8th completed class will trigger ₹6,750 fee!)
  { id: 'cls-sr-9', student_id: 'stud-1', subject_id: 'sub-1', schedule_id: 'sch-1', class_date: '2026-08-17', scheduled_start: '19:00', scheduled_end: '20:00', status: 'UPCOMING', meet_url: 'https://meet.google.com/bwb-gduo-ukn', created_at: '2026-08-14T00:00:00Z', updated_at: '2026-08-14T00:00:00Z' },

  // Siva classes (Maths & Physics)
  { id: 'cls-sv-1', student_id: 'stud-2', subject_id: 'sub-1', schedule_id: 'sch-3', class_date: '2026-08-05', scheduled_start: '19:00', scheduled_end: '20:00', actual_start: '2026-08-05T19:00:00Z', actual_end: '2026-08-05T20:00:00Z', actual_duration_minutes: 60, status: 'PRESENT', meet_url: 'https://meet.google.com/sht-cfst-qai', created_at: '2026-08-05T00:00:00Z', updated_at: '2026-08-05T20:00:00Z' },
  { id: 'cls-sv-2', student_id: 'stud-2', subject_id: 'sub-2', schedule_id: 'sch-4', class_date: '2026-08-06', scheduled_start: '19:00', scheduled_end: '20:00', actual_start: '2026-08-06T19:05:00Z', actual_end: '2026-08-06T19:58:00Z', actual_duration_minutes: 53, status: 'PRESENT', meet_url: 'https://meet.google.com/sht-cfst-qai', created_at: '2026-08-06T00:00:00Z', updated_at: '2026-08-06T20:00:00Z' },
  { id: 'cls-sv-3', student_id: 'stud-2', subject_id: 'sub-1', schedule_id: 'sch-5', class_date: '2026-08-07', scheduled_start: '19:00', scheduled_end: '20:00', status: 'RESCHEDULED', meet_url: 'https://meet.google.com/sht-cfst-qai', created_at: '2026-08-07T00:00:00Z', updated_at: '2026-08-07T18:00:00Z' },
  { id: 'cls-sv-3b', student_id: 'stud-2', subject_id: 'sub-1', schedule_id: 'sch-5', class_date: '2026-08-09', scheduled_start: '18:00', scheduled_end: '19:00', actual_start: '2026-08-09T18:00:00Z', actual_end: '2026-08-09T19:00:00Z', actual_duration_minutes: 60, status: 'PRESENT', rescheduled_from_id: 'cls-sv-3', meet_url: 'https://meet.google.com/sht-cfst-qai', created_at: '2026-08-07T18:00:00Z', updated_at: '2026-08-09T19:00:00Z' },
  { id: 'cls-sv-4', student_id: 'stud-2', subject_id: 'sub-2', schedule_id: 'sch-6', class_date: '2026-08-08', scheduled_start: '19:00', scheduled_end: '20:00', actual_start: '2026-08-08T19:00:00Z', actual_end: '2026-08-08T19:55:00Z', actual_duration_minutes: 55, status: 'PRESENT', meet_url: 'https://meet.google.com/sht-cfst-qai', created_at: '2026-08-08T00:00:00Z', updated_at: '2026-08-08T20:00:00Z' },
  { id: 'cls-sv-5', student_id: 'stud-2', subject_id: 'sub-1', schedule_id: 'sch-3', class_date: '2026-08-12', scheduled_start: '19:00', scheduled_end: '20:00', actual_start: '2026-08-12T19:00:00Z', actual_end: '2026-08-12T19:58:00Z', actual_duration_minutes: 58, status: 'PRESENT', meet_url: 'https://meet.google.com/sht-cfst-qai', created_at: '2026-08-12T00:00:00Z', updated_at: '2026-08-12T20:00:00Z' },
  { id: 'cls-sv-6', student_id: 'stud-2', subject_id: 'sub-2', schedule_id: 'sch-4', class_date: '2026-08-13', scheduled_start: '19:00', scheduled_end: '20:00', actual_start: '2026-08-13T19:02:00Z', actual_end: '2026-08-13T19:59:00Z', actual_duration_minutes: 57, status: 'PRESENT', meet_url: 'https://meet.google.com/sht-cfst-qai', created_at: '2026-08-13T00:00:00Z', updated_at: '2026-08-13T20:00:00Z' },
  // Today's classes (August 14, 2026 is a Friday!)
  { id: 'cls-sv-today', student_id: 'stud-2', subject_id: 'sub-1', schedule_id: 'sch-5', class_date: '2026-08-14', scheduled_start: '19:00', scheduled_end: '20:00', status: 'UPCOMING', meet_url: 'https://meet.google.com/sht-cfst-qai', created_at: '2026-08-14T00:00:00Z', updated_at: '2026-08-14T00:00:00Z' },
  { id: 'cls-sv-sat', student_id: 'stud-2', subject_id: 'sub-2', schedule_id: 'sch-6', class_date: '2026-08-15', scheduled_start: '19:00', scheduled_end: '20:00', status: 'UPCOMING', meet_url: 'https://meet.google.com/sht-cfst-qai', created_at: '2026-08-14T00:00:00Z', updated_at: '2026-08-14T00:00:00Z' },

  // Mrithika classes (Mon/Tue 8-9 PM)
  { id: 'cls-mr-1', student_id: 'stud-3', subject_id: 'sub-1', schedule_id: 'sch-7', class_date: '2026-08-03', scheduled_start: '20:00', scheduled_end: '21:00', actual_start: '2026-08-03T20:00:00Z', actual_end: '2026-08-03T20:55:00Z', actual_duration_minutes: 55, status: 'PRESENT', meet_url: 'https://meet.google.com/sht-cfst-qai', created_at: '2026-08-03T00:00:00Z', updated_at: '2026-08-03T21:00:00Z' },
  { id: 'cls-mr-2', student_id: 'stud-3', subject_id: 'sub-1', schedule_id: 'sch-8', class_date: '2026-08-04', scheduled_start: '20:00', scheduled_end: '21:00', actual_start: '2026-08-04T20:02:00Z', actual_end: '2026-08-04T20:58:00Z', actual_duration_minutes: 56, status: 'PRESENT', meet_url: 'https://meet.google.com/sht-cfst-qai', created_at: '2026-08-04T00:00:00Z', updated_at: '2026-08-04T21:00:00Z' },
  { id: 'cls-mr-3', student_id: 'stud-3', subject_id: 'sub-1', schedule_id: 'sch-7', class_date: '2026-08-10', scheduled_start: '20:00', scheduled_end: '21:00', actual_start: '2026-08-10T20:00:00Z', actual_end: '2026-08-10T21:00:00Z', actual_duration_minutes: 60, status: 'PRESENT', meet_url: 'https://meet.google.com/sht-cfst-qai', created_at: '2026-08-10T00:00:00Z', updated_at: '2026-08-10T21:00:00Z' },
  { id: 'cls-mr-4', student_id: 'stud-3', subject_id: 'sub-1', schedule_id: 'sch-8', class_date: '2026-08-11', scheduled_start: '20:00', scheduled_end: '21:00', actual_start: '2026-08-11T20:01:00Z', actual_end: '2026-08-11T20:56:00Z', actual_duration_minutes: 55, status: 'PRESENT', meet_url: 'https://meet.google.com/sht-cfst-qai', created_at: '2026-08-11T00:00:00Z', updated_at: '2026-08-11T21:00:00Z' },
  { id: 'cls-mr-5', student_id: 'stud-3', subject_id: 'sub-1', schedule_id: 'sch-7', class_date: '2026-08-17', scheduled_start: '20:00', scheduled_end: '21:00', status: 'UPCOMING', meet_url: 'https://meet.google.com/sht-cfst-qai', created_at: '2026-08-14T00:00:00Z', updated_at: '2026-08-14T00:00:00Z' },
];

const INITIAL_NOTES: ClassNote[] = [
  { id: 'note-1', class_session_id: 'cls-sr-1', student_id: 'stud-1', subject_id: 'sub-1', topic: 'Algebraic Identities', subtopic: '(a+b)^2 and (a-b)^2 expansions', homework: 'NCERT Ex 9.4 Q1-Q5', notes: 'Mastered standard expansion, practicing negative coefficient cases', created_at: '2026-07-20T20:00:00Z', updated_at: '2026-07-20T20:00:00Z' },
  { id: 'note-2', class_session_id: 'cls-sr-2', student_id: 'stud-1', subject_id: 'sub-1', topic: 'Linear Equations in One Variable', subtopic: 'Solving equations with variable on both sides', homework: 'Exercise 2.3 Q1-Q10', notes: 'Very good retention, completed practice problems in 15 mins', created_at: '2026-07-21T20:00:00Z', updated_at: '2026-07-21T20:00:00Z' },
  { id: 'note-3', class_session_id: 'cls-sr-7', student_id: 'stud-1', subject_id: 'sub-1', topic: 'Linear Equations Word Problems', subtopic: 'Age and coin ratio problems', homework: 'Exercise 4.2 all word problems', notes: 'Needs additional practice on framing equations from word problems', created_at: '2026-08-10T20:00:00Z', updated_at: '2026-08-10T20:00:00Z' },
  { id: 'note-4', class_session_id: 'cls-sv-1', student_id: 'stud-2', subject_id: 'sub-1', topic: 'Calculus - Definite Integrals', subtopic: 'Substitution method & trigonometric transforms', homework: 'IIT-JEE Question Bank Set 3', notes: 'Excellent conceptual grasp, solved 8 complex problems', created_at: '2026-08-05T20:00:00Z', updated_at: '2026-08-05T20:00:00Z' },
  { id: 'note-5', class_session_id: 'cls-sv-2', student_id: 'stud-2', subject_id: 'sub-2', topic: 'Electromagnetic Induction', subtopic: "Faraday's Law and Lenz's Law problems", homework: 'HC Verma Vol 2 Chapter 38 numericals 1-15', notes: 'Clarified induced EMF sign convention with circuit diagrams', created_at: '2026-08-06T20:00:00Z', updated_at: '2026-08-06T20:00:00Z' },
  { id: 'note-6', class_session_id: 'cls-mr-1', student_id: 'stud-3', subject_id: 'sub-1', topic: 'Squares and Square Roots', subtopic: 'Prime factorisation method', homework: 'NCERT Ex 6.3 all parts', notes: 'Understood square roots clearly, fast calculations', created_at: '2026-08-03T21:00:00Z', updated_at: '2026-08-03T21:00:00Z' },
  { id: 'note-7', class_session_id: 'cls-mr-4', student_id: 'stud-3', subject_id: 'sub-1', topic: 'Comparing Quantities', subtopic: 'Compound Interest formulas', homework: 'Ex 8.3 Q1 to Q6', notes: 'Understood compounding intervals (semi-annually vs annually)', created_at: '2026-08-11T21:00:00Z', updated_at: '2026-08-11T21:00:00Z' },
];

const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  { id: 'att-1', class_session_id: 'cls-sr-1', student_id: 'stud-1', status: 'PRESENT', marked_at: '2026-07-20T20:00:00Z', notes: 'On time, active participation' },
  { id: 'att-2', class_session_id: 'cls-sr-2', student_id: 'stud-1', status: 'PRESENT', marked_at: '2026-07-21T20:00:00Z', notes: 'Completed homework' },
  { id: 'att-3', class_session_id: 'cls-sr-3', student_id: 'stud-1', status: 'PRESENT', marked_at: '2026-07-27T20:00:00Z', notes: 'Good work' },
  { id: 'att-4', class_session_id: 'cls-sr-4', student_id: 'stud-1', status: 'ABSENT', marked_at: '2026-07-28T20:00:00Z', notes: 'School exam preparation' },
  { id: 'att-5', class_session_id: 'cls-sr-5', student_id: 'stud-1', status: 'PRESENT', marked_at: '2026-08-03T20:00:00Z', notes: 'Regular class' },
  { id: 'att-6', class_session_id: 'cls-sr-6', student_id: 'stud-1', status: 'PRESENT', marked_at: '2026-08-04T20:00:00Z', notes: 'Regular class' },
  { id: 'att-7', class_session_id: 'cls-sr-7', student_id: 'stud-1', status: 'PRESENT', marked_at: '2026-08-10T20:00:00Z', notes: 'Regular class' },
  { id: 'att-8', class_session_id: 'cls-sr-8', student_id: 'stud-1', status: 'PRESENT', marked_at: '2026-08-11T20:00:00Z', notes: 'Regular class' },
];

// In-Memory / Local Storage Store State
class TuitionRepository {
  private profile: Profile = INITIAL_PROFILE;
  private subjects: Subject[] = [...INITIAL_SUBJECTS];
  private students: Student[] = [...INITIAL_STUDENTS];
  private studentSubjects: StudentSubject[] = [...INITIAL_STUDENT_SUBJECTS];
  private schedules: RecurringSchedule[] = [...INITIAL_SCHEDULES];
  private classSessions: ClassSession[] = [...INITIAL_CLASSES];
  private notes: ClassNote[] = [...INITIAL_NOTES];
  private attendance: AttendanceRecord[] = [...INITIAL_ATTENDANCE];
  private billingProfiles: BillingProfile[] = [...INITIAL_BILLING_PROFILES];
  private billingRecords: BillingRecord[] = [...INITIAL_BILLING_RECORDS];
  private payments: Payment[] = [...INITIAL_PAYMENTS];
  private settings: AppSetting[] = [];

  constructor() {
    this.loadFromLocalStorage();
  }

  private saveToLocalStorage() {
    if (typeof window !== 'undefined') {
      try {
        const state = {
          profile: this.profile,
          subjects: this.subjects,
          students: this.students,
          studentSubjects: this.studentSubjects,
          schedules: this.schedules,
          classSessions: this.classSessions,
          notes: this.notes,
          attendance: this.attendance,
          billingProfiles: this.billingProfiles,
          billingRecords: this.billingRecords,
          payments: this.payments,
          settings: this.settings,
        };
        localStorage.setItem('tutorpulse_db_v1', JSON.stringify(state));
      } catch (e) {
        console.error('Error saving repository to localStorage:', e);
      }
    }
  }

  private loadFromLocalStorage() {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('tutorpulse_db_v1');
        if (raw) {
          const state = JSON.parse(raw);
          if (state.students && state.students.length > 0) {
            this.profile = state.profile || this.profile;
            this.subjects = state.subjects || this.subjects;
            this.students = state.students || this.students;
            this.studentSubjects = state.studentSubjects || this.studentSubjects;
            this.schedules = state.schedules || this.schedules;
            this.classSessions = state.classSessions || this.classSessions;
            this.notes = state.notes || this.notes;
            this.attendance = state.attendance || this.attendance;
            this.billingProfiles = state.billingProfiles || this.billingProfiles;
            this.billingRecords = state.billingRecords || this.billingRecords;
            this.payments = state.payments || this.payments;
            this.settings = state.settings || this.settings;
          }
        }
      } catch (e) {
        console.error('Error loading repository from localStorage:', e);
      }
    }
  }

  public resetToSeed() {
    this.profile = INITIAL_PROFILE;
    this.subjects = [...INITIAL_SUBJECTS];
    this.students = [...INITIAL_STUDENTS];
    this.studentSubjects = [...INITIAL_STUDENT_SUBJECTS];
    this.schedules = [...INITIAL_SCHEDULES];
    this.classSessions = [...INITIAL_CLASSES];
    this.notes = [...INITIAL_NOTES];
    this.attendance = [...INITIAL_ATTENDANCE];
    this.billingProfiles = [...INITIAL_BILLING_PROFILES];
    this.billingRecords = [...INITIAL_BILLING_RECORDS];
    this.payments = [...INITIAL_PAYMENTS];
    this.saveToLocalStorage();
  }

  // --- Profile ---
  public getProfile(): Profile {
    return this.profile;
  }

  public updateProfile(data: Partial<Profile>): Profile {
    this.profile = { ...this.profile, ...data, updated_at: new Date().toISOString() };
    this.saveToLocalStorage();
    return this.profile;
  }

  // --- Subjects ---
  public getSubjects(): Subject[] {
    return this.subjects;
  }

  public addSubject(name: string, description?: string): Subject {
    const newSubject: Subject = {
      id: `sub-${Date.now()}`,
      tutor_id: DEMO_TUTOR_ID,
      name,
      description,
      created_at: new Date().toISOString(),
    };
    this.subjects.push(newSubject);
    this.saveToLocalStorage();
    return newSubject;
  }

  public deleteSubject(id: string): boolean {
    this.subjects = this.subjects.filter((s) => s.id !== id);
    this.saveToLocalStorage();
    return true;
  }

  // --- Students ---
  public getStudents(statusFilter?: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | 'ALL'): EnrichedStudent[] {
    return this.students
      .filter((s) => {
        if (!statusFilter || statusFilter === 'ACTIVE') return s.status === 'ACTIVE';
        if (statusFilter === 'ALL') return true;
        return s.status === statusFilter;
      })
      .map((s) => this.enrichStudent(s));
  }

  public getStudentById(id: string): EnrichedStudent | null {
    const student = this.students.find((s) => s.id === id);
    if (!student) return null;
    return this.enrichStudent(student);
  }

  private enrichStudent(student: Student): EnrichedStudent {
    const subjectIds = this.studentSubjects
      .filter((ss) => ss.student_id === student.id)
      .map((ss) => ss.subject_id);
    const subjects = this.subjects.filter((sub) => subjectIds.includes(sub.id));
    const schedules = this.schedules.filter((sch) => sch.student_id === student.id && sch.active);
    const billingProfile = this.billingProfiles.find((bp) => bp.student_id === student.id && bp.active);

    const studentSessions = this.classSessions.filter((cs) => cs.student_id === student.id);
    const completedClasses = studentSessions.filter((cs) => cs.status === 'PRESENT');
    const totalHeld = studentSessions.filter((cs) => cs.status === 'PRESENT' || cs.status === 'ABSENT');
    const attendancePercentage = totalHeld.length > 0 ? Math.round((completedClasses.length / totalHeld.length) * 100) : 100;

    const invoices = this.billingRecords.filter((br) => br.student_id === student.id);
    const activeBalance = invoices.reduce((sum, inv) => sum + inv.balance, 0);

    const now = new Date().toISOString().slice(0, 10);
    const nextClass = studentSessions
      .filter((cs) => cs.status === 'UPCOMING' && cs.class_date >= now)
      .sort((a, b) => a.class_date.localeCompare(b.class_date) || a.scheduled_start.localeCompare(b.scheduled_start))[0];

    let batchProgress = undefined;
    if (billingProfile && billingProfile.billing_type === 'CLASS_BATCH') {
      const progress = calculateBatchProgress(billingProfile, completedClasses, invoices);
      batchProgress = {
        completed: progress.currentBatchCompleted,
        target: progress.targetBatchSize,
        percentage: Math.min(100, Math.round((progress.currentBatchCompleted / progress.targetBatchSize) * 100)),
        amount: progress.batchAmount,
      };
    }

    return {
      ...student,
      subjects,
      schedules,
      billing_profile: billingProfile,
      active_balance: activeBalance,
      completed_classes_count: completedClasses.length,
      total_classes_count: studentSessions.length,
      attendance_percentage: attendancePercentage,
      next_class: nextClass,
      batch_progress: batchProgress,
    };
  }

  public createStudent(data: {
    name: string;
    class_level: string;
    parent_name?: string;
    parent_phone?: string;
    student_phone?: string;
    email?: string;
    notes?: string;
    meet_url?: string;
    subject_ids: string[];
    schedules: { day_of_week: number; start_time: string; end_time: string; subject_id: string; meet_url?: string }[];
    billing: {
      billing_type: 'MONTHLY_FIXED' | 'MONTHLY_PER_CLASS' | 'CLASS_BATCH' | 'PER_CLASS';
      fixed_amount?: number;
      per_class_amount?: number;
      batch_size?: number;
      billing_day?: number;
      billing_cycle_start_day?: number;
      billing_cycle_end_day?: number;
    };
  }): EnrichedStudent {
    const studentId = `stud-${Date.now()}`;
    const newStudent: Student = {
      id: studentId,
      tutor_id: DEMO_TUTOR_ID,
      name: data.name,
      class_level: data.class_level,
      parent_name: data.parent_name,
      parent_phone: data.parent_phone,
      student_phone: data.student_phone,
      email: data.email,
      notes: data.notes,
      meet_url: data.meet_url,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.students.push(newStudent);

    // Link subjects
    for (const subId of data.subject_ids) {
      this.studentSubjects.push({
        id: `ss-${Date.now()}-${subId}`,
        student_id: studentId,
        subject_id: subId,
        created_at: new Date().toISOString(),
      });
    }

    // Add recurring schedules
    for (const sch of data.schedules) {
      this.schedules.push({
        id: `sch-${Date.now()}-${sch.day_of_week}`,
        student_id: studentId,
        subject_id: sch.subject_id,
        day_of_week: sch.day_of_week,
        start_time: sch.start_time,
        end_time: sch.end_time,
        effective_from: new Date().toISOString().slice(0, 10),
        meet_url: sch.meet_url || data.meet_url,
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    // Billing profile
    this.billingProfiles.push({
      id: `bp-${Date.now()}`,
      student_id: studentId,
      billing_type: data.billing.billing_type,
      fixed_amount: data.billing.fixed_amount,
      per_class_amount: data.billing.per_class_amount,
      batch_size: data.billing.batch_size,
      billing_day: data.billing.billing_day || 3,
      billing_cycle_start_day: data.billing.billing_cycle_start_day,
      billing_cycle_end_day: data.billing.billing_cycle_end_day,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    this.saveToLocalStorage();
    return this.enrichStudent(newStudent);
  }

  public updateStudent(id: string, data: Partial<Student>): EnrichedStudent | null {
    const idx = this.students.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    this.students[idx] = { ...this.students[idx], ...data, updated_at: new Date().toISOString() };
    this.saveToLocalStorage();
    return this.enrichStudent(this.students[idx]);
  }

  public archiveStudent(id: string): boolean {
    const student = this.students.find((s) => s.id === id);
    if (student) {
      student.status = student.status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED';
      student.updated_at = new Date().toISOString();
      this.saveToLocalStorage();
      return true;
    }
    return false;
  }

  public updateBillingProfile(studentId: string, data: Partial<BillingProfile>): BillingProfile | null {
    let profile = this.billingProfiles.find((bp) => bp.student_id === studentId && bp.active);
    if (profile) {
      Object.assign(profile, data, { updated_at: new Date().toISOString() });
    } else {
      profile = {
        id: `bp-${Date.now()}`,
        student_id: studentId,
        billing_type: data.billing_type || 'MONTHLY_FIXED',
        active: true,
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.billingProfiles.push(profile);
    }
    this.saveToLocalStorage();
    return profile;
  }

  // --- Schedules ---
  public getSchedules(studentId?: string): RecurringSchedule[] {
    if (studentId) {
      return this.schedules.filter((s) => s.student_id === studentId);
    }
    return this.schedules;
  }

  public addSchedule(data: Omit<RecurringSchedule, 'id' | 'created_at' | 'updated_at'>): RecurringSchedule {
    const newSchedule: RecurringSchedule = {
      ...data,
      id: `sch-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.schedules.push(newSchedule);
    this.saveToLocalStorage();
    return newSchedule;
  }

  public updateSchedule(id: string, data: Partial<RecurringSchedule>): RecurringSchedule | null {
    const sched = this.schedules.find((s) => s.id === id);
    if (!sched) return null;
    Object.assign(sched, data, { updated_at: new Date().toISOString() });
    this.saveToLocalStorage();
    return sched;
  }

  public deleteSchedule(id: string): boolean {
    this.schedules = this.schedules.filter((s) => s.id !== id);
    this.saveToLocalStorage();
    return true;
  }

  // --- Class Sessions ---
  public getClassSessions(filters?: {
    startDate?: string;
    endDate?: string;
    studentId?: string;
    subjectId?: string;
    status?: ClassSessionStatus;
  }): EnrichedClassSession[] {
    let sessions = [...this.classSessions];

    // If date range is requested, generate upcoming recurring instances dynamically
    if (filters?.startDate && filters?.endDate) {
      const start = parseISO(filters.startDate);
      const end = parseISO(filters.endDate);
      sessions = generateSessionsForRange(
        this.schedules,
        this.students,
        this.subjects,
        sessions,
        start,
        end
      );
    }

    if (filters?.studentId) {
      sessions = sessions.filter((s) => s.student_id === filters.studentId);
    }
    if (filters?.subjectId) {
      sessions = sessions.filter((s) => s.subject_id === filters.subjectId);
    }
    if (filters?.status) {
      sessions = sessions.filter((s) => s.status === filters.status);
    }

    return sessions
      .map((s) => this.enrichClassSession(s))
      .sort((a, b) => b.class_date.localeCompare(a.class_date) || a.scheduled_start.localeCompare(b.scheduled_start));
  }

  public getTodayClasses(todayDateStr?: string): EnrichedClassSession[] {
    const today = todayDateStr || new Date().toISOString().slice(0, 10);
    return this.getClassSessions({ startDate: today, endDate: today })
      .filter((s) => s.class_date === today)
      .sort((a, b) => a.scheduled_start.localeCompare(b.scheduled_start));
  }

  public getClassSessionById(id: string): EnrichedClassSession | null {
    const session = this.classSessions.find((s) => s.id === id);
    if (!session) return null;
    return this.enrichClassSession(session);
  }

  private enrichClassSession(session: ClassSession): EnrichedClassSession {
    const student = this.students.find((s) => s.id === session.student_id);
    const subject = this.subjects.find((s) => s.id === session.subject_id);
    const note = this.notes.find((n) => n.class_session_id === session.id);
    const attendance = this.attendance.find((a) => a.class_session_id === session.id);

    return {
      ...session,
      student_name: student ? student.name : 'Unknown Student',
      student_class: student ? student.class_level : '',
      student_phone: student?.student_phone,
      parent_name: student?.parent_name,
      parent_phone: student?.parent_phone,
      subject_name: subject ? subject.name : 'General',
      notes_record: note,
      attendance_record: attendance,
    };
  }

  // --- Live Timer & Class Completion ---
  public startClassTimer(sessionId: string): ClassSession {
    let session = this.classSessions.find((s) => s.id === sessionId);
    if (!session) {
      // If it was a generated instance, persist it
      const enriched = this.getClassSessionById(sessionId);
      if (enriched) {
        session = { ...enriched };
        this.classSessions.push(session);
      } else {
        throw new Error('Class session not found');
      }
    }

    session.actual_start = new Date().toISOString();
    session.updated_at = new Date().toISOString();
    this.saveToLocalStorage();
    return session;
  }

  public endClassTimer(sessionId: string): { session: ClassSession; durationMinutes: number } {
    const session = this.classSessions.find((s) => s.id === sessionId);
    if (!session || !session.actual_start) {
      throw new Error('Class has not been started');
    }

    session.actual_end = new Date().toISOString();
    const startTime = new Date(session.actual_start).getTime();
    const endTime = new Date(session.actual_end).getTime();
    const duration = Math.max(1, Math.round((endTime - startTime) / (1000 * 60)));
    session.actual_duration_minutes = duration;
    session.updated_at = new Date().toISOString();

    this.saveToLocalStorage();
    return { session, durationMinutes: duration };
  }

  public completeClass(data: {
    sessionId: string;
    studentId: string;
    subjectId: string;
    status: ClassSessionStatus;
    actualDurationMinutes?: number;
    topic?: string;
    subtopic?: string;
    homework?: string;
    notes?: string;
  }): { session: ClassSession; invoiceGenerated?: BillingRecord } {
    let session = this.classSessions.find((s) => s.id === data.sessionId);
    if (!session) {
      const enriched = this.getClassSessionById(data.sessionId);
      if (enriched) {
        session = { ...enriched };
        this.classSessions.push(session);
      } else {
        throw new Error('Session not found');
      }
    }

    session.status = data.status;
    if (data.actualDurationMinutes) {
      session.actual_duration_minutes = data.actualDurationMinutes;
    }
    session.updated_at = new Date().toISOString();

    // Attendance record
    if (data.status === 'PRESENT' || data.status === 'ABSENT') {
      const existingAtt = this.attendance.find((a) => a.class_session_id === session!.id);
      if (existingAtt) {
        existingAtt.status = data.status;
        existingAtt.notes = data.notes;
        existingAtt.marked_at = new Date().toISOString();
      } else {
        this.attendance.push({
          id: `att-${Date.now()}`,
          class_session_id: session.id,
          student_id: data.studentId,
          status: data.status,
          marked_at: new Date().toISOString(),
          notes: data.notes,
        });
      }
    }

    // Class Notes / Homework record
    if (data.topic || data.subtopic || data.homework || data.notes) {
      const existingNote = this.notes.find((n) => n.class_session_id === session!.id);
      if (existingNote) {
        existingNote.topic = data.topic;
        existingNote.subtopic = data.subtopic;
        existingNote.homework = data.homework;
        existingNote.notes = data.notes;
        existingNote.updated_at = new Date().toISOString();
      } else {
        this.notes.push({
          id: `note-${Date.now()}`,
          class_session_id: session.id,
          student_id: data.studentId,
          subject_id: data.subjectId,
          topic: data.topic,
          subtopic: data.subtopic,
          homework: data.homework,
          notes: data.notes,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }

    // Auto Billing Evaluation Check (e.g. Sreesha 8th class trigger)
    let invoiceGenerated: BillingRecord | undefined;
    const billingProfile = this.billingProfiles.find((bp) => bp.student_id === data.studentId && bp.active);
    if (billingProfile && data.status === 'PRESENT') {
      const evalResult = evaluateBilling(
        data.studentId,
        billingProfile,
        this.classSessions,
        this.billingRecords
      );
      if (evalResult.shouldGenerateInvoice && evalResult.newInvoice) {
        invoiceGenerated = {
          id: `inv-${Date.now()}`,
          ...evalResult.newInvoice,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        this.billingRecords.push(invoiceGenerated);
      }
    }

    this.saveToLocalStorage();
    return { session, invoiceGenerated };
  }

  // --- Rescheduling & Cancelling ---
  public rescheduleClass(
    sessionId: string,
    newDate: string,
    newStartTime: string,
    newEndTime: string,
    customMeetUrl?: string
  ): { originalSession: ClassSession; newSession: ClassSession } {
    let session = this.classSessions.find((s) => s.id === sessionId);
    if (!session) {
      const enriched = this.getClassSessionById(sessionId);
      if (enriched) {
        session = { ...enriched };
        this.classSessions.push(session);
      } else {
        throw new Error('Session not found');
      }
    }

    const { updatedOriginal, newSession } = rescheduleSingleSession(
      session,
      newDate,
      newStartTime,
      newEndTime,
      customMeetUrl
    );

    Object.assign(session, updatedOriginal);
    this.classSessions.push(newSession);
    this.saveToLocalStorage();

    return { originalSession: session, newSession };
  }

  public cancelClass(sessionId: string, reason?: string): ClassSession {
    let session = this.classSessions.find((s) => s.id === sessionId);
    if (!session) {
      const enriched = this.getClassSessionById(sessionId);
      if (enriched) {
        session = { ...enriched };
        this.classSessions.push(session);
      } else {
        throw new Error('Session not found');
      }
    }

    session.status = 'CANCELLED';
    session.updated_at = new Date().toISOString();

    if (reason) {
      this.notes.push({
        id: `note-${Date.now()}`,
        class_session_id: session.id,
        student_id: session.student_id,
        subject_id: session.subject_id,
        notes: `Class Cancelled: ${reason}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    this.saveToLocalStorage();
    return session;
  }

  // --- Billing Records & Invoices ---
  public getBillingRecords(filters?: {
    studentId?: string;
    status?: string;
    month?: string; // YYYY-MM
  }): EnrichedBillingRecord[] {
    let records = [...this.billingRecords];

    if (filters?.studentId) {
      records = records.filter((r) => r.student_id === filters.studentId);
    }
    if (filters?.status && filters.status !== 'ALL') {
      records = records.filter((r) => r.status === filters.status);
    }
    if (filters?.month) {
      records = records.filter((r) => r.due_date.startsWith(filters.month!));
    }

    return records
      .map((r) => {
        const student = this.students.find((s) => s.id === r.student_id);
        const payments = this.payments.filter((p) => p.billing_record_id === r.id);
        return {
          ...r,
          student_name: student ? student.name : 'Unknown',
          student_class: student ? student.class_level : '',
          payments,
        };
      })
      .sort((a, b) => b.due_date.localeCompare(a.due_date));
  }

  public createBillingRecord(data: Omit<BillingRecord, 'id' | 'created_at' | 'updated_at'>): BillingRecord {
    const newRecord: BillingRecord = {
      ...data,
      id: `inv-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.billingRecords.push(newRecord);
    this.saveToLocalStorage();
    return newRecord;
  }

  // --- Payments ---
  public getPayments(studentId?: string): Payment[] {
    if (studentId) {
      return this.payments.filter((p) => p.student_id === studentId);
    }
    return this.payments.sort((a, b) => b.payment_date.localeCompare(a.payment_date));
  }

  public recordPayment(data: {
    student_id: string;
    billing_record_id?: string;
    amount: number;
    payment_date: string;
    payment_method: PaymentMethod;
    notes?: string;
  }): { payment: Payment; updatedInvoice?: BillingRecord } {
    if (data.amount <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }

    const payment: Payment = {
      id: `pay-${Date.now()}`,
      student_id: data.student_id,
      billing_record_id: data.billing_record_id,
      amount: data.amount,
      payment_date: data.payment_date,
      payment_method: data.payment_method,
      notes: data.notes,
      created_at: new Date().toISOString(),
    };

    this.payments.push(payment);

    let updatedInvoice: BillingRecord | undefined;
    if (data.billing_record_id) {
      const invoice = this.billingRecords.find((r) => r.id === data.billing_record_id);
      if (invoice) {
        const { updatedInvoice: updated } = applyPaymentToInvoice(invoice, data.amount);
        Object.assign(invoice, updated);
        updatedInvoice = invoice;
      }
    } else {
      // Auto-apply to oldest pending invoice for this student
      const pendingInvoices = this.billingRecords
        .filter((r) => r.student_id === data.student_id && r.balance > 0)
        .sort((a, b) => a.due_date.localeCompare(b.due_date));

      let remaining = data.amount;
      for (const inv of pendingInvoices) {
        if (remaining <= 0) break;
        const toApply = Math.min(inv.balance, remaining);
        const { updatedInvoice: updated } = applyPaymentToInvoice(inv, toApply);
        Object.assign(inv, updated);
        remaining -= toApply;
        updatedInvoice = inv;
      }
    }

    this.saveToLocalStorage();
    return { payment, updatedInvoice };
  }

  // --- Reports & Analytics ---
  public getMonthlyReport(monthStr: string = '2026-08'): MonthlyReportSummary {
    const [yearStr, mStr] = monthStr.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(mStr, 10) - 1;

    const start = startOfMonth(new Date(year, month, 1));
    const end = endOfMonth(new Date(year, month, 1));
    const startIso = format(start, 'yyyy-MM-dd');
    const endIso = format(end, 'yyyy-MM-dd');

    const sessions = this.getClassSessions({ startDate: startIso, endDate: endIso })
      .filter((s) => s.class_date >= startIso && s.class_date <= endIso);

    const completed = sessions.filter((s) => s.status === 'PRESENT');
    const absent = sessions.filter((s) => s.status === 'ABSENT');
    const cancelled = sessions.filter((s) => s.status === 'CANCELLED');
    const rescheduled = sessions.filter((s) => s.status === 'RESCHEDULED');

    let totalDurationMinutes = 0;
    completed.forEach((s) => {
      totalDurationMinutes += s.actual_duration_minutes || 60;
    });

    const activeStudents = this.students.filter((s) => s.status === 'ACTIVE');

    const invoices = this.billingRecords.filter((inv) => inv.due_date.startsWith(monthStr));
    const payments = this.payments.filter((p) => p.payment_date.startsWith(monthStr));

    const expectedFees = invoices.reduce((sum, inv) => sum + inv.amount_due, 0);
    const receivedFees = payments.reduce((sum, p) => sum + p.amount, 0);
    const pendingFees = Math.max(0, expectedFees - receivedFees);

    const totalHeld = completed.length + absent.length;
    const attendanceRate = totalHeld > 0 ? Math.round((completed.length / totalHeld) * 100) : 100;

    const studentBreakdown = activeStudents.map((st) => {
      const stSessions = sessions.filter((s) => s.student_id === st.id);
      const stCompleted = stSessions.filter((s) => s.status === 'PRESENT');
      const stAbsent = stSessions.filter((s) => s.status === 'ABSENT');
      const stSubjNames = this.studentSubjects
        .filter((ss) => ss.student_id === st.id)
        .map((ss) => this.subjects.find((sub) => sub.id === ss.subject_id)?.name || '');

      let stMinutes = 0;
      stCompleted.forEach((s) => {
        stMinutes += s.actual_duration_minutes || 60;
      });

      const stProfile = this.billingProfiles.find((bp) => bp.student_id === st.id);
      const stInvoices = invoices.filter((inv) => inv.student_id === st.id);
      const stDue = stInvoices.reduce((sum, inv) => sum + inv.amount_due, 0);
      const stPaid = payments.filter((p) => p.student_id === st.id).reduce((sum, p) => sum + p.amount, 0);

      return {
        student_id: st.id,
        student_name: st.name,
        class_level: st.class_level,
        subjects: stSubjNames.filter(Boolean),
        classes_held: stSessions.length,
        attended: stCompleted.length,
        absent: stAbsent.length,
        teaching_hours: formatDuration(stMinutes),
        billing_type: stProfile?.billing_type || 'MONTHLY_FIXED',
        amount_due: stDue,
        amount_paid: stPaid,
        balance: Math.max(0, stDue - stPaid),
      };
    });

    return {
      month: monthStr,
      month_label: format(start, 'MMMM yyyy'),
      total_students: activeStudents.length,
      total_classes: sessions.length,
      completed_classes: completed.length,
      absent_classes: absent.length,
      cancelled_classes: cancelled.length,
      rescheduled_classes: rescheduled.length,
      total_teaching_minutes: totalDurationMinutes,
      total_teaching_hours: formatDuration(totalDurationMinutes),
      attendance_rate: attendanceRate,
      expected_fees: expectedFees,
      received_fees: receivedFees,
      pending_fees: pendingFees,
      student_breakdown: studentBreakdown,
    };
  }

  // --- Smart Dashboard Insights ---
  public getDashboardInsights(): {
    busiestDay: string;
    monthlyAttendanceRate: number;
    totalTeachingHoursThisMonth: string;
    alerts: { message: string; severity: 'info' | 'warning' | 'danger' | 'success'; studentId?: string }[];
  } {
    const report = this.getMonthlyReport('2026-08');
    const alerts: { message: string; severity: 'info' | 'warning' | 'danger' | 'success'; studentId?: string }[] = [];

    // Check Sreesha Batch
    const sreesha = this.students.find((s) => s.name === 'Sreesha');
    if (sreesha) {
      const enriched = this.enrichStudent(sreesha);
      if (enriched.batch_progress) {
        if (enriched.batch_progress.completed === enriched.batch_progress.target - 1) {
          alerts.push({
            message: `Sreesha has completed ${enriched.batch_progress.completed}/${enriched.batch_progress.target} classes. Next class will trigger a ₹${enriched.batch_progress.amount.toLocaleString('en-IN')} fee.`,
            severity: 'info',
            studentId: sreesha.id,
          });
        }
      }
    }

    // Check Siva fee due
    const siva = this.students.find((s) => s.name === 'Siva');
    if (siva) {
      const sivaInvoices = this.billingRecords.filter((r) => r.student_id === siva.id && r.balance > 0);
      sivaInvoices.forEach((inv) => {
        alerts.push({
          message: `Siva's ₹${inv.balance.toLocaleString('en-IN')} fee is due on ${format(parseISO(inv.due_date), 'dd MMM')}.`,
          severity: 'warning',
          studentId: siva.id,
        });
      });
    }

    // Check pending balance
    const totalPending = this.billingRecords.reduce((sum, inv) => sum + inv.balance, 0);
    if (totalPending > 0) {
      alerts.push({
        message: `₹${totalPending.toLocaleString('en-IN')} total tuition fees pending collection.`,
        severity: 'warning',
      });
    }

    return {
      busiestDay: 'Saturday (4 classes)',
      monthlyAttendanceRate: report.attendance_rate,
      totalTeachingHoursThisMonth: report.total_teaching_hours,
      alerts,
    };
  }
}

// Singleton export
export const repository = new TuitionRepository();
