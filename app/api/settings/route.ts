import { NextResponse } from 'next/server';
import { serverDb } from '../../../lib/services/server-db';

export async function GET() {
  try {
    const profile = await serverDb.getOrCreateTutorProfile();
    const subjects = await serverDb.getSubjects();
    return NextResponse.json({ success: true, data: { profile, subjects } });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    if (payload.action === 'UPDATE_PROFILE') {
      const updated = await serverDb.updateTutorProfile(payload.profile);
      return NextResponse.json({ success: true, data: updated });
    }

    if (payload.action === 'ADD_SUBJECT') {
      const newSub = await serverDb.addSubject(payload.name, payload.description);
      return NextResponse.json({ success: true, data: newSub });
    }

    if (payload.action === 'DELETE_SUBJECT') {
      await serverDb.deleteSubject(payload.id);
      return NextResponse.json({ success: true, message: 'Subject deleted' });
    }

    if (payload.action === 'CLEAR_SAMPLE_DATA') {
      await serverDb.clearAllSampleData();
      return NextResponse.json({ success: true, message: 'All sample data cleared' });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update settings' },
      { status: 500 }
    );
  }
}
