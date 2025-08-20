import { NextResponse } from 'next/server';
import { listResponses } from '@/data/store';
import { pool } from '@/lib/db';

export async function GET() {
  // If a database is configured, prefer returning records from there as the
  // in-memory store is not durable in serverless environments.
  try {
    if (process.env.DATABASE_URL) {
      const result = await pool.query(
        'select id, created_at, name, email, company, answers, ratings, meta from survey_responses order by created_at desc limit 500'
      );
      type Row = {
        id: string;
        created_at: string;
        name: string;
        email: string;
        company?: string | null;
        answers?: Record<string, unknown>;
        ratings?: Record<string, number>;
        meta?: Record<string, unknown>;
      };
      const rows = (result.rows as Row[]).map((r) => ({
        id: r.id,
        createdAt: r.created_at,
        name: r.name,
        email: r.email,
        company: r.company || undefined,
        answers: r.answers || {},
        ratingGroup: r.ratings || {},
        aiGists: {},
        meta: r.meta || {},
      }));
      return NextResponse.json(rows);
    }
  } catch {
    // Fall back to in-memory if DB call fails
  }
  return NextResponse.json(listResponses());
}


