import { NextResponse } from 'next/server';
import { serverDb } from '../../../lib/services/server-db';

export async function GET() {
  try {
    const invoices = await serverDb.getInvoices();
    return NextResponse.json({ success: true, data: invoices });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const payment = await serverDb.recordPayment(payload);
    return NextResponse.json({ success: true, data: payment });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to record payment' },
      { status: 500 }
    );
  }
}
