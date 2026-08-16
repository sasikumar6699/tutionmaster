import { createServerClient } from '../supabase/server';
import {
  Profile,
  Subject,
  Student,
  EnrichedStudent,
  EnrichedClassSession,
  EnrichedBillingRecord,
  Payment,
  RecurringSchedule,
  MonthlyReportSummary,
  ClassSessionStatus,
  PaymentMethod,
  BillingType,
} from '../types/database.types';
import { calculateBatchProgress } from '../billing/engine';
import { generateSessionsForRange } from '../scheduling/generator';
import { parseISO } from 'date-fns';

export class ServerDatabaseService {
  private getClient() {
    return createServerClient();
  }

  // 1. Tutor Profile Management
  async getOrCreateTutorProfile(): Promise<Profile> {
    const supabase = this.getClient();
    
    // Look for existing profile
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    if (profiles && profiles.length > 0) {
      return profiles[0] as Profile;
    }

    // Default seed tutor profile if not found
    const defaultProfile: Profile = {
      id: '00000000-0000-0000-0000-000000000001',
      user_id: '00000000-0000-0000-0000-000000000001',
      full_name: 'Aditya Sharma',
      email: 'tutor@tutorpulse.io',
      phone: '+91 98765 43210',
      timezone: 'Asia/Kolkata',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return defaultProfile;
  }

  async updateTutorProfile(data: Partial<Profile>): Promise<Profile> {
    const supabase = this.getClient();
    const current = await this.getOrCreateTutorProfile();

    const { data: updated, error } = await supabase
      .from('profiles')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', current.id)
      .select()
      .single();

    if (error) {
      return { ...current, ...data };
    }
    return updated as Profile;
  }

  // 2. Subjects Management
  async getSubjects(): Promise<Subject[]> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('name', { ascending: true });

    if (error || !data) {
      return [];
    }
    return data as Subject[];
  }

