import { NextResponse } from 'next/server';
import { serverDb } from '../../../lib/services/server-db';

export async function GET() {
  try {
    const data = await serverDb.getDashboardMetrics();
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to load dashboard' },
      { status: 500 }
    );
  }
}
