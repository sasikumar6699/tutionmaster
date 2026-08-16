import { NextResponse } from 'next/server';
import { serverDb } from '../../../lib/services/server-db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = (searchParams.get('status') || 'ACTIVE') as 'ALL' | 'ACTIVE' | 'ARCHIVED';
    const students = await serverDb.getStudents(status);
    return NextResponse.json({ success: true, data: students });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch students' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const newStudent = await serverDb.createStudent(payload);
    return NextResponse.json({ success: true, data: newStudent });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create student' },
      { status: 500 }
    );
  }
}
