import { NextResponse } from 'next/server';
import { repository } from '../../../lib/services/repository';

export async function POST() {
  try {
    const report = repository.getMonthlyReport('2026-08');
    const insights = repository.getDashboardInsights();

    return NextResponse.json({
      success: true,
      message: 'Billing evaluation executed',
      data: {
        report,
        insights,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
