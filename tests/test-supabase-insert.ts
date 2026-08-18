import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const idx = trimmed.indexOf('=');
        if (idx !== -1) {
          const key = trimmed.substring(0, idx).trim();
          const val = trimmed.substring(idx + 1).trim().replace(/^["'](.*)["']$/, '$1');
          process.env[key] = val;
        }
      }
    });
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

async function testSupabaseInsert() {
  console.log('Testing Supabase Insert & Retrieval...');
  
  // 1. Check profiles
  let { data: profiles, error: pErr } = await supabase.from('profiles').select('*');
  console.log('Profiles in Supabase:', profiles, 'Error:', pErr);

  let profileId = profiles?.[0]?.id;
  if (!profileId) {
    // Create profile
    const newProfId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    const { data: createdProf, error: cProfErr } = await supabase.from('profiles').insert({
      id: newProfId,
      user_id: userId,
      full_name: 'Tutor / Admin',
      email: 'tutor@tuitionmaster.app',
      timezone: 'Asia/Kolkata',
    }).select().single();
    console.log('Created profile:', createdProf, 'Error:', cProfErr);
    profileId = createdProf?.id || newProfId;
  }

  // 2. Check subjects
  let { data: subjects, error: sErr } = await supabase.from('subjects').select('*');
  console.log('Subjects in Supabase:', subjects?.length, 'Error:', sErr);
  if (!subjects || subjects.length === 0) {
    const subList = [
      { id: crypto.randomUUID(), tutor_id: profileId, name: 'Maths', description: 'Mathematics' },
      { id: crypto.randomUUID(), tutor_id: profileId, name: 'Physics', description: 'Physics' },
      { id: crypto.randomUUID(), tutor_id: profileId, name: 'Chemistry', description: 'Chemistry' },
      { id: crypto.randomUUID(), tutor_id: profileId, name: 'Biology', description: 'Biology' },
      { id: crypto.randomUUID(), tutor_id: profileId, name: 'English', description: 'English' },
    ];
    const { error: insSubErr } = await supabase.from('subjects').insert(subList);
    console.log('Inserted default subjects error:', insSubErr);
    const { data: subsAfter } = await supabase.from('subjects').select('*');
    subjects = subsAfter || [];
  }

  // 3. Test insert a test student with UUID
  const studentId = crypto.randomUUID();
  const { data: insStudent, error: studErr } = await supabase.from('students').insert({
    id: studentId,
    tutor_id: profileId,
    name: 'Test Persistent Student',
    class_level: 'Grade 10',
    parent_name: 'Parent Name',
    parent_phone: '9876543210',
    status: 'ACTIVE',
  }).select().single();
  console.log('Inserted Student:', insStudent, 'Error:', studErr);

  // 4. Test insert student_subject
  if (subjects.length > 0) {
    const { error: ssErr } = await supabase.from('student_subjects').insert({
      id: crypto.randomUUID(),
      student_id: studentId,
      subject_id: subjects[0].id,
    });
    console.log('Inserted Student Subject Error:', ssErr);
  }

  // 5. Query student back
  const { data: fetchedStud, error: fErr } = await supabase
    .from('students')
    .select(`
      *,
      student_subjects (
        subject_id,
        subjects (*)
      )
    `)
    .eq('id', studentId)
    .single();

  console.log('Fetched Student from Supabase:', fetchedStud, 'Error:', fErr);

  // Clean up test student
  await supabase.from('students').delete().eq('id', studentId);
  console.log('Cleaned up test student.');
}

testSupabaseInsert().catch(console.error);
