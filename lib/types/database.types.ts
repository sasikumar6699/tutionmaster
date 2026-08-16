export type StudentStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type ClassSessionStatus = 'UPCOMING' | 'PRESENT' | 'ABSENT' | 'RESCHEDULED' | 'CANCELLED';
export type AttendanceStatus = 'PRESENT' | 'ABSENT';
export type BillingType = 'MONTHLY_FIXED' | 'MONTHLY_PER_CLASS' | 'CLASS_BATCH' | 'PER_CLASS';
export type BillingRecordStatus = 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';
export type PaymentMethod = 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'OTHER';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  tutor_id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface Student {
  id: string;
  tutor_id: string;
  name: string;
  class_level: string;
  parent_name?: string;
  parent_phone?: string;
  student_phone?: string;
  email?: string;
  notes?: string;
  meet_url?: string;
  status: StudentStatus;
  created_at: string;
  updated_at: string;
}

export interface StudentSubject {
  id: string;
  student_id: string;
  subject_id: string;
  created_at: string;
}

export interface RecurringSchedule {
  id: string;
  student_id: string;
  subject_id: string;
  day_of_week: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  start_time: string; // "19:00" (HH:mm)
  end_time: string;   // "20:00" (HH:mm)
  effective_from: string; // YYYY-MM-DD
  effective_until?: string; // YYYY-MM-DD
  meet_url?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClassSession {
  id: string;
  student_id: string;
  subject_id: string;
  schedule_id?: string;
  class_date: string; // YYYY-MM-DD
  scheduled_start: string; // "19:00"
  scheduled_end: string;   // "20:00"
  actual_start?: string;   // ISO string or HH:mm:ss
  actual_end?: string;     // ISO string or HH:mm:ss
  actual_duration_minutes?: number;
  status: ClassSessionStatus;
  meet_url?: string;
  rescheduled_from_id?: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRecord {
  id: string;
  class_session_id: string;
  student_id: string;
  status: AttendanceStatus;
  marked_at: string;
  notes?: string;
}

export interface ClassNote {
  id: string;
  class_session_id: string;
  student_id: string;
  subject_id: string;
  topic?: string;
  subtopic?: string;
  homework?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface BillingProfile {
  id: string;
  student_id: string;
  billing_type: BillingType;
  fixed_amount?: number;
  per_class_amount?: number;
  batch_size?: number; // e.g. 8 for Sreesha
  billing_day?: number; // Day of month when due (e.g. 3)
  billing_cycle_start_day?: number; // e.g. 3 for Siva (3rd to 2nd)
  billing_cycle_end_day?: number;   // e.g. 2 for Siva
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BillingRecord {
  id: string;
  student_id: string;
  billing_profile_id?: string;
  period_start: string; // YYYY-MM-DD
  period_end: string;   // YYYY-MM-DD
  billing_type: BillingType;
  classes_count: number;
  rate?: number;
  amount_due: number;
  amount_received: number;
  balance: number;
  status: BillingRecordStatus;
  due_date: string; // YYYY-MM-DD
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  student_id: string;
  billing_record_id?: string;
  amount: number;
  payment_date: string; // YYYY-MM-DD
  payment_method: PaymentMethod;
  notes?: string;
  created_at: string;
}

export interface AppSetting {
  id: string;
  tutor_id: string;
  setting_key: string;
  setting_value: string;
  created_at: string;
  updated_at: string;
}

// Joined types for UI presentation
export interface EnrichedClassSession extends ClassSession {
  student_name: string;
  student_class: string;
  student_phone?: string;
  parent_name?: string;
  parent_phone?: string;
  subject_name: string;
  student?: Student;
  subject?: Subject;
  notes_record?: ClassNote;
  attendance_record?: AttendanceRecord;
}

export interface EnrichedStudent extends Student {
  subjects: Subject[];
  schedules: RecurringSchedule[];
  billing_profile?: BillingProfile;
  billing?: BillingProfile;
  active_balance: number;
  completed_classes_count?: number;
  total_classes_count?: number;
  attendance_percentage?: number;
  next_class?: ClassSession;
  batch_progress?: any;
  class_sessions?: any[];
  billing_records?: any[];
  payments?: any[];
}

export interface EnrichedBillingRecord extends BillingRecord {
  student_name: string;
  student_class: string;
  student?: Student;
  payments?: Payment[];
}

export interface MonthlyReportSummary {
  month: string; // "YYYY-MM"
  month_label: string; // "August 2026"
  total_students: number;
  total_classes: number;
  completed_classes: number;
  absent_classes: number;
  cancelled_classes: number;
  rescheduled_classes: number;
  total_teaching_minutes: number;
  total_teaching_hours: string;
  attendance_rate: number;
  expected_fees: number;
  received_fees: number;
  pending_fees: number;
  student_breakdown: {
    student_id: string;
    student_name: string;
    class_level: string;
    subjects: string[];
    classes_held: number;
    attended: number;
    absent: number;
    teaching_hours: string;
    billing_type: BillingType;
    amount_due: number;
    amount_paid: number;
    balance: number;
  }[];
}
