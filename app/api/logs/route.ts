import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import TimeLogModel from '@/models/TimeLog';

export async function GET() {
  await dbConnect();
  const logs = await TimeLogModel.find({}).lean();
  return NextResponse.json(logs);
}

export async function POST(request: Request) {
  await dbConnect();
  const body = await request.json();
  const log = await TimeLogModel.create(body);
  return NextResponse.json(log, { status: 201 });
}
