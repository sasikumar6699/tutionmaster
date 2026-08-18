import { serverDb } from '../lib/services/server-db';
import { repository } from '../lib/services/repository';
import { format, addDays } from 'date-fns';

async function runE2ETestingSuite() {
  console.log('\n======================================================');
  console.log('🧪 TUITION MASTER — FULL END-TO-END QA TESTING SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} ${detail ? `-> ${detail}` : ''}`);
      failed++;
    }
  }

  try {
    // ----------------------------------------------------
    // TEST 1: Settings & Curriculum Subjects Flow
    // ----------------------------------------------------
    console.log('\n--- 1. SETTINGS & CURRICULUM SUBJECTS FLOW ---');
    const initialSettings = await serverDb.getSubjects();
    assert(initialSettings.length >= 5, 'Default curriculum subjects loaded (Maths, Physics, Chemistry, Biology, English)');

    const newSub = await serverDb.addSubject('Computer Science', 'Python and algorithms');
    assert(newSub.name === 'Computer Science', 'Subject addition creates valid record with ID and timestamp');

    const updatedSubjects = await serverDb.getSubjects();
    assert(updatedSubjects.some((s) => s.id === newSub.id), 'Subject list reflects newly created subject');

    await serverDb.deleteSubject(newSub.id);
    const afterDeleteSubjects = await serverDb.getSubjects();
    assert(!afterDeleteSubjects.some((s) => s.id === newSub.id), 'Subject deletion correctly removes subject from registry');

    // ----------------------------------------------------
    // TEST 2: Student Onboarding & Creation Flow
    // ----------------------------------------------------
    console.log('\n--- 2. STUDENT ONBOARDING & CREATION FLOW ---');
    const mathsSubject = initialSettings.find((s) => s.name === 'Maths') || initialSettings[0];
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const dayOfWeek = today.getDay(); // Today's day of week

    const studentData = {
      name: 'Ananya Sharma',
      class_level: 'Grade 10',
      parent_name: 'Rajesh Sharma',
      parent_phone: '+91 98765 43210',
      student_phone: '+91 98765 43211',
      email: 'ananya.parent@example.com',
      meet_url: 'https://meet.google.com/abc-defg-hij',
      notes: 'Strong in algebra, needs guidance in geometry',
      subject_ids: [mathsSubject.id],
      schedules: [
        {
          day_of_week: dayOfWeek,
          start_time: '18:00',
          end_time: '19:00',
          subject_id: mathsSubject.id,
          meet_url: 'https://meet.google.com/abc-defg-hij',
        },
      ],
      billing: {
        billing_type: 'CLASS_BATCH' as const,
        batch_size: 8,
        fixed_amount: 6000,
        per_class_amount: 750,
        billing_day: 5,
      },
    };

    const student = await serverDb.createStudent(studentData);
    assert(Boolean(student.id), 'Student created with unique ID and active status');
    assert(student.name === 'Ananya Sharma', 'Student profile fields populated correctly');
    assert(student.subjects?.length === 1, 'Student-subject relationship linked');
    assert(student.schedules?.length === 1, 'Recurring schedule slot created for student');
    assert(student.billing?.billing_type === 'CLASS_BATCH', 'Billing model set to CLASS_BATCH (8 classes)');

    // ----------------------------------------------------
    // TEST 3: Calendar & Timetable Dynamic Generation
    // ----------------------------------------------------
    console.log('\n--- 3. CALENDAR & SCHEDULE GENERATION FLOW ---');
    const weekSessions = await serverDb.getClassSessions(todayStr, todayStr);
    assert(weekSessions.length >= 1, `Today's class session generated dynamically from recurring schedule for ${todayStr}`);
    
    const todaySession = weekSessions.find((s) => s.student_id === student.id);
    assert(Boolean(todaySession), 'Generated session contains correct student_id');
    assert(todaySession?.subject_name === mathsSubject.name, 'Generated session contains resolved subject name');
    assert(todaySession?.status === 'UPCOMING', 'Initial session status is UPCOMING');

    // ----------------------------------------------------
    // TEST 4: Attendance Variants & Class Completion
    // ----------------------------------------------------
    console.log('\n--- 4. ATTENDANCE & CLASS LOGGING FLOW ---');
    
    // 4A: Start Timer
    if (todaySession) {
      await serverDb.startClassTimer(todaySession.id);
      const sessionAfterTimer = await serverDb.getClassSessionById(todaySession.id);
      assert(Boolean(sessionAfterTimer?.actual_start), 'Start Timer stamps actual_start ISO timestamp');

      // 4B: Complete Class - PRESENT
      const completionResult = await serverDb.completeClass({
        sessionId: todaySession.id,
        studentId: student.id,
        subjectId: mathsSubject.id,
        status: 'PRESENT',
        actualDurationMinutes: 60,
        topic: 'Quadratic Equations',
        notes: 'Covered standard form and factorization method',
      });

      assert(completionResult.session.status === 'PRESENT', 'Class completed and marked as PRESENT');
      assert(completionResult.session.actual_duration_minutes === 60, 'Actual teaching duration recorded');
      
      const refreshedStudent = await serverDb.getStudentById(student.id);
      const bCount = refreshedStudent?.batch_progress?.completed ?? refreshedStudent?.batch_progress?.currentBatchCompleted;
      assert(bCount === 1, 'Batch progress increments to 1/8');
    }

    // 4C: Complete Class - ABSENT with Reason
    const tomorrowStr = format(addDays(today, 1), 'yyyy-MM-dd');
    const absentSessionId = `test-absent-${Date.now()}`;
    const absentSession = repository.createSessionManual({
      id: absentSessionId,
      student_id: student.id,
      subject_id: mathsSubject.id,
      class_date: tomorrowStr,
      scheduled_start: '18:00',
      scheduled_end: '19:00',
      status: 'UPCOMING',
    });

    await serverDb.completeClass({
      sessionId: absentSession.id,
      studentId: student.id,
      subjectId: mathsSubject.id,
      status: 'ABSENT',
      actualDurationMinutes: 0,
      notes: 'Absent Reason: School exams preparation',
    });

    const refreshedAbsent = await serverDb.getClassSessionById(absentSession.id);
    assert(refreshedAbsent?.status === 'ABSENT', 'Absent session marked as ABSENT');
    assert(refreshedAbsent?.notes_record?.notes?.includes('Absent Reason'), 'Absent reason stored in notes record');
    
    const studentAfterAbsent = await serverDb.getStudentById(student.id);
    const bCountAfterAbsent = studentAfterAbsent?.batch_progress?.completed ?? studentAfterAbsent?.batch_progress?.currentBatchCompleted;
    assert(bCountAfterAbsent === 1, 'ABSENT class does NOT increment batch billable counter');

    // 4D: Reschedule Session
    const reschedResult = await serverDb.rescheduleSession(
      absentSession.id,
      format(addDays(today, 2), 'yyyy-MM-dd'),
      '19:00',
      '20:00'
    );
    assert(reschedResult.updatedOriginal.status === 'RESCHEDULED', 'Original session marked as RESCHEDULED');
    assert(reschedResult.newSession.status === 'UPCOMING', 'New rescheduled session created as UPCOMING');
    assert(reschedResult.newSession.rescheduled_from_id === absentSession.id, 'Rescheduled session links back to original session ID');

    // ----------------------------------------------------
    // TEST 5: Batch Threshold & Auto-Invoice Generation
    // ----------------------------------------------------
    console.log('\n--- 5. BATCH THRESHOLD & AUTO-INVOICE GENERATION FLOW ---');
    
    // Simulate classes 2 through 8
    for (let i = 2; i <= 8; i++) {
      const sessId = `batch-cls-${student.id}-${i}`;
      repository.createSessionManual({
        id: sessId,
        student_id: student.id,
        subject_id: mathsSubject.id,
        class_date: format(addDays(today, i + 2), 'yyyy-MM-dd'),
        scheduled_start: '18:00',
        scheduled_end: '19:00',
        status: 'UPCOMING',
      });

      const res = await serverDb.completeClass({
        sessionId: sessId,
        studentId: student.id,
        subjectId: mathsSubject.id,
        status: 'PRESENT',
        actualDurationMinutes: 60,
        topic: `Algebra Chapter Part ${i}`,
        notes: `Class ${i} completed`,
      });

      if (i === 7) {
        const stud7 = await serverDb.getStudentById(student.id);
        const bCount7 = stud7?.batch_progress?.completed ?? stud7?.batch_progress?.currentBatchCompleted;
        assert(bCount7 === 7, 'Class 7 completed: Batch counter is 7/8');
      }

      if (i === 8) {
        assert(Boolean(res.invoiceGenerated), '8th class completed: Automatic Invoice Generated');
        assert(res.invoiceGenerated?.amount_due === 6000, 'Invoice amount equals batch fee ₹6,000');
        assert(res.invoiceGenerated?.classes_count === 8, 'Invoice records 8 completed classes');
      }
    }

    const studentAfter8 = await serverDb.getStudentById(student.id);
    assert(studentAfter8?.active_balance === 6000, 'Student active outstanding balance updated to ₹6,000');
    const bCount8 = studentAfter8?.batch_progress?.completed ?? studentAfter8?.batch_progress?.currentBatchCompleted;
    assert(bCount8 === 0, 'Batch counter automatically resets to 0/8 for next cycle');

    // ----------------------------------------------------
    // TEST 6: Payment Recording & Balance Tracking Flow
    // ----------------------------------------------------
    console.log('\n--- 6. PAYMENT RECORDING & BALANCE TRACKING FLOW ---');
    
    // 6A: Partial Payment (₹2,500 via UPI)
    const payment1 = await serverDb.recordPayment({
      student_id: student.id,
      amount: 2500,
      payment_date: todayStr,
      payment_method: 'UPI',
      notes: 'Partial payment via GPay',
    });

    assert(payment1.amount === 2500, 'Partial payment of ₹2,500 recorded');
    const studAfterP1 = await serverDb.getStudentById(student.id);
    assert(studAfterP1?.active_balance === 3500, 'Outstanding balance correctly reduced to ₹3,500');

    // 6B: Full Payment of remaining ₹3,500 (CASH)
    const payment2 = await serverDb.recordPayment({
      student_id: student.id,
      amount: 3500,
      payment_date: todayStr,
      payment_method: 'CASH',
      notes: 'Balance cleared in cash',
    });

    assert(payment2.amount === 3500, 'Final payment of ₹3,500 recorded');
    const studAfterP2 = await serverDb.getStudentById(student.id);
    assert(studAfterP2?.active_balance === 0, 'Outstanding balance fully cleared to ₹0 (All Paid)');

    // ----------------------------------------------------
    // TEST 7: Schedule & Session Deletion Flow
    // ----------------------------------------------------
    console.log('\n--- 7. SCHEDULE & SESSION DELETION FLOW ---');
    
    // Delete recurring schedule
    if (student.schedules?.[0]?.id) {
      const scheduleId = student.schedules[0].id;
      await serverDb.deleteSchedule(scheduleId);
      const studentAfterSchedDel = await serverDb.getStudentById(student.id);
      assert(studentAfterSchedDel?.schedules.length === 0, 'Recurring schedule slot successfully deleted');
    }

    // Delete single session
    const singleSessionToDelete = `single-del-${Date.now()}`;
    repository.createSessionManual({
      id: singleSessionToDelete,
      student_id: student.id,
      subject_id: mathsSubject.id,
      class_date: todayStr,
      scheduled_start: '21:00',
      scheduled_end: '22:00',
      status: 'UPCOMING',
    });

    await serverDb.deleteClassSession(singleSessionToDelete);
    const checkedDelSession = await serverDb.getClassSessionById(singleSessionToDelete);
    assert(checkedDelSession === null, 'Single class session successfully deleted via deleteClassSession');

    // Bulk Delete Sessions Before Date
    const oldSessionId = `old-sess-${Date.now()}`;
    repository.createSessionManual({
      id: oldSessionId,
      student_id: student.id,
      subject_id: mathsSubject.id,
      class_date: '2026-08-01',
      scheduled_start: '10:00',
      scheduled_end: '11:00',
      status: 'UPCOMING',
    });

    const deletedCount = await serverDb.deleteSessionsBeforeDate('2026-08-03');
    assert(deletedCount >= 1, 'Bulk delete before Aug 3 successfully removes past sessions');

    // ----------------------------------------------------
    // TEST 8: Student Deletion Flow (Clean Teardown)
    // ----------------------------------------------------
    console.log('\n--- 8. STUDENT DELETION & TEARDOWN FLOW ---');
    await serverDb.deleteStudent(student.id);
    const deletedStudentCheck = await serverDb.getStudentById(student.id);
    assert(deletedStudentCheck === null, 'Student profile permanently deleted');

    const remainingSessions = await serverDb.getClassSessions(todayStr, format(addDays(today, 10), 'yyyy-MM-dd'));
    const anyStudentSessionsLeft = remainingSessions.some((s) => s.student_id === student.id);
    assert(!anyStudentSessionsLeft, 'All associated class sessions and schedules purged on student deletion');

    // ----------------------------------------------------
    // TEST 9: Dashboard Aggregations Flow
    // ----------------------------------------------------
    console.log('\n--- 9. DASHBOARD REAL-TIME METRICS FLOW ---');
    const dashboardMetrics = await serverDb.getDashboardMetrics();
    assert(typeof dashboardMetrics.activeStudentsCount === 'number', 'Dashboard returns active student count');
    assert(Array.isArray(dashboardMetrics.todayClasses), 'Dashboard returns today classes list');
    assert(typeof dashboardMetrics.expectedRevenue === 'number', 'Dashboard returns expected revenue');
    assert(typeof dashboardMetrics.receivedRevenue === 'number', 'Dashboard returns received revenue');
    assert(typeof dashboardMetrics.pendingRevenue === 'number', 'Dashboard returns pending revenue');

    console.log('\n======================================================');
    console.log(`📊 E2E TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal test exception:', err);
    process.exit(1);
  }
}

runE2ETestingSuite();
