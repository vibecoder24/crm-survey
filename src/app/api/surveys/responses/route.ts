import { NextResponse } from 'next/server';
import { listResponses } from '@/data/store';

export async function GET() {
  return NextResponse.json(listResponses());
}


