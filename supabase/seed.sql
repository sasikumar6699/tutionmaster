-- Seed Data for Scalable Smart Tuition Management (TutorPulse)
-- Note: These 3 students are initial seed records, fully data-driven.

DO $$
DECLARE
  v_tutor_id UUID := '00000000-0000-0000-0000-000000000001';
  v_subj_maths UUID := '10000000-0000-0000-0000-000000000001';
  v_subj_physics UUID := '10000000-0000-0000-0000-000000000002';
  v_subj_chem UUID := '10000000-0000-0000-0000-000000000003';
  v_subj_bio UUID := '10000000-0000-0000-0000-000000000004';
  v_subj_eng UUID := '10000000-0000-0000-0000-000000000005';

  v_student_sreesha UUID := '20000000-0000-0000-0000-000000000001';
  v_student_siva UUID := '20000000-0000-0000-0000-000000000002';
  v_student_mrithika UUID := '20000000-0000-0000-0000-000000000003';

  v_sched_sreesha_mon UUID := '30000000-0000-0000-0000-000000000001';
  v_sched_sreesha_tue UUID := '30000000-0000-0000-0000-000000000002';

  v_sched_siva_wed UUID := '30000000-0000-0000-0000-000000000003';
  v_sched_siva_thu UUID := '30000000-0000-0000-0000-000000000004';
  v_sched_siva_fri UUID := '30000000-0000-0000-0000-000000000005';
  v_sched_siva_sat UUID := '30000000-0000-0000-0000-000000000006';

  v_sched_mrithika_mon UUID := '30000000-0000-0000-0000-000000000007';
  v_sched_mrithika_tue UUID := '30000000-0000-0000-0000-000000000008';

  v_bill_sreesha UUID := '40000000-0000-0000-0000-000000000001';
  v_bill_siva UUID := '40000000-0000-0000-0000-000000000002';
  v_bill_mrithika UUID := '40000000-0000-0000-0000-000000000003';

  v_inv_siva_prev UUID := '50000000-0000-0000-0000-000000000001';
  v_inv_siva_curr UUID := '50000000-0000-0000-0000-000000000002';
  v_inv_mrithika_prev UUID := '50000000-0000-0000-0000-000000000003';
