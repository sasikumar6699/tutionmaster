import { NextResponse } from 'next/server';
import { serverDb } from '../../../../lib/services/server-db';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await serverDb.deleteSchedule(id);
    return NextResponse.json({ success: true, message: 'Recurring schedule slot deleted' });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete schedule slot' },
      { status: 500 }
    );
  }
}