  async addSubject(name: string, description?: string): Promise<Subject> {
    const supabase = this.getClient();
    const profile = await this.getOrCreateTutorProfile();

    const { data, error } = await supabase
      .from('subjects')
      .insert({
        tutor_id: profile.id,
        name,
        description: description || null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add subject: ${error.message}`);
    }
    return data as Subject;
  }

  async deleteSubject(id: string): Promise<boolean> {
    const supabase = this.getClient();
    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (error) throw new Error(`Failed to delete subject: ${error.message}`);
    return true;
  }

  // 3. Students Management
  async getStudents(statusFilter: 'ALL' | 'ACTIVE' | 'ARCHIVED' = 'ACTIVE'): Promise<EnrichedStudent[]> {
    const supabase = this.getClient();

    let query = supabase
      .from('students')
      .select(`
        *,
        student_subjects (
          subject_id,
          subjects (*)
        ),
        recurring_schedules (*),
        billing_profiles (*),
        class_sessions (*),
        billing_records (*),
        payments (*)
      `);

    if (statusFilter !== 'ALL') {
      query = query.eq('status', statusFilter);
    }

    const { data: rawStudents, error } = await query;

    if (error || !rawStudents) {
      return [];
    }

    return rawStudents.map((st: any) => {
      const subjects: Subject[] = (st.student_subjects || [])
        .map((ss: any) => ss.subjects)
        .filter(Boolean);

      const schedules: RecurringSchedule[] = st.recurring_schedules || [];
      const billing = st.billing_profiles?.[0] || st.billing_profiles;
      const classSessions = st.class_sessions || [];
      const billingRecords = st.billing_records || [];
      const payments = st.payments || [];

      // Calculate batch progress
      const batchProgress = calculateBatchProgress(billing, classSessions, billingRecords);

      // Calculate balance
      const totalInvoiced = billingRecords.reduce((sum: number, b: any) => sum + (b.amount_due || 0), 0);
      const totalPaid = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      const activeBalance = Math.max(0, totalInvoiced - totalPaid);

      return {
        ...st,
        subjects,
        schedules,
        billing,
        active_balance: activeBalance,
        batch_progress: batchProgress,
      };
    });
  }

  async getStudentById(id: string): Promise<EnrichedStudent | null> {
    const supabase = this.getClient();

    const { data: st, error } = await supabase
      .from('students')
      .select(`
        *,
        student_subjects (
          subject_id,
          subjects (*)
        ),
        recurring_schedules (*),
        billing_profiles (*),
        class_sessions (
          *,
          subjects (*),
          class_notes (*)
        ),
        billing_records (*),
        payments (*)
      `)
      .eq('id', id)
      .single();

    if (error || !st) {
      return null;
    }

    const subjects: Subject[] = (st.student_subjects || [])
      .map((ss: any) => ss.subjects)
      .filter(Boolean);

    const schedules: RecurringSchedule[] = st.recurring_schedules || [];
    const billing = st.billing_profiles?.[0] || st.billing_profiles;
    const classSessions = st.class_sessions || [];
    const billingRecords = st.billing_records || [];
    const payments = st.payments || [];

    const batchProgress = calculateBatchProgress(billing, classSessions, billingRecords);

    const totalInvoiced = billingRecords.reduce((sum: number, b: any) => sum + (b.amount_due || 0), 0);
    const totalPaid = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
    const activeBalance = Math.max(0, totalInvoiced - totalPaid);

    return {
      ...st,
      subjects,
      schedules,
      billing,
      active_balance: activeBalance,
      batch_progress: batchProgress,
    };
  }

  async createStudent(payload: {
    name: string;
    class_level: string;
    parent_name?: string;
    parent_phone?: string;
    student_phone?: string;
    email?: string;
    notes?: string;
    meet_url?: string;
    subject_ids: string[];
    schedules: {
      subject_id: string;
      day_of_week: number;
      start_time: string;
      end_time: string;
      meet_url?: string;
    }[];
    billing: {
      billing_type: BillingType;
      fixed_amount?: number;
      per_class_amount?: number;
      batch_size?: number;
      billing_day?: number;
      billing_cycle_start_day?: number;
      billing_cycle_end_day?: number;
    };
  }): Promise<Student> {
    const supabase = this.getClient();
    const profile = await this.getOrCreateTutorProfile();

    // 1. Insert Student
    const { data: newStudent, error: studentError } = await supabase
      .from('students')
      .insert({
        tutor_id: profile.id,
        name: payload.name,
        class_level: payload.class_level,
        parent_name: payload.parent_name || null,
        parent_phone: payload.parent_phone || null,
        student_phone: payload.student_phone || null,
        email: payload.email || null,
        notes: payload.notes || null,
        meet_url: payload.meet_url || null,
        status: 'ACTIVE',
      })
      .select()
      .single();

    if (studentError || !newStudent) {
      throw new Error(`Failed to create student: ${studentError?.message}`);
    }

    const studentId = newStudent.id;

    // 2. Link Subjects
    if (payload.subject_ids.length > 0) {
      const links = payload.subject_ids.map((subId) => ({
        student_id: studentId,
        subject_id: subId,
      }));
      await supabase.from('student_subjects').insert(links);
    }

    // 3. Insert Recurring Schedules
    if (payload.schedules.length > 0) {
      const scheduleRows = payload.schedules.map((sch) => ({
        student_id: studentId,
        subject_id: sch.subject_id,
        day_of_week: sch.day_of_week,
        start_time: sch.start_time,
        end_time: sch.end_time,
        meet_url: sch.meet_url || payload.meet_url || null,
        active: true,
      }));
      await supabase.from('recurring_schedules').insert(scheduleRows);
    }

    // 4. Insert Billing Profile
    await supabase.from('billing_profiles').insert({
      student_id: studentId,
      billing_type: payload.billing.billing_type,
      fixed_amount: payload.billing.fixed_amount || 0,
      per_class_amount: payload.billing.per_class_amount || 0,
      batch_size: payload.billing.batch_size || 8,
      billing_day: payload.billing.billing_day || 3,
      billing_cycle_start_day: payload.billing.billing_cycle_start_day || 3,
      billing_cycle_end_day: payload.billing.billing_cycle_end_day || 2,
    });

    return newStudent as Student;
  }

  async updateStudent(id: string, updates: Partial<Student>): Promise<Student> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from('students')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update student: ${error.message}`);
    return data as Student;
  }

  async updateBillingProfile(studentId: string, updates: any): Promise<void> {
    const supabase = this.getClient();
    await supabase
      .from('billing_profiles')
      .update(updates)
      .eq('student_id', studentId);
  }

  async archiveStudent(id: string): Promise<void> {
    const student = await this.getStudentById(id);
    if (!student) return;
    const newStatus = student.status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED';
    await this.updateStudent(id, { status: newStatus as any });
  }

  // 4. Class Sessions & Live Calendar
  async getClassSessions(startDateStr: string, endDateStr: string): Promise<EnrichedClassSession[]> {
    const supabase = this.getClient();

    // Fetch existing stored sessions
    const { data: storedSessions } = await supabase
      .from('class_sessions')
      .select(`
        *,
        students (*),
        subjects (*),
        class_notes (*)
      `)
      .gte('class_date', startDateStr)
      .lte('class_date', endDateStr)
      .order('class_date', { ascending: true })
      .order('scheduled_start', { ascending: true });

    const existingSessions: EnrichedClassSession[] = (storedSessions || []).map((s: any) => ({
      ...s,
      student_name: s.students?.name || '',
      student_class: s.students?.class_level || '',
      subject_name: s.subjects?.name || '',
      student: s.students,
      subject: s.subjects,
      notes_record: s.class_notes?.[0] || s.class_notes,
    }));

    // Fetch all active schedules and students to generate recurring upcoming sessions dynamically
    const { data: schedules } = await supabase.from('recurring_schedules').select('*').eq('active', true);
    const { data: students } = await supabase.from('students').select('*').eq('status', 'ACTIVE');
    const { data: subjects } = await supabase.from('subjects').select('*');

    if (!schedules || !students || !subjects) {
      return existingSessions;
    }

    const generated = generateSessionsForRange(
      schedules as RecurringSchedule[],
      students as Student[],
      subjects as Subject[],
      existingSessions,
      parseISO(startDateStr),
      parseISO(endDateStr)
    );

    // Merge stored and generated (stored takes precedence)
    const storedIds = new Set(existingSessions.map((s) => s.id));
    const finalSessions: EnrichedClassSession[] = [...existingSessions];

    for (const gen of generated) {
      if (!storedIds.has(gen.id)) {
        const student = students.find((st) => st.id === gen.student_id);
        const subject = subjects.find((sub) => sub.id === gen.subject_id);
        finalSessions.push({
          ...gen,
          student_name: student?.name || '',
          student_class: student?.class_level || '',
          subject_name: subject?.name || '',
          student: student as Student,
          subject: subject as Subject,
        });
      }
    }

    return finalSessions.sort((a, b) => {
      const dateCmp = a.class_date.localeCompare(b.class_date);
      if (dateCmp !== 0) return dateCmp;
      return a.scheduled_start.localeCompare(b.scheduled_start);
    });
  }

  async startClassTimer(sessionId: string): Promise<void> {
    const supabase = this.getClient();
    const now = new Date().toISOString();

    // Check if session exists in DB
    const { data: existing } = await supabase
      .from('class_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (existing) {
      await supabase
        .from('class_sessions')
        .update({
          actual_start: now,
          status: 'UPCOMING',
          updated_at: now,
        })
        .eq('id', sessionId);
    }
  }

  async completeClass(data: {
    sessionId: string;
    studentId: string;
    subjectId: string;
    status: ClassSessionStatus;
    actualDurationMinutes: number;
    topic?: string;
    subtopic?: string;
    homework?: string;
    notes?: string;
  }): Promise<{ session: EnrichedClassSession; invoiceGenerated: any | null }> {
    const supabase = this.getClient();
    const now = new Date().toISOString();

    // 1. Update or Insert Class Session
    const { data: updatedSession } = await supabase
      .from('class_sessions')
      .upsert({
        id: data.sessionId,
        student_id: data.studentId,
        subject_id: data.subjectId,
        status: data.status,
        actual_duration_minutes: data.actualDurationMinutes,
        actual_end: now,
        updated_at: now,
      })
      .select(`*, students(*), subjects(*)`)
      .single();

    // 2. Insert / Upsert Class Notes
    if (data.topic || data.subtopic || data.homework || data.notes) {
      await supabase.from('class_notes').upsert({
        class_session_id: data.sessionId,
        student_id: data.studentId,
        subject_id: data.subjectId,
        topic: data.topic || null,
        subtopic: data.subtopic || null,
        homework: data.homework || null,
        notes: data.notes || null,
      });
    }

    // 3. Check for Batch Billing Trigger (e.g. Sreesha 8th class)
    const student = await this.getStudentById(data.studentId);
    let invoiceGenerated = null;

    if (student && student.billing?.billing_type === 'CLASS_BATCH') {
      const bp = student.batch_progress;
      if (bp && bp.isReadyForInvoice) {
        const { data: newInvoice } = await supabase
          .from('billing_records')
          .insert({
            student_id: student.id,
            billing_type: 'CLASS_BATCH',
            amount_due: bp.batchAmount,
            amount_paid: 0,
            status: 'PENDING',
            classes_count: bp.targetBatchSize,
            period_start: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
            period_end: new Date().toISOString().slice(0, 10),
            due_date: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
          })
          .select()
          .single();

        invoiceGenerated = newInvoice;
      }
    }

    const enrichedSession: EnrichedClassSession = {
      ...(updatedSession || data),
      student_name: student?.name || '',
      student_class: student?.class_level || '',
      subject_name: student?.subjects?.find((s) => s.id === data.subjectId)?.name || '',
      student: student as Student,
      subject: student?.subjects?.find((s) => s.id === data.subjectId),
      notes_record: {
        id: 'note-new',
        class_session_id: data.sessionId,
        student_id: data.studentId,
        subject_id: data.subjectId,
        topic: data.topic || '',
        subtopic: data.subtopic || '',
        homework: data.homework || '',
        notes: data.notes || '',
        created_at: now,
        updated_at: now,
      },
    };

    return { session: enrichedSession, invoiceGenerated };
  }

  async rescheduleSession(
    sessionId: string,
    newDate: string,
    newStartTime: string,
    newEndTime: string
  ): Promise<void> {
    const supabase = this.getClient();

    // Mark original session as RESCHEDULED
    await supabase
      .from('class_sessions')
      .update({
        status: 'RESCHEDULED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    // Fetch original session details
    const { data: orig } = await supabase
      .from('class_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (orig) {
      // Insert new UPCOMING session
      await supabase.from('class_sessions').insert({
        student_id: orig.student_id,
        subject_id: orig.subject_id,
        schedule_id: orig.schedule_id,
        class_date: newDate,
        scheduled_start: newStartTime,
        scheduled_end: newEndTime,
        status: 'UPCOMING',
        rescheduled_from_id: orig.id,
        meet_url: orig.meet_url,
      });
    }
  }

  async cancelSession(sessionId: string, reason?: string): Promise<void> {
    const supabase = this.getClient();
    await supabase
      .from('class_sessions')
      .update({
        status: 'CANCELLED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (reason) {
      await supabase.from('class_notes').upsert({
        class_session_id: sessionId,
        notes: `Cancellation reason: ${reason}`,
      });
    }
  }

  // 5. Invoicing & Payments
  async getInvoices(): Promise<EnrichedBillingRecord[]> {
    const supabase = this.getClient();

    const { data: records, error } = await supabase
      .from('billing_records')
      .select(`
        *,
        students (*)
      `)
      .order('due_date', { ascending: false });

    if (error || !records) return [];

    return records.map((rec: any) => ({
      ...rec,
      student_name: rec.students?.name || '',
      student_class: rec.students?.class_level || '',
      amount_received: rec.amount_received || rec.amount_paid || 0,
      balance: rec.balance ?? Math.max(0, rec.amount_due - (rec.amount_received || rec.amount_paid || 0)),
      student: rec.students,
    }));
  }

  async recordPayment(payload: {
    student_id: string;
    billing_record_id?: string;
    amount: number;
    payment_date: string;
    payment_method: PaymentMethod;
    notes?: string;
  }): Promise<Payment> {
    const supabase = this.getClient();

    // 1. Insert Payment
    const { data: newPayment, error: payError } = await supabase
      .from('payments')
      .insert({
        student_id: payload.student_id,
        billing_record_id: payload.billing_record_id || null,
        amount: payload.amount,
        payment_date: payload.payment_date,
        payment_method: payload.payment_method,
        notes: payload.notes || null,
      })
      .select()
      .single();

    if (payError || !newPayment) {
      throw new Error(`Failed to record payment: ${payError?.message}`);
    }

    // 2. Reconcile Target Invoice
    if (payload.billing_record_id) {
      const { data: invoice } = await supabase
        .from('billing_records')
        .select('*')
        .eq('id', payload.billing_record_id)
        .single();

      if (invoice) {
        const newAmountPaid = (invoice.amount_paid || 0) + payload.amount;
        const newStatus =
          newAmountPaid >= invoice.amount_due
            ? 'PAID'
            : newAmountPaid > 0
            ? 'PARTIALLY_PAID'
            : 'PENDING';

        await supabase
          .from('billing_records')
          .update({
            amount_paid: newAmountPaid,
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', payload.billing_record_id);
      }
    }

    return newPayment as Payment;
  }

  // 6. Reports & Dashboard Aggregations
  async getDashboardMetrics(): Promise<{
    activeStudentsCount: number;
    todayClasses: EnrichedClassSession[];
    upcomingClasses: EnrichedClassSession[];
    completedThisMonth: number;
    expectedRevenue: number;
    receivedRevenue: number;
    pendingRevenue: number;
    alerts: { message: string; severity: 'info' | 'warning' | 'danger' | 'success'; studentId?: string }[];
  }> {
    const todayStr = '2026-08-14'; // August anchor
    const tomorrowStr = '2026-08-15';
    const monthStartStr = '2026-08-01';
    const monthEndStr = '2026-08-31';

    const students = await this.getStudents('ACTIVE');
    const todaySessions = await this.getClassSessions(todayStr, todayStr);
    const upcomingSessions = await this.getClassSessions(tomorrowStr, '2026-08-21');
    const monthSessions = await this.getClassSessions(monthStartStr, monthEndStr);
    const invoices = await this.getInvoices();

    const completedThisMonth = monthSessions.filter((s) => s.status === 'PRESENT').length;

    const currentMonthInvoices = invoices.filter(
      (inv) => inv.period_start?.startsWith('2026-08') || inv.due_date?.startsWith('2026-08')
    );

    const expectedRevenue = currentMonthInvoices.reduce((sum, inv) => sum + inv.amount_due, 0);
    const receivedRevenue = currentMonthInvoices.reduce((sum, inv) => sum + (inv.amount_received || 0), 0);
    const pendingRevenue = Math.max(0, expectedRevenue - receivedRevenue);

    // Alerts
    const alerts: { message: string; severity: 'info' | 'warning' | 'danger' | 'success'; studentId?: string }[] = [];

    students.forEach((st) => {
      if (st.batch_progress?.alertMessage) {
        alerts.push({
          message: st.batch_progress.alertMessage,
          severity: st.batch_progress.isReadyForInvoice ? 'danger' : 'warning',
          studentId: st.id,
        });
      }
      if (st.active_balance > 0) {
        alerts.push({
          message: `${st.name}: ₹${st.active_balance.toLocaleString('en-IN')} outstanding payment due.`,
          severity: 'info',
          studentId: st.id,
        });
      }
    });

    return {
      activeStudentsCount: students.length,
      todayClasses: todaySessions,
      upcomingClasses: upcomingSessions.slice(0, 5),
      completedThisMonth,
      expectedRevenue,
      receivedRevenue,
      pendingRevenue,
      alerts,
    };
  }

  async getMonthlyReport(monthKey = '2026-08'): Promise<MonthlyReportSummary> {
    const monthStartStr = `${monthKey}-01`;
    const monthEndStr = `${monthKey}-31`;

    const sessions = await this.getClassSessions(monthStartStr, monthEndStr);
    const invoices = await this.getInvoices();
    const students = await this.getStudents('ALL');

    const totalClasses = sessions.length;
    const completedClasses = sessions.filter((s) => s.status === 'PRESENT').length;
    const absentClasses = sessions.filter((s) => s.status === 'ABSENT').length;
    const cancelledClasses = sessions.filter((s) => s.status === 'CANCELLED').length;
    const rescheduledClasses = sessions.filter((s) => s.status === 'RESCHEDULED').length;

    const monthInvoices = invoices.filter(
      (inv) => inv.period_start?.startsWith(monthKey) || inv.due_date?.startsWith(monthKey)
    );

    const totalExpected = monthInvoices.reduce((sum, inv) => sum + inv.amount_due, 0);
    const totalReceived = monthInvoices.reduce((sum, inv) => sum + (inv.amount_received || 0), 0);
    const totalPending = Math.max(0, totalExpected - totalReceived);
    const totalMinutes = completedClasses * 60;
    const totalHours = `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
    const attendanceRate = totalClasses > 0 ? Math.round((completedClasses / totalClasses) * 100) : 100;

    const studentBreakdown = students.map((st) => {
      const stSessions = sessions.filter((s) => s.student_id === st.id);
      const stPresent = stSessions.filter((s) => s.status === 'PRESENT').length;
      const stAbsent = stSessions.filter((s) => s.status === 'ABSENT').length;
      const stInvoices = monthInvoices.filter((inv) => inv.student_id === st.id);
      const expected = stInvoices.reduce((sum, inv) => sum + inv.amount_due, 0);
      const received = stInvoices.reduce((sum, inv) => sum + (inv.amount_received || 0), 0);
      const stMinutes = stPresent * 60;

      return {
        student_id: st.id,
        student_name: st.name,
        class_level: st.class_level,
        subjects: st.subjects?.map((s) => s.name) || [],
        classes_held: stSessions.length,
        attended: stPresent,
        absent: stAbsent,
        teaching_hours: `${Math.floor(stMinutes / 60)}h ${stMinutes % 60}m`,
        billing_type: st.billing?.billing_type || 'PER_CLASS',
        amount_due: expected,
        amount_paid: received,
        balance: Math.max(0, expected - received),
      };
    });

    return {
      month: monthKey,
      month_label: 'August 2026',
      total_students: students.length,
      total_classes: totalClasses,
      completed_classes: completedClasses,
      absent_classes: absentClasses,
      cancelled_classes: cancelledClasses,
      rescheduled_classes: rescheduledClasses,
      total_teaching_minutes: totalMinutes,
      total_teaching_hours: totalHours,
      attendance_rate: attendanceRate,
      expected_fees: totalExpected,
      received_fees: totalReceived,
      pending_fees: totalPending,
      student_breakdown: studentBreakdown,
    };
  }
}

export const serverDb = new ServerDatabaseService();