BEGIN

  -- 1. Create Default Profile
  INSERT INTO profiles (id, user_id, full_name, email, phone, timezone)
  VALUES (v_tutor_id, '00000000-0000-0000-0000-000000000001', 'SN', 'tutor@tutorpulse.io', '+91 98765 43210', 'Asia/Kolkata')
  ON CONFLICT (id) DO NOTHING;

  -- 2. Subjects
  INSERT INTO subjects (id, tutor_id, name, description)
  VALUES
    (v_subj_maths, v_tutor_id, 'Maths', 'Advanced & Core Mathematics'),
    (v_subj_physics, v_tutor_id, 'Physics', 'Mechanics, Electromagnetism, & Optics'),
    (v_subj_chem, v_tutor_id, 'Chemistry', 'Organic, Inorganic & Physical Chemistry'),
    (v_subj_bio, v_tutor_id, 'Biology', 'Botany and Zoology'),
    (v_subj_eng, v_tutor_id, 'English', 'Grammar, Literature & Composition')
  ON CONFLICT (id) DO NOTHING;

  -- 3. Students
  INSERT INTO students (id, tutor_id, name, class_level, parent_name, parent_phone, student_phone, email, notes, meet_url, status)
  VALUES
    (v_student_sreesha, v_tutor_id, 'Sreesha', 'Class 8', 'Ramesh Kumar', '+91 98401 23456', '+91 98401 23457', 'sreesha.parent@gmail.com', 'Focus on algebraic factorization and linear geometry', 'https://meet.google.com/bwb-gduo-ukn', 'ACTIVE'),
    (v_student_siva, v_tutor_id, 'Siva', 'Class 16', 'Dr. Sundaram', '+91 98402 34567', '+91 98402 34568', 'siva.prep@gmail.com', 'Competitive physics numericals and calculus integration', 'https://meet.google.com/sht-cfst-qai', 'ACTIVE'),
    (v_student_mrithika, v_tutor_id, 'Mrithika', 'Class 8', 'Priya Lakshmi', '+91 98403 45678', '+91 98403 45679', 'mrithika.maths@gmail.com', 'Quick learner, needs thorough revision on word problems', 'https://meet.google.com/sht-cfst-qai', 'ACTIVE')
  ON CONFLICT (id) DO NOTHING;

  -- 4. Student Subjects
  INSERT INTO student_subjects (student_id, subject_id)
  VALUES
    (v_student_sreesha, v_subj_maths),
    (v_student_siva, v_subj_maths),
    (v_student_siva, v_subj_physics),
    (v_student_mrithika, v_subj_maths)
  ON CONFLICT DO NOTHING;

  -- 5. Recurring Schedules
  -- Sreesha: Mon 7-8 PM, Tue 7-8 PM
  INSERT INTO recurring_schedules (id, student_id, subject_id, day_of_week, start_time, end_time, effective_from, meet_url, active)
  VALUES
    (v_sched_sreesha_mon, v_student_sreesha, v_subj_maths, 1, '19:00', '20:00', '2026-07-01', 'https://meet.google.com/bwb-gduo-ukn', TRUE),
    (v_sched_sreesha_tue, v_student_sreesha, v_subj_maths, 2, '19:00', '20:00', '2026-07-01', 'https://meet.google.com/bwb-gduo-ukn', TRUE)
  ON CONFLICT (id) DO NOTHING;

  -- Siva: Wed 7-8 PM, Thu 7-8 PM, Fri 7-8 PM, Sat 7-8 PM
  INSERT INTO recurring_schedules (id, student_id, subject_id, day_of_week, start_time, end_time, effective_from, meet_url, active)
  VALUES
    (v_sched_siva_wed, v_student_siva, v_subj_maths, 3, '19:00', '20:00', '2026-07-01', 'https://meet.google.com/sht-cfst-qai', TRUE),
    (v_sched_siva_thu, v_student_siva, v_subj_physics, 4, '19:00', '20:00', '2026-07-01', 'https://meet.google.com/sht-cfst-qai', TRUE),
    (v_sched_siva_fri, v_student_siva, v_subj_maths, 5, '19:00', '20:00', '2026-07-01', 'https://meet.google.com/sht-cfst-qai', TRUE),
    (v_sched_siva_sat, v_student_siva, v_subj_physics, 6, '19:00', '20:00', '2026-07-01', 'https://meet.google.com/sht-cfst-qai', TRUE)
  ON CONFLICT (id) DO NOTHING;

  -- Mrithika: Mon 8-9 PM, Tue 8-9 PM
  INSERT INTO recurring_schedules (id, student_id, subject_id, day_of_week, start_time, end_time, effective_from, meet_url, active)
  VALUES
    (v_sched_mrithika_mon, v_student_mrithika, v_subj_maths, 1, '20:00', '21:00', '2026-07-01', 'https://meet.google.com/sht-cfst-qai', TRUE),
    (v_sched_mrithika_tue, v_student_mrithika, v_subj_maths, 2, '20:00', '21:00', '2026-07-01', 'https://meet.google.com/sht-cfst-qai', TRUE)
  ON CONFLICT (id) DO NOTHING;

  -- 6. Billing Profiles
  -- Sreesha: CLASS_BATCH (8 classes, ₹6,750)
  INSERT INTO billing_profiles (id, student_id, billing_type, batch_size, fixed_amount, active)
  VALUES (v_bill_sreesha, v_student_sreesha, 'CLASS_BATCH', 8, 6750.00, TRUE)
  ON CONFLICT (id) DO NOTHING;

  -- Siva: MONTHLY_FIXED (₹8,500, cycle 3rd to 2nd, due 3rd)
  INSERT INTO billing_profiles (id, student_id, billing_type, fixed_amount, billing_day, billing_cycle_start_day, billing_cycle_end_day, active)
  VALUES (v_bill_siva, v_student_siva, 'MONTHLY_FIXED', 8500.00, 3, 3, 2, TRUE)
  ON CONFLICT (id) DO NOTHING;

  -- Mrithika: MONTHLY_PER_CLASS (configurable per class fee e.g. ₹388.88, monthly reference ₹3,111, due 3rd)
  INSERT INTO billing_profiles (id, student_id, billing_type, per_class_amount, fixed_amount, billing_day, active)
  VALUES (v_bill_mrithika, v_student_mrithika, 'MONTHLY_PER_CLASS', 388.88, 3111.00, 3, TRUE)
  ON CONFLICT (id) DO NOTHING;

  -- 7. Previous Invoices & Payments for Siva
  -- July 3 to Aug 2 (Paid)
  INSERT INTO billing_records (id, student_id, billing_profile_id, period_start, period_end, billing_type, classes_count, rate, amount_due, amount_received, balance, status, due_date)
  VALUES (v_inv_siva_prev, v_student_siva, v_bill_siva, '2026-07-03', '2026-08-02', 'MONTHLY_FIXED', 16, 8500.00, 8500.00, 8500.00, 0.00, 'PAID', '2026-07-03')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO payments (id, student_id, billing_record_id, amount, payment_date, payment_method, notes)
  VALUES ('60000000-0000-0000-0000-000000000001', v_student_siva, v_inv_siva_prev, 8500.00, '2026-07-05', 'CASH', 'Full payment received for July 3 - Aug 2 cycle')
  ON CONFLICT (id) DO NOTHING;

  -- Current cycle: Aug 3 to Sep 2 (Pending ₹8,500 due on Sep 3)
  INSERT INTO billing_records (id, student_id, billing_profile_id, period_start, period_end, billing_type, classes_count, rate, amount_due, amount_received, balance, status, due_date)
  VALUES (v_inv_siva_curr, v_student_siva, v_bill_siva, '2026-08-03', '2026-09-02', 'MONTHLY_FIXED', 16, 8500.00, 8500.00, 0.00, 8500.00, 'PENDING', '2026-09-03')
  ON CONFLICT (id) DO NOTHING;

  -- Mrithika July cycle (Paid)
  INSERT INTO billing_records (id, student_id, billing_profile_id, period_start, period_end, billing_type, classes_count, rate, amount_due, amount_received, balance, status, due_date)
  VALUES (v_inv_mrithika_prev, v_student_mrithika, v_bill_mrithika, '2026-07-01', '2026-07-31', 'MONTHLY_PER_CLASS', 8, 388.88, 3111.00, 3111.00, 0.00, 'PAID', '2026-08-03')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO payments (id, student_id, billing_record_id, amount, payment_date, payment_method, notes)
  VALUES ('60000000-0000-0000-0000-000000000002', v_student_mrithika, v_inv_mrithika_prev, 3111.00, '2026-08-03', 'CASH', 'Received monthly fee for July classes')
  ON CONFLICT (id) DO NOTHING;

END $$;
