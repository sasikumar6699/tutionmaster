import { NextResponse } from 'next/server';
import { serverDb } from '../../../lib/services/server-db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || '2026-08-01';
    const endDate = searchParams.get('endDate') || '2026-08-31';

    const sessions = await serverDb.getClassSessions(startDate, endDate);
    return NextResponse.json({ success: true, data: sessions });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    if (payload.action === 'START_TIMER') {
      await serverDb.startClassTimer(payload.sessionId);
      return NextResponse.json({ success: true, message: 'Timer started' });
    }

    if (payload.action === 'COMPLETE_CLASS') {
      const result = await serverDb.completeClass(payload.data);
      return NextResponse.json({ success: true, data: result });
    }

    if (payload.action === 'CANCEL_CLASS') {
      await serverDb.cancelSession(payload.sessionId, payload.reason);
      return NextResponse.json({ success: true, message: 'Class cancelled' });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to process class action' },
      { status: 500 }
    );
  }
}
