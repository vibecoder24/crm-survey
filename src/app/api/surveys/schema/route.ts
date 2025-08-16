import { NextResponse } from 'next/server';
import { getSchema } from '@/data/store';

export async function GET() {
  return NextResponse.json(getSchema());
}


