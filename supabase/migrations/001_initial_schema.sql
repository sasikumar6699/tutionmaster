-- Migration: 001_initial_schema.sql
-- Description: Core schema for Scalable Smart Tuition Management Application (TutorPulse)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES (Tutors/Admins)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL, -- references auth.users(id)
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  timezone TEXT DEFAULT 'Asia/Kolkata',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SUBJECTS
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tutor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. STUDENTS
CREATE TYPE student_status_enum AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tutor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  class_level TEXT NOT NULL,
  parent_name TEXT,
  parent_phone TEXT,
  student_phone TEXT,
  email TEXT,
  notes TEXT,
  meet_url TEXT,
  status student_status_enum DEFAULT 'ACTIVE' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. STUDENT_SUBJECTS (Many-to-Many)
CREATE TABLE IF NOT EXISTS student_subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, subject_id)
);

-- 5. RECURRING_SCHEDULES
CREATE TABLE IF NOT EXISTS recurring_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_until DATE,
  meet_url TEXT,
  active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. CLASS_SESSIONS
CREATE TYPE class_session_status_enum AS ENUM ('UPCOMING', 'PRESENT', 'ABSENT', 'RESCHEDULED', 'CANCELLED');

CREATE TABLE IF NOT EXISTS class_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES recurring_schedules(id) ON DELETE SET NULL,
  class_date DATE NOT NULL,
  scheduled_start TIME NOT NULL,
  scheduled_end TIME NOT NULL,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  actual_duration_minutes INTEGER,
  status class_session_status_enum DEFAULT 'UPCOMING' NOT NULL,
  meet_url TEXT,
  rescheduled_from_id UUID REFERENCES class_sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ATTENDANCE
CREATE TYPE attendance_status_enum AS ENUM ('PRESENT', 'ABSENT');

CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_session_id UUID UNIQUE NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status attendance_status_enum NOT NULL,
  marked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  notes TEXT
);

-- 8. CLASS_NOTES
CREATE TABLE IF NOT EXISTS class_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_session_id UUID UNIQUE NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  topic TEXT,
  subtopic TEXT,
  homework TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. BILLING_PROFILES
CREATE TYPE billing_type_enum AS ENUM ('MONTHLY_FIXED', 'MONTHLY_PER_CLASS', 'CLASS_BATCH', 'PER_CLASS');

CREATE TABLE IF NOT EXISTS billing_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID UNIQUE NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  billing_type billing_type_enum NOT NULL,
  fixed_amount NUMERIC(10, 2) CHECK (fixed_amount IS NULL OR fixed_amount >= 0),
  per_class_amount NUMERIC(10, 2) CHECK (per_class_amount IS NULL OR per_class_amount >= 0),
  batch_size INTEGER CHECK (batch_size IS NULL OR batch_size > 0),
  billing_day SMALLINT CHECK (billing_day IS NULL OR (billing_day BETWEEN 1 AND 31)),
  billing_cycle_start_day SMALLINT CHECK (billing_cycle_start_day IS NULL OR (billing_cycle_start_day BETWEEN 1 AND 31)),
  billing_cycle_end_day SMALLINT CHECK (billing_cycle_end_day IS NULL OR (billing_cycle_end_day BETWEEN 1 AND 31)),
  active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. BILLING_RECORDS (Invoices)
CREATE TYPE billing_record_status_enum AS ENUM ('PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE');

CREATE TABLE IF NOT EXISTS billing_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  billing_profile_id UUID REFERENCES billing_profiles(id) ON DELETE SET NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  billing_type billing_type_enum NOT NULL,
  classes_count INTEGER DEFAULT 0 NOT NULL,
  rate NUMERIC(10, 2),
  amount_due NUMERIC(10, 2) NOT NULL CHECK (amount_due >= 0),
  amount_received NUMERIC(10, 2) DEFAULT 0 NOT NULL CHECK (amount_received >= 0),
  balance NUMERIC(10, 2) NOT NULL,
  status billing_record_status_enum DEFAULT 'PENDING' NOT NULL,
  due_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. PAYMENTS
