import { NextResponse } from 'next/server';
import { serverDb } from '../../../../lib/services/server-db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const student = await serverDb.getStudentById(id);
    if (!student) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: student });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch student' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const payload = await request.json();

    if (payload.studentUpdates) {
      await serverDb.updateStudent(id, payload.studentUpdates);
    }
    if (payload.billingUpdates) {
      await serverDb.updateBillingProfile(id, payload.billingUpdates);
    }
    if (payload.toggleArchive) {
      await serverDb.archiveStudent(id);
    }

    const updated = await serverDb.getStudentById(id);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update student' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await serverDb.deleteStudent(id);
    return NextResponse.json({ success: true, message: 'Student deleted successfully' });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete student' },
      { status: 500 }
    );
  }
}
