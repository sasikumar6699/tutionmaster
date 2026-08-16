import { NextResponse } from 'next/server';
import { serverDb } from '../../../lib/services/server-db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || '2026-08';
    const report = await serverDb.getMonthlyReport(month);
    return NextResponse.json({ success: true, data: report });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate report' },
      { status: 500 }
    );
  }
}