CREATE TYPE payment_method_enum AS ENUM ('CASH', 'UPI', 'BANK_TRANSFER', 'OTHER');

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  billing_record_id UUID REFERENCES billing_records(id) ON DELETE SET NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method payment_method_enum DEFAULT 'CASH' NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. APP_SETTINGS
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tutor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  setting_key TEXT NOT NULL,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tutor_id, setting_key)
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_students_tutor_id ON students(tutor_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_subjects_tutor_id ON subjects(tutor_id);
CREATE INDEX IF NOT EXISTS idx_recurring_schedules_student_id ON recurring_schedules(student_id);
CREATE INDEX IF NOT EXISTS idx_recurring_schedules_day ON recurring_schedules(day_of_week);
CREATE INDEX IF NOT EXISTS idx_class_sessions_student_id ON class_sessions(student_id);
CREATE INDEX IF NOT EXISTS idx_class_sessions_date ON class_sessions(class_date);
CREATE INDEX IF NOT EXISTS idx_class_sessions_status ON class_sessions(status);
CREATE INDEX IF NOT EXISTS idx_billing_records_student_id ON billing_records(student_id);
CREATE INDEX IF NOT EXISTS idx_billing_records_due_date ON billing_records(due_date);
CREATE INDEX IF NOT EXISTS idx_billing_records_status ON billing_records(status);
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Helper function to get current profile ID
CREATE OR REPLACE FUNCTION get_current_profile_id()
RETURNS UUID AS $$
  SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Profiles: Users can view and update their own profile
CREATE POLICY "Tutors manage own profile" ON profiles
  FOR ALL USING (auth.uid() = user_id);

-- Subjects: Tutors manage own subjects
CREATE POLICY "Tutors manage own subjects" ON subjects
  FOR ALL USING (tutor_id = get_current_profile_id());

-- Students: Tutors manage own students
CREATE POLICY "Tutors manage own students" ON students
  FOR ALL USING (tutor_id = get_current_profile_id());

-- Student Subjects
CREATE POLICY "Tutors manage student subjects" ON student_subjects
  FOR ALL USING (
    EXISTS (SELECT 1 FROM students s WHERE s.id = student_subjects.student_id AND s.tutor_id = get_current_profile_id())
  );

-- Recurring Schedules
CREATE POLICY "Tutors manage recurring schedules" ON recurring_schedules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM students s WHERE s.id = recurring_schedules.student_id AND s.tutor_id = get_current_profile_id())
  );

-- Class Sessions
CREATE POLICY "Tutors manage class sessions" ON class_sessions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM students s WHERE s.id = class_sessions.student_id AND s.tutor_id = get_current_profile_id())
  );

-- Attendance
CREATE POLICY "Tutors manage attendance" ON attendance
  FOR ALL USING (
    EXISTS (SELECT 1 FROM students s WHERE s.id = attendance.student_id AND s.tutor_id = get_current_profile_id())
  );

-- Class Notes
CREATE POLICY "Tutors manage class notes" ON class_notes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM students s WHERE s.id = class_notes.student_id AND s.tutor_id = get_current_profile_id())
  );

-- Billing Profiles
CREATE POLICY "Tutors manage billing profiles" ON billing_profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM students s WHERE s.id = billing_profiles.student_id AND s.tutor_id = get_current_profile_id())
  );

-- Billing Records
CREATE POLICY "Tutors manage billing records" ON billing_records
  FOR ALL USING (
    EXISTS (SELECT 1 FROM students s WHERE s.id = billing_records.student_id AND s.tutor_id = get_current_profile_id())
  );

-- Payments
CREATE POLICY "Tutors manage payments" ON payments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM students s WHERE s.id = payments.student_id AND s.tutor_id = get_current_profile_id())
  );

-- App Settings
CREATE POLICY "Tutors manage settings" ON app_settings
  FOR ALL USING (tutor_id = get_current_profile_id());
