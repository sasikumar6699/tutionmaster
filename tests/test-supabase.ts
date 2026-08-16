import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import https from 'https';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('--- SUPABASE ENVIRONMENT CONFIGURATION VERIFICATION ---');
console.log('NEXT_PUBLIC_SUPABASE_URL present:', !!supabaseUrl);
console.log('Supabase Hostname:', supabaseUrl ? new URL(supabaseUrl).hostname : 'None');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY present:', !!supabaseAnonKey);
console.log('Key length:', supabaseAnonKey ? supabaseAnonKey.length : 0);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('FAIL: Missing Supabase environment variables');
  process.exit(1);
}

// 1. Direct HTTPS reachability test to diagnose network / DNS / SSL
async function testHttpReachability() {
  console.log('\n--- NETWORK REACHABILITY CHECK ---');
  return new Promise((resolve) => {
    const parsed = new URL(supabaseUrl!);
    const req = https.request(
      {
        hostname: parsed.hostname,
        port: 443,
        path: '/rest/v1/students?select=*',
        method: 'GET',
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
      },
      (res) => {
        console.log('HTTP Status Code:', res.statusCode, res.statusMessage);
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          console.log('Response Header / Status received.');
          resolve({ status: res.statusCode, body });
        });
      }
    );

    req.on('error', (e) => {
      console.error('HTTPS Network Error:', e.message, (e as any).code);
      resolve({ error: e });
    });

    req.setTimeout(8000, () => {
      console.error('HTTPS Request Timeout after 8s');
      req.destroy();
      resolve({ error: 'TIMEOUT' });
    });

    req.end();
  });
}

// 2. Supabase Client SDK Query Test
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
});

async function runVerification() {
  await testHttpReachability();

  console.log('\n--- 1. TESTING CONNECTION & STUDENTS QUERY ---');
  try {
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select(`
        id,
        name,
        class_level,
        parent_name,
        parent_phone,
        student_phone,
        email,
        meet_url,
        status
      `);

    if (studentsError) {
      console.error('FAIL - Error querying students table:', studentsError.message, studentsError.details || '', studentsError.hint || '');
      return;
    }

    console.log(`PASS - Retrieved ${students ? students.length : 0} students from Supabase.`);
    if (students && students.length > 0) {
      students.forEach((s) => {
        console.log(`- Student: ${s.name} | Class: ${s.class_level} | Meet URL: ${s.meet_url || 'None'}`);
      });

      const studentNames = students.map((s) => s.name);
      const hasSreesha = studentNames.some((n) => n.toLowerCase().includes('sreesha'));
      const hasSiva = studentNames.some((n) => n.toLowerCase().includes('siva'));
      const hasMrithika = studentNames.some((n) => n.toLowerCase().includes('mrithika'));

      console.log(`Seed Check -> Sreesha: ${hasSreesha ? 'FOUND' : 'MISSING'}, Siva: ${hasSiva ? 'FOUND' : 'MISSING'}, Mrithika: ${hasMrithika ? 'FOUND' : 'MISSING'}`);
    } else {
      console.log('NOTICE: students table is empty. Please run supabase/seed.sql in Supabase SQL editor.');
    }
  } catch (err: any) {
    console.error('Fetch exception querying students:', err.message, err.cause || '');
  }

  console.log('\n--- 2. TESTING SUBJECTS & STUDENT_SUBJECTS QUERY ---');
  try {
    const { data: subjectsData, error: subjectsError } = await supabase
      .from('student_subjects')
      .select(`
        student_id,
        subject_id,
        subjects (
          id,
          name,
          description
        )
      `);

    if (subjectsError) {
      console.error('FAIL - Error querying student_subjects:', subjectsError.message);
    } else {
      console.log(`PASS - Retrieved ${subjectsData ? subjectsData.length : 0} student subject mappings.`);
    }
  } catch (err: any) {
    console.error('Fetch exception querying subjects:', err.message);
  }

  console.log('\n--- 3. TESTING RECURRING SCHEDULES QUERY ---');
  try {
    const { data: schedules, error: schedulesError } = await supabase
      .from('recurring_schedules')
      .select(`
        id,
        student_id,
        day_of_week,
        start_time,
        end_time,
        meet_url,
        active
      `);

    if (schedulesError) {
      console.error('FAIL - Error querying recurring_schedules:', schedulesError.message);
    } else {
      console.log(`PASS - Retrieved ${schedules ? schedules.length : 0} recurring schedules.`);
      if (schedules) {
        schedules.forEach((sch) => {
          console.log(`- Schedule: Day ${sch.day_of_week} | ${sch.start_time} - ${sch.end_time} | Meet: ${sch.meet_url}`);
        });
      }
    }
  } catch (err: any) {
    console.error('Fetch exception querying schedules:', err.message);
  }

  console.log('\n--- 4. TESTING BILLING PROFILES QUERY ---');
  try {
    const { data: billingProfiles, error: billingError } = await supabase
      .from('billing_profiles')
      .select(`
        id,
        student_id,
        billing_type,
        fixed_amount,
        per_class_amount,
        batch_size,
        billing_day,
        billing_cycle_start_day,
        billing_cycle_end_day
      `);

    if (billingError) {
      console.error('FAIL - Error querying billing_profiles:', billingError.message);
    } else {
      console.log(`PASS - Retrieved ${billingProfiles ? billingProfiles.length : 0} billing profiles.`);
      if (billingProfiles) {
        billingProfiles.forEach((bp) => {
          console.log(`- Billing: ${bp.billing_type} | Fixed: ₹${bp.fixed_amount} | Per-Class: ₹${bp.per_class_amount} | Batch Size: ${bp.batch_size}`);
        });
      }
    }
  } catch (err: any) {
    console.error('Fetch exception querying billing profiles:', err.message);
  }
}

runVerification().catch((err) => {
  console.error('Unexpected execution error:', err);
});
