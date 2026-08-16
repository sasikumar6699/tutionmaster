import { NextResponse } from 'next/server';
import { serverDb } from '../../../../../lib/services/server-db';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { newDate, newStartTime, newEndTime } = await request.json();

    await serverDb.rescheduleSession(id, newDate, newStartTime, newEndTime);
    return NextResponse.json({ success: true, message: 'Class rescheduled' });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to reschedule class' },
      { status: 500 }
    );
  }
}
